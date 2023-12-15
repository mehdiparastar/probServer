import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GPSData } from "./entities/gps-data.entity";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";

const correctPattern = {
    'moduleInformation': /.*Quectel\r\n(\w+)\r\nRevision: (\w+)\r\n.*/,
    'simIMSI': /.*CIMI\r\r\n(\d+).*/,
    'moduleIMEI': /.*CGSN\r\r\n(\d+).*/,
    'simStatus': /.*CPIN: (\w+).*/,
    'clearStorage': /.*QFDEL.*OK.*/
}

@Injectable()
export class MSService {
    private readonly logger = new Logger(MSService.name);
    private initializedPorts: { [key: string]: SerialPort } = {}
    private dmPorts = [2, 6, 10, 14, 18, 22, 26, 30]
    private moduleInfo: { [key: string]: { modelName: string, revision: string } } = {}
    private moduleIMEI: { [key: string]: string } = {}
    private simIMSI: { [key: string]: string } = {}
    private simStatus: { [key: string]: string } = {}
    private clearStorage: { [key: string]: boolean } = {}
    private dmPortIntervalId: { [key: string]: NodeJS.Timeout } = {}

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>
    ) { }

    async portsInitializing() {

        for (const dmPort of this.dmPorts) {
            this.dmPortIntervalId[`ttyUSB${dmPort}`] = setInterval(
                () => {
                    const cond =
                        !!this.moduleInfo[`ttyUSB${dmPort}`] &&
                        !!this.moduleIMEI[`ttyUSB${dmPort}`] &&
                        !!this.simIMSI[`ttyUSB${dmPort}`] &&
                        !!this.simStatus[`ttyUSB${dmPort}`] &&
                        !!this.clearStorage[`ttyUSB${dmPort}`] &&
                        !!this.dmPortIntervalId[`ttyUSB${dmPort}`]

                    if (cond) {
                        this.logger.log(`port ${dmPort} initialized successfully`)
                        clearInterval(this.dmPortIntervalId[`ttyUSB${dmPort}`])
                    }
                    else {
                        this.logger.log(`try to initialize port ${dmPort}`)
                        this.getMSData(dmPort)
                    }
                },
                5000)
            await this.waitForNextPortInit(dmPort)

        }

    }

    async getMSData(dmPort: number) {
        if (this.initializedPorts[`ttyUSB${dmPort}`]) {
            if (!this.initializedPorts[`ttyUSB${dmPort}`].isOpen) {
                this.initializedPorts[`ttyUSB${dmPort}`].open()
                this.logger.warn(`port ${dmPort} reOpened.`)
            }
            else {
                const port = this.initializedPorts[`ttyUSB${dmPort}`]
                if (!this.moduleInfo[`ttyUSB${dmPort}`]) {
                    port.write(commands.getModuleInfo)
                }
                if (!this.moduleIMEI[`ttyUSB${dmPort}`]) {
                    port.write(commands.getModuleIMEI)
                }
                if (!this.simIMSI[`ttyUSB${dmPort}`]) {
                    port.write(commands.getSimIMSI)
                }
                if (!this.simStatus[`ttyUSB${dmPort}`]) {
                    port.write(commands.getSimStatus)
                }
                if (!this.clearStorage[`ttyUSB${dmPort}`]) {
                    port.write(commands.clearUFSStorage)
                }
                this.logger.log(`port ${dmPort} have been initialized.`)
            }
        }
        else {
            const port = new SerialPort({ path: `/dev/ttyUSB${dmPort}`, baudRate: 115200 });

            port.on('open', async () => {
                if (this.dmPorts.includes(dmPort)) {
                    // port.write(commands.getCurrentNetwork)
                    // port.write(commands.automaticNetworkSelectionMode)
                    // await sleep(3000)
                    // await sleep(500)
                    // port.write(commands.turnOffData)
                    // await sleep(300)
                    // port.write(commands.clearUFSStorage)
                    // await sleep(300)
                    // port.write(commands.moduleFullFunctionality)
                }
                this.logger.log(`port ${dmPort} initialized.`)
            })

            port.on('data', async (data) => {
                const response = data.toString()

                this.logger.log(`port ${dmPort} : ${JSON.stringify(response)}`)

                const moduleInformationMatch = response.match(correctPattern.moduleInformation)
                const moduleIMEIMatch = response.match(correctPattern.moduleIMEI)
                const simIMSIMatch = response.match(correctPattern.simIMSI)
                const simStatusMatch = response.match(correctPattern.simStatus)
                const clearStorageMatch =
                    response.match(correctPattern.clearStorage) ||
                    (JSON.stringify(response).indexOf('QFDEL') >= 0 && JSON.stringify(response).indexOf('OK') >= 0) ||
                    (JSON.stringify(response).indexOf('QFDEL') >= 0 && JSON.stringify(response).slice(-1) === 'r')
                console.log(JSON.stringify(response).slice(-2))

                if (moduleInformationMatch) {
                    this.moduleInfo[`ttyUSB${dmPort}`] = { ...this.moduleInfo[`ttyUSB${dmPort}`], modelName: moduleInformationMatch[1], revision: moduleInformationMatch[2] }
                }

                if (moduleIMEIMatch) {
                    this.moduleIMEI[`ttyUSB${dmPort}`] = moduleIMEIMatch[1]
                }

                if (simIMSIMatch) {
                    this.simIMSI[`ttyUSB${dmPort}`] = simIMSIMatch[1]
                }

                if (simStatusMatch) {
                    this.simStatus[`ttyUSB${dmPort}`] = simStatusMatch[1]
                }

                if (clearStorageMatch) {
                    this.clearStorage[`ttyUSB${dmPort}`] = !!clearStorageMatch
                }

                // this.logger.log(`port ${dmPort} : ${JSON.stringify(response.match(correctPattern.moduleInformation))} - ${JSON.stringify(response)}`)
                // if (response.indexOf('GPS') >= 0) {
                // }
            })

            port.on('error', (err) => {
                this.logger.error(`Error on port ${dmPort}: ${err.message}`);
            });

            this.initializedPorts[`ttyUSB${dmPort}`] = port
        }
    }

    waitForNextPortInit = (dmPort: number, timeout = 1000) => {
        return new Promise((resolve) => {
            const checkCondition = () => {
                const cond =
                    !!this.moduleInfo[`ttyUSB${dmPort}`] &&
                    !!this.moduleIMEI[`ttyUSB${dmPort}`] &&
                    !!this.simIMSI[`ttyUSB${dmPort}`] &&
                    !!this.simStatus[`ttyUSB${dmPort}`] &&
                    !!this.clearStorage[`ttyUSB${dmPort}`] &&
                    !!this.dmPortIntervalId[`ttyUSB${dmPort}`]
                if (cond) {
                    this.logger.debug(`port ${dmPort} init successfully`)
                    resolve(1);

                } else {
                    setTimeout(checkCondition, timeout); // Adjust the interval as needed
                }
            };

            checkCondition();
        });
    }
}