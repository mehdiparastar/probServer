import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { techType } from "./enum/techType.enum";

const correctPattern = {
    'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\nOK\r\n/,
    'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\nOK\r\n/,
    'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\nOK\r\n/,
    'allTech': /AT\+QCFG="nwscanmode",0\r\r\nOK\r\n/,
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

    constructor(
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
        // private dmPort: number
    ) { }

    async portsInitializing(dmPort: number) {
        const msData = await this.msDataRepo.findOne({ where: { dmPortNumber: dmPort } })

        this.moduleIMEI[`ttyUSB${dmPort}`] = msData.IMEI
        this.simIMSI[`ttyUSB${dmPort}`] = msData.IMSI

        this.dmPortIntervalId[`ttyUSB${dmPort}`] = setInterval(
            async () => {
                const cond = this.checkPortTrueInit(dmPort)

                if (cond) {
                    clearInterval(this.dmPortIntervalId[`ttyUSB${dmPort}`])
                    this.initializedPorts[`ttyUSB${dmPort}`].close()
                    this.logger.debug(`port ${dmPort} initialized successfully then port closed.`)
                }
                else {
                    this.logger.log(`try to initialize port ${dmPort}`)
                    this.getMSData(dmPort)
                }
            },
            2000)

        await sleep(5000)


    }

    async getMSData(dmPort: number) {
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
                        { IMEI: this.moduleIMEI[`ttyUSB${dmPort}`] },
                        { lockStatus: this.lockStatus[`ttyUSB${dmPort}`] }
                    )
                    this.logger.warn(`ms data lock status updated. ${JSON.stringify(insert.raw)}`)

                }


            })

            port.on('error', (err) => {
                this.logger.error(`Error on port ${dmPort}: ${err.message}`);
            });

            this.initializedPorts[`ttyUSB${dmPort}`] = port
        }
    }

    checkPortTrueInit(dmPort: number) {
        return (
            !!this.lockStatus[`ttyUSB${dmPort}`] &&
            !!this.dmPortIntervalId[`ttyUSB${dmPort}`]
        )
    }

    waitForNextPortInit = (dmPort: number, timeout = 1000) => {
        return new Promise((resolve) => {
            const checkCondition = () => {
                const cond = this.checkPortTrueInit(dmPort)

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