import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { WCDMAIdle } from './entities/wcdmaIdle.entity';
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';

const correctPattern = {
    'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\nOK\r\n/,
    'getWCDMANetworkParameters': /.*\+QENG: "servingcell","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+)/,
}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class WCDMAIdleService {
    private readonly logger = new Logger(WCDMAIdleService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private lockStatus: { [key: string]: techType } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}
    private initializingEnd: boolean = false

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        @InjectRepository(WCDMAIdle) private wcdmaIdlesRepo: Repository<WCDMAIdle>,
        @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
    ) { }

    async portsInitializing(dmPort: number, inspection: Inspection) {
        const msData = await this.msDataRepo.findOne({ where: { dmPortNumber: dmPort } })

        this.moduleIMEI[`ttyUSB${dmPort}`] = msData.IMEI
        this.simIMSI[`ttyUSB${dmPort}`] = msData.IMSI

        this.dmPortIntervalId[`ttyUSB${dmPort}`] = setInterval(
            async () => {
                const cond = this.checkPortTrueInit(dmPort)

                if (cond) {
                    clearInterval(this.dmPortIntervalId[`ttyUSB${dmPort}`])
                    this.logger.debug(`port ${dmPort} initialized successfully then go to itration stage.`)
                    this.msItrationDuty(dmPort)

                    this.initializingEnd = true
                }
                else {
                    this.logger.log(`try to initialize port ${dmPort}`)
                    this.getMSData(dmPort, inspection)
                }
            },
            2000)

        await sleep(5000)

        await this.waitForEndOfInitializing()

    }

    async getMSData(dmPort: number, inspection: Inspection) {
        if (this.initializedPorts[`ttyUSB${dmPort}`]) {
            if (!this.initializedPorts[`ttyUSB${dmPort}`].isOpen) {
                this.initializedPorts[`ttyUSB${dmPort}`].open()
                this.logger.warn(`port ${dmPort} reOpened.`)
            }
            else {
                const port = this.initializedPorts[`ttyUSB${dmPort}`]
                if (!this.lockStatus[`ttyUSB${dmPort}`]) {
                    port.write(commands.lockWCDMA)
                }

                this.logger.log(`port ${dmPort} have been initialized.`)
            }
        }
        else {
            const port = new SerialPort({ path: `/dev/ttyUSB${dmPort}`, baudRate: 115200 });

            port.on('open', async () => {
                this.logger.log(`port ${dmPort} opened.`)
            })

            port.on('data', async (data) => {
                const response = data.toString()

                // this.logger.log(`port ${dmPort} : ${JSON.stringify(response)}`)

                const lockWCDMAMatch = response.match(correctPattern.lockWCDMA)

                if (lockWCDMAMatch) {
                    this.lockStatus[`ttyUSB${dmPort}`] = techType.wcdma
                    const insert = await this.msDataRepo.update(
                        { IMEI: this.moduleIMEI[`ttyUSB${dmPort}`] },
                        { lockStatus: this.lockStatus[`ttyUSB${dmPort}`] }
                    )
                    this.logger.warn(`ms data lock status updated. ${JSON.stringify(insert.raw)}`)
                }

                const getWCDMANetworkParametersMatch = response.match(correctPattern.getWCDMANetworkParameters)

                if (getWCDMANetworkParametersMatch) {
                    const wcdmaData = {
                        'tech': getWCDMANetworkParametersMatch[2].trim(),
                        'mcc': getWCDMANetworkParametersMatch[3].trim(),
                        'mnc': getWCDMANetworkParametersMatch[4].trim(),
                        'lac': getWCDMANetworkParametersMatch[5].trim(),
                        'cellid': getWCDMANetworkParametersMatch[6].trim(),
                        'uarfcn': getWCDMANetworkParametersMatch[7].trim(),
                        'psc': getWCDMANetworkParametersMatch[8].trim(),
                        'rac': getWCDMANetworkParametersMatch[9].trim(),
                        'rscp': getWCDMANetworkParametersMatch[10].trim(),
                        'ecio': getWCDMANetworkParametersMatch[11].trim(),
                        'phych': getWCDMANetworkParametersMatch[12].trim(),
                        'sf': getWCDMANetworkParametersMatch[13].trim(),
                        'slot': getWCDMANetworkParametersMatch[14].trim(),
                        'speech_code': getWCDMANetworkParametersMatch[15].trim(),
                        'comMod': getWCDMANetworkParametersMatch[16].trim(),
                    }


                    const location = await this.gpsDataRepo
                        .createQueryBuilder('gps_data')
                        .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                        .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                        .setParameter('desiredCreatedAt', new Date())
                        .getOne();

                    const newEntry = this.wcdmaIdlesRepo.create({
                        tech: wcdmaData.tech,
                        mcc: wcdmaData.mcc,
                        mnc: wcdmaData.mnc,
                        lac: wcdmaData.lac,
                        cellid: wcdmaData.cellid,
                        uarfcn: wcdmaData.uarfcn,
                        psc: wcdmaData.psc,
                        rac: wcdmaData.rac,
                        rscp: wcdmaData.rscp,
                        ecio: wcdmaData.ecio,
                        phych: wcdmaData.phych,
                        sf: wcdmaData.sf,
                        slot: wcdmaData.slot,
                        speech_code: wcdmaData.speech_code,
                        comMod: wcdmaData.comMod,
                        inspection: inspection,
                        location: location
                    })
                    const save = await this.wcdmaIdlesRepo.save(newEntry)
                }

            })

            port.on('error', (err) => {
                this.logger.error(`Error on port ${dmPort}: ${err.message}`);
            });

            this.initializedPorts[`ttyUSB${dmPort}`] = port
        }
    }

    async msItrationDuty(dmPort: number, interval: number = 1000) {
        const port = this.initializedPorts[`ttyUSB${dmPort}`]

        setInterval(() => {
            port.write(commands.getWCDMANetworkParameters)
        }, interval)
    }

    checkPortTrueInit(dmPort: number) {
        return (
            !!this.lockStatus[`ttyUSB${dmPort}`] &&
            !!this.dmPortIntervalId[`ttyUSB${dmPort}`]
        )
    }

    waitForEndOfInitializing = (timeout = 1000) => {
        return new Promise((resolve) => {
            const checkCondition = () => {
                const cond = this.initializingEnd

                if (cond) {
                    resolve(1);
                } else {
                    setTimeout(checkCondition, timeout); // Adjust the interval as needed
                }
            };

            checkCondition();
        });
    }
}