import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GPSData } from "./entities/gps-data.entity";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { Inspection } from "./entities/inspection.entity";
import { ProbGateway } from "./prob.gateway";

const correctPattern = {
    'moduleInformation': /.*Quectel\r\n(\w+)\r\nRevision: (\w+)\r\n.*/,
    'simIMSI': /.*CIMI\r\r\n(\d+).*/,
    'moduleIMEI': /.*CGSN\r\r\n(\d+).*/,
    'simStatus': /.*CPIN: (\w+).*/,
    'clearStorage': /.*QFDEL.*OK.*/,
    'callStatus': /.*CPAS: (\d+).*/,
    'moduleFullFunctionality': /.*CFUN=1.*OK.*/,
    'turnOffData': /.*QIDEACT=1.*OK.*/,
    'currentNetwork': /.*COPS.*"([^"]+)".*|.*COPS: (\d+).*/,
    'lockALLTECH': /AT\+QCFG="nwscanmode",0\r\r\nOK\r\n/,
}

const sleep = async (milisecond: number) => {
    await new Promise(resolve => setTimeout(resolve, milisecond))
}

export const allDMPorts = [2, 6, 10, 14, 18, 22, 26, 30]

@Injectable()
export class MSService {
    private readonly logger = new Logger(MSService.name);
    public initializedPorts: { [key: string]: SerialPort } = {}
    private dmPorts = allDMPorts
    private noCoverageCheck: { [key: string]: boolean } = {}
    private moduleInfo: { [key: string]: { modelName: string, revision: string } } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private simStatus: { [key: string]: string } = {}
    private clearStorage: { [key: string]: boolean } = {}
    private callStatus: { [key: string]: boolean } = {}
    private moduleFullFunctionality: { [key: string]: boolean } = {}
    private turnOffData: { [key: string]: boolean } = {}
    private currentNetwork: { [key: string]: boolean } = {}
    private allTechMode: { [key: string]: boolean } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        private readonly probSocketGateway: ProbGateway,
    ) { }

    async portsTermination() {
        this.moduleInfo = {}
        this.moduleIMEI = {}
        this.simIMSI = {}
        this.simStatus = {}
        this.clearStorage = {}
        this.callStatus = {}
        this.moduleFullFunctionality = {}
        this.turnOffData = {}
        this.currentNetwork = {}
        this.allTechMode = {}
        this.dmPortIntervalId = {}

        for (const dmPort of this.dmPorts) {
            if (this.initializedPorts[`ttyUSB${dmPort}`].isOpen && this.initializedPorts[`ttyUSB${dmPort}`].isOpen === true) {
                this.initializedPorts[`ttyUSB${dmPort}`].close()
                this.logger.debug(`port ${dmPort} terminate successfully.`)
            }
        }
        this.initializedPorts = {}
    }

    async portsInitializing(inspection: Inspection) {
        // for (const dmPort of this.dmPorts) {
        //     this.dmPortIntervalId[`ttyUSB${dmPort}`] = setInterval(
        //         async () => {
        //             const progress = this.checkPortTrueInit(dmPort)

        //             if (progress === 100) {
        //                 clearInterval(this.dmPortIntervalId[`ttyUSB${dmPort}`])
        //                 this.initializedPorts[`ttyUSB${dmPort}`].close()
        //                 this.logger.debug(`port ${dmPort} initialized successfully then port closed.`)
        //             }
        //             else {
        //                 this.logger.log(`try to initialize port ${dmPort}`)
        //                 this.getMSData(dmPort)
        //             }
        //         },
        //         2000)
        //     global.activeIntervals.push(this.dmPortIntervalId[`ttyUSB${dmPort}`])
        //     await this.waitForNextPortInit(dmPort)
        // }
        await Promise.all(
            this.dmPorts.map((dmPort, index) => {
                this.dmPortIntervalId[`ttyUSB${dmPort}`] = setInterval(
                    async () => {
                        const progress = this.checkPortTrueInit(dmPort)

                        if (progress === 100) {
                            clearInterval(this.dmPortIntervalId[`ttyUSB${dmPort}`])
                            if (this.initializedPorts[`ttyUSB${dmPort}`].isOpen === true)
                                this.initializedPorts[`ttyUSB${dmPort}`].close()
                            this.logger.debug(`port ${dmPort} initialized successfully then port closed.`)
                        }
                        else {
                            this.logger.log(`try to initialize port ${dmPort}`)
                            this.getMSData(dmPort)
                        }
                    },
                    2000)
                global.activeIntervals.push(this.dmPortIntervalId[`ttyUSB${dmPort}`])
                return this.waitForNextPortInit(dmPort)
            })
        )

        await sleep(5000)

        const res = []
        for (const dmPort of this.dmPorts) {
            const [find] = await this.msDataRepo.find({ where: { inspection: { id: inspection.id }, IMEI: this.moduleIMEI[`ttyUSB${dmPort}`] } })
            if (!find) {
                const newEntry = this.msDataRepo.create({
                    modelName: this.moduleInfo[`ttyUSB${dmPort}`].modelName,
                    revision: this.moduleInfo[`ttyUSB${dmPort}`].revision,
                    dmPortNumber: dmPort,
                    IMEI: this.moduleIMEI[`ttyUSB${dmPort}`],
                    IMSI: this.simIMSI[`ttyUSB${dmPort}`],
                    simStatus: this.simStatus[`ttyUSB${dmPort}`],
                    callability: this.callStatus[`ttyUSB${dmPort}`],
                    inspection: inspection,
                })

                const save = await this.msDataRepo.save(newEntry)
                res.push(save)
            }
            else {
                const update = await this.msDataRepo.update(
                    { inspection: inspection, IMEI: this.moduleIMEI[`ttyUSB${dmPort}`] },
                    {
                        modelName: this.moduleInfo[`ttyUSB${dmPort}`].modelName,
                        revision: this.moduleInfo[`ttyUSB${dmPort}`].revision,
                        dmPortNumber: dmPort,
                        IMSI: this.simIMSI[`ttyUSB${dmPort}`],
                        simStatus: this.simStatus[`ttyUSB${dmPort}`],
                        callability: this.callStatus[`ttyUSB${dmPort}`],
                    }
                )
                res.push(update)
            }
        }

        this.logger.warn(`ms data stored. Count is: ${res.length}`)

    }

    async getMSData(dmPort: number) {
        if (this.initializedPorts[`ttyUSB${dmPort}`]) {
            if (!this.initializedPorts[`ttyUSB${dmPort}`].isOpen) {
                this.initializedPorts[`ttyUSB${dmPort}`].open()
                this.logger.warn(`port ${dmPort} reOpened.`)
            }
            else {
                const port = this.initializedPorts[`ttyUSB${dmPort}`]

                if (!this.noCoverageCheck[`ttyUSB${dmPort}`]) {
                    port.write(commands.getALLTECHNetworkParameters)
                    this.logger.log('getALLTECHNetworkParameters')
                }
                if (!this.moduleInfo[`ttyUSB${dmPort}`]) {
                    port.write(commands.getModuleInfo)
                    this.logger.log('getModuleInfo')
                }
                if (!this.moduleIMEI[`ttyUSB${dmPort}`]) {
                    port.write(commands.getModuleIMEI)
                    this.logger.log('getModuleIMEI')
                }
                if (!this.simIMSI[`ttyUSB${dmPort}`]) {
                    port.write(commands.getSimIMSI)
                    this.logger.log('getSimIMSI')
                }
                if (!this.simStatus[`ttyUSB${dmPort}`]) {
                    port.write(commands.getSimStatus)
                    this.logger.log('getSimStatus')
                }
                if (!this.clearStorage[`ttyUSB${dmPort}`]) {
                    port.write(commands.clearUFSStorage)
                    this.logger.log('clearUFSStorage')
                }
                if (!this.moduleFullFunctionality[`ttyUSB${dmPort}`]) {
                    port.write(commands.moduleFullFunctionality)
                    this.logger.log('moduleFullFunctionality')
                }
                if (!this.turnOffData[`ttyUSB${dmPort}`]) {
                    port.write(commands.turnOffData)
                    this.logger.log('turnOffData')
                }
                if (!this.currentNetwork[`ttyUSB${dmPort}`]) {
                    port.write(commands.getCurrentNetwork)
                    this.logger.log('getCurrentNetwork')
                }
                if (!this.allTechMode[`ttyUSB${dmPort}`]) {
                    port.write(commands.lockALLTECH)
                    this.logger.log('allTechMode')
                }
                if (!this.callStatus[`ttyUSB${dmPort}`]) {
                    port.write(commands.getCallStatus)
                    this.logger.log('getCallStatus')
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

                const noCoverageCheckMatch = (JSON.stringify(response).indexOf('servingcell') >= 0 && JSON.stringify(response).indexOf('SEARCH') >= 0)
                const moduleInformationMatch = response.match(correctPattern.moduleInformation)
                const moduleIMEIMatch = response.match(correctPattern.moduleIMEI)
                const simIMSIMatch = response.match(correctPattern.simIMSI)
                const simStatusMatch = response.match(correctPattern.simStatus)
                const clearStorageMatch =
                    response.match(correctPattern.clearStorage) ||
                    (JSON.stringify(response).indexOf('QFDEL') >= 0 && JSON.stringify(response).indexOf('OK') >= 0) ||
                    (JSON.stringify(response).indexOf('QFDEL') >= 0 && JSON.stringify(response).slice(-2) === 'r"')
                const callStatusMatch = response.match(correctPattern.callStatus)
                const moduleFullFunctionalityMatch =
                    response.match(correctPattern.moduleFullFunctionality) ||
                    (JSON.stringify(response).indexOf('CFUN=1') >= 0 && JSON.stringify(response).indexOf('OK') >= 0) ||
                    (JSON.stringify(response).indexOf('CFUN=1') >= 0 && JSON.stringify(response).slice(-2) === 'r"')
                const turnOffDataMatch =
                    response.match(correctPattern.turnOffData) ||
                    (JSON.stringify(response).indexOf('QIDEACT=1') >= 0 && JSON.stringify(response).indexOf('OK') >= 0) ||
                    (JSON.stringify(response).indexOf('QIDEACT=1') >= 0 && JSON.stringify(response).slice(-2) === 'r"')
                const currentNetworkMatch = response.match(correctPattern.currentNetwork)
                const allTechModeMatch = response.match(correctPattern.lockALLTECH)

                if (noCoverageCheckMatch) {
                    this.noCoverageCheck[`ttyUSB${dmPort}`] = !!noCoverageCheckMatch
                }

                if (moduleInformationMatch) {
                    this.moduleInfo[`ttyUSB${dmPort}`] = { ...this.moduleInfo[`ttyUSB${dmPort}`], modelName: moduleInformationMatch[1], revision: moduleInformationMatch[2] }
                }

                if (moduleIMEIMatch) {
                    this.moduleIMEI[`ttyUSB${dmPort}`] = moduleIMEIMatch[1]
                }

                if (simIMSIMatch) {
                    this.simIMSI[`ttyUSB${dmPort}`] = simIMSIMatch[1]
                    this.logger.log(`port ${dmPort} imsi is: ${this.simIMSI[`ttyUSB${dmPort}`]}`)
                }

                if (simStatusMatch) {
                    this.simStatus[`ttyUSB${dmPort}`] = simStatusMatch[1]
                }

                if (clearStorageMatch) {
                    this.clearStorage[`ttyUSB${dmPort}`] = !!clearStorageMatch
                }

                if (this.simIMSI && this.simIMSI[`ttyUSB${dmPort}`]) {
                    if (callStatusMatch) {
                        if (callStatusMatch[1] === '4' || this.noCoverageCheck[`ttyUSB${dmPort}`] === true) {
                            this.callStatus[`ttyUSB${dmPort}`] = !!callStatusMatch
                            port.write(commands.hangUpCall)
                        }
                        else if (callStatusMatch[1] === '0') {
                            if (this.simIMSI[`ttyUSB${dmPort}`].slice(0, 6).includes('43211')) {
                                port.write(commands.callMCI)
                            } else if (this.simIMSI[`ttyUSB${dmPort}`].slice(0, 6).includes('43235')) {
                                port.write(commands.callMTN)
                            }
                        }
                    }
                }

                if (moduleFullFunctionalityMatch) {
                    this.moduleFullFunctionality[`ttyUSB${dmPort}`] = !!moduleFullFunctionalityMatch
                }

                if (turnOffDataMatch) {
                    this.turnOffData[`ttyUSB${dmPort}`] = !!turnOffDataMatch
                }

                if (currentNetworkMatch) {
                    if (currentNetworkMatch[2] === "0" || currentNetworkMatch[1].indexOf('Irancell') >= 0 || currentNetworkMatch[1].indexOf('MCI') >= 0) {
                        this.currentNetwork[`ttyUSB${dmPort}`] = !!currentNetworkMatch
                    }
                    else {
                        port.write(commands.automaticNetworkSelectionMode)
                    }
                }

                if (allTechModeMatch) {
                    this.allTechMode[`ttyUSB${dmPort}`] = !!allTechModeMatch
                }
            })

            port.on('error', (err) => {
                this.logger.error(`Error on port ${dmPort}: ${err.message}`);
            });

            this.initializedPorts[`ttyUSB${dmPort}`] = port
        }
    }

    checkPortTrueInit(dmPort: number) {
        const p1 = (!!this.noCoverageCheck[`ttyUSB${dmPort}`] === true || !!this.noCoverageCheck[`ttyUSB${dmPort}`] === false) ? 1 : 0
        const p2 = (!!this.moduleInfo[`ttyUSB${dmPort}`]) ? 1 : 0
        const p3 = (!!this.moduleIMEI[`ttyUSB${dmPort}`]) ? 1 : 0
        const p4 = (!!this.simIMSI[`ttyUSB${dmPort}`]) ? 1 : 0
        const p5 = (!!this.simStatus[`ttyUSB${dmPort}`]) ? 1 : 0
        const p6 = (!!this.clearStorage[`ttyUSB${dmPort}`]) ? 1 : 0
        const p7 = (!!this.callStatus[`ttyUSB${dmPort}`]) ? 1 : 0
        const p8 = (!!this.moduleFullFunctionality[`ttyUSB${dmPort}`]) ? 1 : 0
        const p9 = (!!this.turnOffData[`ttyUSB${dmPort}`]) ? 1 : 0
        const p10 = (!!this.currentNetwork[`ttyUSB${dmPort}`]) ? 1 : 0
        const p11 = (!!this.allTechMode[`ttyUSB${dmPort}`]) ? 1 : 0
        const p12 = (!!this.dmPortIntervalId[`ttyUSB${dmPort}`]) ? 1 : 0

        const progress = Number((((p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + p10 + p11 + p12) / 12) * 100).toFixed(2))

        return progress
    }

    waitForNextPortInit = (dmPort: number, timeout = 1000) => {
        return new Promise((resolve) => {
            const checkCondition = () => {
                const progress = this.checkPortTrueInit(dmPort)

                global.portsInitingStatus = (!!global.portsInitingStatus.find(item => item.port === dmPort) ? [...global.portsInitingStatus] : [...global.portsInitingStatus, { port: dmPort, progress }])
                    .map(item => item.port === dmPort ? ({ ...item, progress }) : item)

                const isLoadingPortsIniting = !(global.portsInitingStatus.filter(item => item.progress === 100).length === allDMPorts.length)

                this.probSocketGateway.emitPortsInitingStatus(dmPort, progress)

                if (progress === 100) {
                    resolve(1);
                } else {
                    setTimeout(checkCondition, timeout); // Adjust the interval as needed
                }
            };

            checkCondition();
        });
    }
}