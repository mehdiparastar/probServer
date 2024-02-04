import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";
import { ALLTECHIdle } from './entities/alltechIdle.entity';
import { Inspection } from "./entities/inspection.entity";
import { GPSData } from './entities/gps-data.entity';

const correctPattern = {
    'lockALLTECH': /AT\+QCFG="nwscanmode",0\r\r\nOK\r\n/,
    //                             +QENG: "servingcell","LIMSRV","GSM",  432,   11,   96C,    521B,  63,   103,   -,       -48,    255, 255,   0,    58,   58,    1,   -,         -,       -,        -,        -,         -,        -,        -,       -,         "-"
    'getGSMNetworkParameters': /.*\+QENG: "servingcell","(\w+)","(\w+)",(\d+),(\d+),(\d+|\w+),(\w+),(\d+),(\d+),([-]|\w+),(-?\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),"([-]|\w+)"\r\n\r\nOK\r\n/,
    'getWCDMANetworkParameters': /.*\+QENG: "servingcell","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+)/,
    'getLTENetworkParameters': /.*\+QENG: "servingcell","(-?\w+)","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-w+?|-?).*/,
    'noCoveragePrameters': /.*\+QENG: "servingcell","SEARCH".*/,

}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class ALLTECHIdleService {
    private readonly logger = new Logger(ALLTECHIdleService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private lockStatus: { [key: string]: techType } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}
    private initializingEnd: boolean = false

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        @InjectRepository(ALLTECHIdle) private alltechIdlesRepo: Repository<ALLTECHIdle>,
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
                    port.write(commands.lockALLTECH)
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

                const lockALLTECHMatch = response.match(correctPattern.lockALLTECH)

                if (lockALLTECHMatch) {
                    this.lockStatus[`ttyUSB${dmPort}`] = techType.alltech
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

                        const newEntry = this.alltechIdlesRepo.create({
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
                        const save = await this.alltechIdlesRepo.save(newEntry)
                    }
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

                    const newEntry = this.alltechIdlesRepo.create({
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
                    const save = await this.alltechIdlesRepo.save(newEntry)
                }


                const getLTENetworkParametersMatch = response.match(correctPattern.getLTENetworkParameters)
                if (getLTENetworkParametersMatch) {
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

                    const newEntry = this.alltechIdlesRepo.create({
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
                    const save = await this.alltechIdlesRepo.save(newEntry)
                }

                const noCoveragePrametersMatch = response.match(correctPattern.noCoveragePrameters)
                if (noCoveragePrametersMatch) {
                    if (global.recording === true) {
                        const allTechData_noCov = {
                            tech: '-',
                            mcc: '-',
                            mnc: '-',
                            lac: '-',
                            cellid: '-',

                            bsic: '-',
                            arfcn: '-',
                            bandgsm: '-',
                            rxlev: '-',
                            txp: '-',
                            tla: '-',
                            drx: '-',
                            c1: '-',
                            c2: '-',
                            gprs: '-',
                            tch: '-',
                            ts: '-',
                            ta: '-',
                            maio: '-',
                            hsn: '-',
                            rxlevsub: '-',
                            rxlevfull: '-',
                            rxqualsub: '-',
                            rxqualfull: '-',
                            voicecodec: '-',

                            uarfcn: '-',
                            psc: '-',
                            rac: '-',
                            rscp: '-',
                            ecio: '-',
                            phych: '-',
                            sf: '-',
                            slot: '-',
                            speech_code: '-',
                            comMod: '-',

                            pcid: '-',
                            earfcn: '-',
                            freq_band_ind: '-',
                            ul_bandwidth: '-',
                            dl_bandwidth: '-',
                            tac: '-',
                            rsrp: '-',
                            rsrq: '-',
                            rssi: '-',
                            sinr: '-',
                            srxlev: '-',
                        }


                        const location = await this.gpsDataRepo
                            .createQueryBuilder('gps_data')
                            .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                            .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                            .setParameter('desiredCreatedAt', new Date())
                            .getOne();

                        const newEntry = this.alltechIdlesRepo.create({
                            tech: allTechData_noCov.tech,
                            mcc: allTechData_noCov.mcc,
                            mnc: allTechData_noCov.mnc,
                            lac: allTechData_noCov.lac,
                            cellid: allTechData_noCov.cellid,

                            bsic: allTechData_noCov.bsic,
                            arfcn: allTechData_noCov.arfcn,
                            bandgsm: allTechData_noCov.bandgsm,
                            rxlev: allTechData_noCov.rxlev,
                            txp: allTechData_noCov.txp,
                            tla: allTechData_noCov.tla,
                            drx: allTechData_noCov.drx,
                            c1: allTechData_noCov.c1,
                            c2: allTechData_noCov.c2,
                            gprs: allTechData_noCov.gprs,
                            tch: allTechData_noCov.tch,
                            ts: allTechData_noCov.ts,
                            ta: allTechData_noCov.ta,
                            maio: allTechData_noCov.maio,
                            hsn: allTechData_noCov.hsn,
                            rxlevsub: allTechData_noCov.rxlevsub,
                            rxlevfull: allTechData_noCov.rxlevfull,
                            rxqualsub: allTechData_noCov.rxqualsub,
                            rxqualfull: allTechData_noCov.rxqualfull,
                            voicecodec: allTechData_noCov.voicecodec,

                            uarfcn: allTechData_noCov.uarfcn,
                            psc: allTechData_noCov.psc,
                            rac: allTechData_noCov.rac,
                            rscp: allTechData_noCov.rscp,
                            ecio: allTechData_noCov.ecio,
                            phych: allTechData_noCov.phych,
                            sf: allTechData_noCov.sf,
                            slot: allTechData_noCov.slot,
                            speech_code: allTechData_noCov.speech_code,
                            comMod: allTechData_noCov.comMod,

                            pcid: allTechData_noCov.pcid,
                            earfcn: allTechData_noCov.earfcn,
                            freq_band_ind: allTechData_noCov.freq_band_ind,
                            ul_bandwidth: allTechData_noCov.ul_bandwidth,
                            dl_bandwidth: allTechData_noCov.dl_bandwidth,
                            tac: allTechData_noCov.tac,
                            rsrp: allTechData_noCov.rsrp,
                            rsrq: allTechData_noCov.rsrq,
                            rssi: allTechData_noCov.rssi,
                            sinr: allTechData_noCov.sinr,
                            srxlev: allTechData_noCov.srxlev,

                            inspection: inspection,
                            location: location
                        })
                        const save = await this.alltechIdlesRepo.save(newEntry)
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
            port.write(commands.getALLTECHNetworkParameters)
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