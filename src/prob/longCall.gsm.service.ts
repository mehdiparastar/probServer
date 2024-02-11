import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';
import { GSMLongCall } from "./entities/gsmLongCall.entity";
import { callStatus as msCallStatus } from './enum/callStatus.enum';


const correctPattern = {
    'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\nOK\r\n/,
    'getGSMNetworkParameters': /.*\+QENG: "servingcell","(\w+)","(\w+)",(\d+),(\d+),(\d+|\w+),(\w+),(\d+),(\d+),([-]|\w+),(-?\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),"([-]|\w+)"\r\n\r\nOK\r\n/,
    'noCoveragePrameters': /.*\+QENG: "servingcell","SEARCH".*/,
    'callStatus': /.*CPAS: (\d+).*/,
}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class GSMLongCallService {
    private readonly logger = new Logger(GSMLongCallService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private lockStatus: { [key: string]: techType } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}
    private initializingEnd: boolean = false
    private currentCallStatus: msCallStatus = msCallStatus.Idle

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        @InjectRepository(GSMLongCall) private gsmLongCallsRepo: Repository<GSMLongCall>,
        @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
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
                    this.msItrationDuty01(dmPort)
                    await sleep(5000)
                    this.msItrationDuty02(dmPort)
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

                        const newEntry = this.gsmLongCallsRepo.create({
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
                            callingStatus: this.currentCallStatus,
                            inspection: inspection,
                            location: location
                        })
                        const save = await this.gsmLongCallsRepo.save(newEntry)
                    }
                }

                const noCoveragePrametersMatch = response.match(correctPattern.noCoveragePrameters)
                if (noCoveragePrametersMatch) {
                    if (global.recording === true) {
                        const gsmData_noCov = {
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

                        const newEntry = this.gsmLongCallsRepo.create({
                            tech: gsmData_noCov.tech,
                            mcc: gsmData_noCov.mcc,
                            mnc: gsmData_noCov.mnc,
                            lac: gsmData_noCov.lac,
                            cellid: gsmData_noCov.cellid,
                            bsic: gsmData_noCov.bsic,
                            arfcn: gsmData_noCov.arfcn,
                            bandgsm: gsmData_noCov.bandgsm,
                            rxlev: gsmData_noCov.rxlev,
                            txp: gsmData_noCov.txp,
                            tla: gsmData_noCov.tla,
                            drx: gsmData_noCov.drx,
                            c1: gsmData_noCov.c1,
                            c2: gsmData_noCov.c2,
                            gprs: gsmData_noCov.gprs,
                            tch: gsmData_noCov.tch,
                            ts: gsmData_noCov.ts,
                            ta: gsmData_noCov.ta,
                            maio: gsmData_noCov.maio,
                            hsn: gsmData_noCov.hsn,
                            rxlevsub: gsmData_noCov.rxlevsub,
                            rxlevfull: gsmData_noCov.rxlevfull,
                            rxqualsub: gsmData_noCov.rxqualsub,
                            rxqualfull: gsmData_noCov.rxqualfull,
                            voicecodec: gsmData_noCov.voicecodec,
                            callingStatus: this.currentCallStatus,
                            inspection: inspection,
                            location: location
                        })
                        const save = await this.gsmLongCallsRepo.save(newEntry)
                    }
                }

                const callStatusMatch = response.match(correctPattern.callStatus)
                if (callStatusMatch) {
                    const callStatusData = {
                        'statusNo': callStatusMatch[1].trim()
                    }
                    if (callStatusData.statusNo !== '4') {
                        this.currentCallStatus = msCallStatus.Idle
                        if (this.simIMSI[`ttyUSB${dmPort}`].slice(0, 6).includes('43211')) {
                            port.write(commands.callMCI)
                        } else if (this.simIMSI[`ttyUSB${dmPort}`].slice(0, 6).includes('43235')) {
                            this.logger.warn('try to call')
                            port.write(commands.callMTN)
                        }
                    }
                    else {
                        this.currentCallStatus = msCallStatus.Dedicate
                    }
                }
            })

            port.on('error', (err) => {
                this.logger.error(`Error on port ${dmPort}: ${err.message}`);
            });

            this.initializedPorts[`ttyUSB${dmPort}`] = port
        }
    }

    async msItrationDuty02(dmPort: number, interval: number = 1000) {
        const port = this.initializedPorts[`ttyUSB${dmPort}`]

        const intervalId = setInterval(() => {
            port.write(commands.getGSMNetworkParameters)
        }, interval)

        global.activeIntervals.push(intervalId)
    }

    async msItrationDuty01(dmPort: number, interval: number = 2500) {
        const port = this.initializedPorts[`ttyUSB${dmPort}`]

        const intervalId = setInterval(() => {
            port.write(commands.getCallStatus)
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