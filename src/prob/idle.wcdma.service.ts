import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { WCDMAIdleMCI } from './entities/wcdmaIdleMCI.entity';
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';
import { ProbGateway } from "./prob.gateway";
import { WCDMAIdleMTN } from "./entities/wcdmaIdleMTN.entity";

const correctPattern = {
    'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\nOK\r\n/,
    'getWCDMANetworkParameters': /.*\+QENG: "servingcell","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+)/,
    'noCoveragePrameters': /.*\+QENG: "servingcell","SEARCH".*/,
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
        @InjectRepository(WCDMAIdleMCI) private wcdmaIdlesRepo: Repository<WCDMAIdleMCI> | Repository<WCDMAIdleMTN>,
        @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
        private readonly probSocketGateway: ProbGateway,
        private op: "MCI" | "MTN"
    ) { }

    async portsInitializing(dmPort: number, inspection: Inspection) {
        const msData = await this.msDataRepo.findOne({ where: { dmPortNumber: dmPort, inspection: { id: inspection.id } } })

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
                        { IMEI: this.moduleIMEI[`ttyUSB${dmPort}`], inspection: { id: inspection.id } },
                        { lockStatus: this.lockStatus[`ttyUSB${dmPort}`] }
                    )
                    this.logger.warn(`ms data lock status updated. ${JSON.stringify(insert.raw)}`)
                }

                const getWCDMANetworkParametersMatch = response.match(correctPattern.getWCDMANetworkParameters)

                if (getWCDMANetworkParametersMatch) {
                    if (global.recording === true) {
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
                }

                const noCoveragePrametersMatch = response.match(correctPattern.noCoveragePrameters)
                if (noCoveragePrametersMatch) {
                    if (global.recording === true) {
                        const wcdmaData_noCov = {
                            'tech': '-',
                            'mcc': '-',
                            'mnc': '-',
                            'lac': '-',
                            'cellid': '-',
                            'uarfcn': '-',
                            'psc': '-',
                            'rac': '-',
                            'rscp': '-',
                            'ecio': '-',
                            'phych': '-',
                            'sf': '-',
                            'slot': '-',
                            'speech_code': '-',
                            'comMod': '-',
                        }


                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        const newEntry = this.wcdmaIdlesRepo.create({
                            tech: wcdmaData_noCov.tech,
                            mcc: wcdmaData_noCov.mcc,
                            mnc: wcdmaData_noCov.mnc,
                            lac: wcdmaData_noCov.lac,
                            cellid: wcdmaData_noCov.cellid,
                            uarfcn: wcdmaData_noCov.uarfcn,
                            psc: wcdmaData_noCov.psc,
                            rac: wcdmaData_noCov.rac,
                            rscp: wcdmaData_noCov.rscp,
                            ecio: wcdmaData_noCov.ecio,
                            phych: wcdmaData_noCov.phych,
                            sf: wcdmaData_noCov.sf,
                            slot: wcdmaData_noCov.slot,
                            speech_code: wcdmaData_noCov.speech_code,
                            comMod: wcdmaData_noCov.comMod,
                            inspection: inspection,
                            location: location
                        })
                        const save = await this.wcdmaIdlesRepo.save(newEntry)
                    }
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

        const intervalId = setInterval(() => {
            port.write(commands.getWCDMANetworkParameters)
        }, interval)

        global.activeIntervals.push(intervalId)
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