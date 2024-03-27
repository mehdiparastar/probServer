import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { LTEIdleMCI } from './entities/lteIdleMCI.entity';
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';
import { ProbGateway } from "./prob.gateway";
import { LTEIdleMTN } from "./entities/lteIdleMTN.entity";

const correctPattern = {
    'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\nOK\r\n/,
    'getLTENetworkParameters': /.*\+QENG: "servingcell","(-?\w+)","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-w+?|-?).*/,
    'noCoveragePrameters': /.*\+QENG: "servingcell","SEARCH".*/,

}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class LTEIdleService {
    private readonly logger = new Logger(LTEIdleService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private lockStatus: { [key: string]: techType } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}
    private initializingEnd: boolean = false

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        @InjectRepository(LTEIdleMCI) private lteIdlesRepo: Repository<LTEIdleMCI> | Repository<LTEIdleMTN>,
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
                    port.write(commands.lockLTE)
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

                const lockLTEMatch = response.match(correctPattern.lockLTE)

                if (lockLTEMatch) {
                    this.lockStatus[`ttyUSB${dmPort}`] = techType.lte
                    const insert = await this.msDataRepo.update(
                        { IMEI: this.moduleIMEI[`ttyUSB${dmPort}`], inspection: { id: inspection.id } },
                        { lockStatus: this.lockStatus[`ttyUSB${dmPort}`] }
                    )
                    this.logger.warn(`ms data lock status updated. ${JSON.stringify(insert.raw)}`)
                }

                const getLTENetworkParametersMatch = response.match(correctPattern.getLTENetworkParameters)
                if (getLTENetworkParametersMatch) {
                    if (global.recording === true) {
                        const lteData = {
                            'tech': getLTENetworkParametersMatch[2].trim(),
                            'is_tdd': getLTENetworkParametersMatch[3].trim(),
                            'mcc': getLTENetworkParametersMatch[4].trim(),
                            'mnc': getLTENetworkParametersMatch[5].trim(),
                            'cellid': getLTENetworkParametersMatch[6].trim(),
                            'pcid': getLTENetworkParametersMatch[7].trim(),
                            'earfcn': getLTENetworkParametersMatch[8].trim(),
                            'freq_band_ind': getLTENetworkParametersMatch[9].trim(),
                            'ul_bandwidth': getLTENetworkParametersMatch[10].trim(),
                            'dl_bandwidth': getLTENetworkParametersMatch[11].trim(),
                            'tac': getLTENetworkParametersMatch[12].trim(),
                            'rsrp': getLTENetworkParametersMatch[13].trim(),
                            'rsrq': getLTENetworkParametersMatch[14].trim(),
                            'rssi': getLTENetworkParametersMatch[15].trim(),
                            'sinr': getLTENetworkParametersMatch[16].trim(),
                            'srxlev': getLTENetworkParametersMatch[17].trim(),
                        }


                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        if (location !== null && location !== undefined) {

                            const newEntry = this.lteIdlesRepo.create({
                                tech: lteData.tech,
                                is_tdd: lteData.is_tdd,
                                mcc: lteData.mcc,
                                mnc: lteData.mnc,
                                cellid: lteData.cellid,
                                pcid: lteData.pcid,
                                earfcn: lteData.earfcn,
                                freq_band_ind: lteData.freq_band_ind,
                                ul_bandwidth: lteData.ul_bandwidth,
                                dl_bandwidth: lteData.dl_bandwidth,
                                tac: lteData.tac,
                                rsrp: lteData.rsrp,
                                rsrq: lteData.rsrq,
                                rssi: lteData.rssi,
                                sinr: lteData.sinr,
                                srxlev: lteData.srxlev,
                                inspection: inspection,
                                location: location
                            })
                            const save = await this.lteIdlesRepo.save(newEntry)

                            this.probSocketGateway.emitDTLTEIdle({ ...location, ['lteIdleSamples' + this.op]: [save] }, this.op)
                        }
                    }
                }

                const noCoveragePrametersMatch = response.match(correctPattern.noCoveragePrameters)
                if (noCoveragePrametersMatch) {
                    if (global.recording === true) {
                        const lteData_noCov = {
                            'tech': '-',
                            'is_tdd': '-',
                            'mcc': '-',
                            'mnc': '-',
                            'cellid': '-',
                            'pcid': '-',
                            'earfcn': '-',
                            'freq_band_ind': '-',
                            'ul_bandwidth': '-',
                            'dl_bandwidth': '-',
                            'tac': '-',
                            'rsrp': '-',
                            'rsrq': '-',
                            'rssi': '-',
                            'sinr': '-',
                            'srxlev': '-',
                        }


                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        if (location !== null && location !== undefined) {

                            const newEntry = this.lteIdlesRepo.create({
                                tech: lteData_noCov.tech,
                                is_tdd: lteData_noCov.is_tdd,
                                mcc: lteData_noCov.mcc,
                                mnc: lteData_noCov.mnc,
                                cellid: lteData_noCov.cellid,
                                pcid: lteData_noCov.pcid,
                                earfcn: lteData_noCov.earfcn,
                                freq_band_ind: lteData_noCov.freq_band_ind,
                                ul_bandwidth: lteData_noCov.ul_bandwidth,
                                dl_bandwidth: lteData_noCov.dl_bandwidth,
                                tac: lteData_noCov.tac,
                                rsrp: lteData_noCov.rsrp,
                                rsrq: lteData_noCov.rsrq,
                                rssi: lteData_noCov.rssi,
                                sinr: lteData_noCov.sinr,
                                srxlev: lteData_noCov.srxlev,
                                inspection: inspection,
                                location: location
                            })
                            const save = await this.lteIdlesRepo.save(newEntry)

                            this.probSocketGateway.emitDTLTEIdle({ ...location, ['lteIdleSamples' + this.op]: [save] }, this.op)

                        }
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
            port.write(commands.getLTENetworkParameters)
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