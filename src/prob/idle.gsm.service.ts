import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { GSMIdleMCI } from './entities/gsmIdleMCI.entity';
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';
import { ProbGateway } from "./prob.gateway";
import { GSMIdleMTN } from "./entities/gsmIdleMTN.entity";

const correctPattern = {
    'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\nOK\r\n/,
    'getGSMNetworkParameters': /.*\+QENG: "servingcell","(\w+)","(\w+)",(\d+),(\d+),(\d+|\w+),(\w+),(\d+),(\d+),([-]|\w+),(-?\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),"([-]|\w+)"\r\n\r\nOK\r\n/,
    'noCoveragePrameters': /.*\+QENG: "servingcell","SEARCH".*/,

}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class GSMIdleService {
    private readonly logger = new Logger(GSMIdleService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private lockStatus: { [key: string]: techType } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}
    private initializingEnd: boolean = false

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        @InjectRepository(GSMIdleMCI) private gsmIdlesRepo: Repository<GSMIdleMCI> | Repository<GSMIdleMTN>,
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
                    port.write(commands.lockGSM)
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

                const lockGSMMatch = response.match(correctPattern.lockGSM)

                if (lockGSMMatch) {
                    this.lockStatus[`ttyUSB${dmPort}`] = techType.gsm
                    const insert = await this.msDataRepo.update(
                        { IMEI: this.moduleIMEI[`ttyUSB${dmPort}`], inspection: { id: inspection.id } },
                        { lockStatus: this.lockStatus[`ttyUSB${dmPort}`] }
                    )
                    this.logger.warn(`ms data lock status updated. ${JSON.stringify(insert.raw)}`)

                }

                const getGSMNetworkParametersMatch = response.match(correctPattern.getGSMNetworkParameters)

                if (getGSMNetworkParametersMatch) {
                    if (global.recording === true) {
                        const gsmData = {
                            'tech': getGSMNetworkParametersMatch[2].trim(),
                            'mcc': getGSMNetworkParametersMatch[3].trim(),
                            'mnc': getGSMNetworkParametersMatch[4].trim(),
                            'lac': getGSMNetworkParametersMatch[5].trim(),
                            'cellid': getGSMNetworkParametersMatch[6].trim(),
                            'bsic': getGSMNetworkParametersMatch[7].trim(),
                            'arfcn': getGSMNetworkParametersMatch[8].trim(),
                            'bandgsm': getGSMNetworkParametersMatch[9].trim(),
                            'rxlev': getGSMNetworkParametersMatch[10].trim(),
                            'txp': getGSMNetworkParametersMatch[11].trim(),
                            'tla': getGSMNetworkParametersMatch[12].trim(),
                            'drx': getGSMNetworkParametersMatch[13].trim(),
                            'c1': getGSMNetworkParametersMatch[14].trim(),
                            'c2': getGSMNetworkParametersMatch[15].trim(),
                            'gprs': getGSMNetworkParametersMatch[16].trim(),
                            'tch': getGSMNetworkParametersMatch[17].trim(),
                            'ts': getGSMNetworkParametersMatch[18].trim(),
                            'ta': getGSMNetworkParametersMatch[19].trim(),
                            'maio': getGSMNetworkParametersMatch[20].trim(),
                            'hsn': getGSMNetworkParametersMatch[21].trim(),
                            'rxlevsub': getGSMNetworkParametersMatch[22].trim(),
                            'rxlevfull': getGSMNetworkParametersMatch[23].trim(),
                            'rxqualsub': getGSMNetworkParametersMatch[24].trim(),
                            'rxqualfull': getGSMNetworkParametersMatch[25].trim(),
                            'voicecodec': getGSMNetworkParametersMatch[26].trim(),
                        }

                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        const newEntry = this.gsmIdlesRepo.create({
                            tech: gsmData.tech,
                            mcc: gsmData.mcc,
                            mnc: gsmData.mnc,
                            lac: gsmData.lac,
                            cellid: gsmData.cellid,
                            bsic: gsmData.bsic,
                            arfcn: gsmData.arfcn,
                            bandgsm: gsmData.bandgsm,
                            rxlev: gsmData.rxlev,
                            txp: gsmData.txp,
                            tla: gsmData.tla,
                            drx: gsmData.drx,
                            c1: gsmData.c1,
                            c2: gsmData.c2,
                            gprs: gsmData.gprs,
                            tch: gsmData.tch,
                            ts: gsmData.ts,
                            ta: gsmData.ta,
                            maio: gsmData.maio,
                            hsn: gsmData.hsn,
                            rxlevsub: gsmData.rxlevsub,
                            rxlevfull: gsmData.rxlevfull,
                            rxqualsub: gsmData.rxqualsub,
                            rxqualfull: gsmData.rxqualfull,
                            voicecodec: gsmData.voicecodec,
                            inspection: inspection,
                            location: location
                        })
                        const save = await this.gsmIdlesRepo.save(newEntry)

                        this.probSocketGateway.emitDTGSMIdle({ ...location, gsmIdleSamplesMCI: [save] }, this.op)

                        if (location === null || location === undefined || !location.latitude) {
                            this.logger.log('err in location', location)
                        }

                        if (gsmData.rxlev === '-' || gsmData.rxlev === ' - ' || gsmData.rxlev === '' || gsmData.rxlev === null || gsmData.rxlev === undefined) {
                            this.logger.warn('err in rxlev')
                        }
                    }
                }

                const noCoveragePrametersMatch = response.match(correctPattern.noCoveragePrameters)
                if (noCoveragePrametersMatch) {
                    if (global.recording === true) {
                        const gsmIdleData_noCov = {
                            'tech': '-',
                            'mcc': '-',
                            'mnc': '-',
                            'lac': '-',
                            'cellid': '-',
                            'bsic': '-',
                            'arfcn': '-',
                            'bandgsm': '-',
                            'rxlev': '-',
                            'txp': '-',
                            'tla': '-',
                            'drx': '-',
                            'c1': '-',
                            'c2': '-',
                            'gprs': '-',
                            'tch': '-',
                            'ts': '-',
                            'ta': '-',
                            'maio': '-',
                            'hsn': '-',
                            'rxlevsub': '-',
                            'rxlevfull': '-',
                            'rxqualsub': '-',
                            'rxqualfull': '-',
                            'voicecodec': '-',
                        }


                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        const newEntry = this.gsmIdlesRepo.create({
                            tech: gsmIdleData_noCov.tech,
                            mcc: gsmIdleData_noCov.mcc,
                            mnc: gsmIdleData_noCov.mnc,
                            lac: gsmIdleData_noCov.lac,
                            cellid: gsmIdleData_noCov.cellid,
                            bsic: gsmIdleData_noCov.bsic,
                            arfcn: gsmIdleData_noCov.arfcn,
                            bandgsm: gsmIdleData_noCov.bandgsm,
                            rxlev: gsmIdleData_noCov.rxlev,
                            txp: gsmIdleData_noCov.txp,
                            tla: gsmIdleData_noCov.tla,
                            drx: gsmIdleData_noCov.drx,
                            c1: gsmIdleData_noCov.c1,
                            c2: gsmIdleData_noCov.c2,
                            gprs: gsmIdleData_noCov.gprs,
                            tch: gsmIdleData_noCov.tch,
                            ts: gsmIdleData_noCov.ts,
                            ta: gsmIdleData_noCov.ta,
                            maio: gsmIdleData_noCov.maio,
                            hsn: gsmIdleData_noCov.hsn,
                            rxlevsub: gsmIdleData_noCov.rxlevsub,
                            rxlevfull: gsmIdleData_noCov.rxlevfull,
                            rxqualsub: gsmIdleData_noCov.rxqualsub,
                            rxqualfull: gsmIdleData_noCov.rxqualfull,
                            voicecodec: gsmIdleData_noCov.voicecodec,
                            inspection: inspection,
                            location: location
                        })
                        const save = await this.gsmIdlesRepo.save(newEntry)
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
            port.write(commands.getGSMNetworkParameters)
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