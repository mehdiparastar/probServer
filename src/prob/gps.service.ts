import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GPSData } from "./entities/gps-data.entity";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { scenarioName } from "./enum/scenarioName.enum";
import { Inspection } from "./entities/inspection.entity";
import { sleep } from "./prob.service";
import { MSService } from "./ms.service";


function convertDMStoDD(degrees: string, direction: string) {
    const d = parseFloat(degrees);
    const dd = Math.floor(d / 100) + (d % 100) / 60;
    return direction === 'S' || direction === 'W' ? `${-dd}` : `${dd}`;
}

const primaryNMEAPorts = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45]
const primaryDMPorts = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46]

@Injectable()
export class GPSService {
    private readonly logger = new Logger(GPSService.name);
    private nmeaPorts = primaryNMEAPorts
    private initializedPorts: { [key: string]: SerialPort } = {}
    private dmPorts = primaryDMPorts
    private selectedGPSPort: number
    private disabledGPSPorts: number[] = []
    private gpsPort: number
    private initializingEnd: boolean = false
    private msService: MSService

    constructor(
        @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
        @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
    ) { }

    // Function to parse GGA sentence
    async parseGGA(sentence: string) {
        const fields = (sentence.split('\n').filter(sen => sen.includes('$GPGGA')).splice(-1)[0])?.split(',')
        const time = fields && fields[1];
        const latitude = fields && convertDMStoDD(fields[2], fields[3]);
        const longitude = fields && convertDMStoDD(fields[4], fields[5]);
        const altitude = fields && fields[9];
        return { time, latitude, longitude, altitude };
    }

    // Function to parse RMC sentence
    async parseRMC(sentence: string) {
        const fields = (sentence.split('\n').filter(sen => sen.includes('$GPRMC')).splice(-1)[0])?.split(',')
        const time = fields && fields[1];
        const latitude = fields && convertDMStoDD(fields[3], fields[4]);
        const longitude = fields && convertDMStoDD(fields[5], fields[6]);
        const groundSpeed = fields && fields[7];
        const trackAngle = fields && fields[8];
        return { time, latitude, longitude, groundSpeed, trackAngle };
    }

    async closePort(port: SerialPort): Promise<void> {
        if (port.isOpen)
            return new Promise((resolve, reject) => {
                port.close(error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
    }


    async portsTermination() {
        try {
            // this.msService.initializedPorts[`ttyUSB${primaryDMPorts[primaryNMEAPorts.indexOf(this.selectedGPSPort)]}`]

            const selectedGPSDMPortNumber = this.dmPorts[this.nmeaPorts.indexOf(this.selectedGPSPort)] //primaryDMPorts[primaryNMEAPorts.indexOf(this.selectedGPSPort)]

            const port = this.initializedPorts[`ttyUSB${selectedGPSDMPortNumber}`]

            await this.closePort(port)

            port.end()

            await sleep(3000)

            for (const portNumber of ([...primaryDMPorts, ...primaryNMEAPorts])) {
                if (this.initializedPorts[`ttyUSB${portNumber}`] && this.initializedPorts[`ttyUSB${portNumber}`].isOpen === true) {
                    this.initializedPorts[`ttyUSB${portNumber}`].removeAllListeners('data')
                    await this.closePort(this.initializedPorts[`ttyUSB${portNumber}`])
                    this.logger.debug(`port ${portNumber} terminate successfully.`)
                }
            }

            this.selectedGPSPort = undefined
            this.disabledGPSPorts = []
            this.gpsPort = undefined
            this.initializingEnd = false
            this.initializedPorts = {}

            const newPort = new SerialPort({ path: `/dev/ttyUSB${selectedGPSDMPortNumber}`, baudRate: 115200 });

            newPort.on('open', async () => {
                this.logger.warn(`try to disable gps on port ${this.selectedGPSPort} from ${selectedGPSDMPortNumber}`)
                newPort.write(commands.disableGPS)
            })


            newPort.on('data', async (data) => {
                const response = data.toString()
                this.logger.warn(response)

                if (response.indexOf('OK') > 0) {
                    this.logger.warn('disabled')
                    if (!!newPort) {
                        await this.closePort(newPort)
                    }
                }
            })

            newPort.on('error', (err) => {
                this.logger.error(`Error on port ${selectedGPSDMPortNumber}: ${err.message}`);
                newPort.open(err => {
                    if (err) {
                        this.logger.error(err)
                    } else {
                        newPort.write(commands.disableGPS)
                    }
                })
                newPort.write(commands.disableGPS)
            });

            await sleep(1000)

            await new Promise((resolve) => {
                const checkCondition = () => {
                    const cond = newPort.isOpen === false

                    if (cond) {
                        resolve(1);
                    } else {
                        setTimeout(checkCondition, 500); // Adjust the interval as needed
                    }
                };

                checkCondition();
            });

            console.log(12)
        }
        catch (ex) {
            this.logger.error(ex)
        }
    }

    async portsInitializing(inspection: Inspection) {

        for (const portNumber of ([...this.dmPorts, ...this.nmeaPorts])) {
            if (this.initializedPorts[`ttyUSB${portNumber}`]) {
                if (this.initializedPorts[`ttyUSB${portNumber}`] && this.initializedPorts[`ttyUSB${portNumber}`].isOpen === false) {
                    this.initializedPorts[`ttyUSB${portNumber}`].open()
                    this.logger.warn(`port ${portNumber} reOpened.`)
                }
                else {
                    this.logger.log(`port ${portNumber} have been initialized.`)
                }
            }
            else {
                const port = new SerialPort({ path: `/dev/ttyUSB${portNumber}`, baudRate: 115200 });

                port.on('open', async () => {
                    if (this.dmPorts.includes(portNumber)) {
                        port.write(commands.enableGPS)
                    }
                    this.logger.log(`port ${portNumber} initialized.`)
                })

                port.on('data', async (data) => {
                    const response = data.toString()
                    // if (response.indexOf('GPS') >= 0) {
                    //     this.logger.log(JSON.stringify(response))
                    // }

                    if (response.indexOf('+QGPS: 1') >= 0) {
                        if (this.nmeaPorts[this.dmPorts.indexOf(portNumber)] !== this.selectedGPSPort) {
                            this.logger.debug(`trying disable ports ${portNumber} and ${this.nmeaPorts[this.dmPorts.indexOf(portNumber)]}`)
                            this.initializedPorts[`ttyUSB${portNumber}`].write(commands.disableGPS)
                        }
                    }

                    if (response.indexOf('+QGPS: 0') >= 0) {
                        if (this.disabledGPSPorts.includes(portNumber)) {
                            if (this.initializedPorts[`ttyUSB${portNumber}`])
                                await this.closePort(this.initializedPorts[`ttyUSB${portNumber}`])

                            if (this.initializedPorts[`ttyUSB${this.nmeaPorts[this.dmPorts.indexOf(portNumber)]}`])
                                await this.closePort(this.initializedPorts[`ttyUSB${this.nmeaPorts[this.dmPorts.indexOf(portNumber)]}`])
                        }
                        else {
                            this.disabledGPSPorts.push(portNumber)
                        }
                    }


                    if (response.includes('$GPGGA') || response.includes('$GPRMC')) {

                        // Extract GPS data from the GGA sentence
                        const ggaData = await this.parseGGA(response);
                        const rmcData = await this.parseRMC(response);

                        if (
                            (ggaData['latitude'] !== null && ggaData['latitude'] !== undefined && ggaData['latitude'] !== 'NaN' && ggaData['latitude'] !== '') ||
                            (rmcData['latitude'] !== null && rmcData['latitude'] !== undefined && rmcData['latitude'] !== 'NaN' && rmcData['latitude'] !== '')
                        ) {

                            if (this.selectedGPSPort === undefined) {
                                this.selectedGPSPort = portNumber;
                            }
                            else {
                                if (Object.values(this.initializedPorts).filter(item => item.isOpen).length === 2) {
                                    if (this.initializedPorts[`ttyUSB${this.dmPorts[this.nmeaPorts.indexOf(this.selectedGPSPort)]}`])
                                        await this.closePort(this.initializedPorts[`ttyUSB${this.dmPorts[this.nmeaPorts.indexOf(this.selectedGPSPort)]}`])
                                }
                                else if (Object.values(this.initializedPorts).filter(item => item.isOpen).length === 1) {

                                    const gpsTime = ggaData.time || rmcData.time
                                    if (gpsTime && gpsTime !== '') {
                                        try {
                                            if (global.recording === true) {
                                                const gpsData = await this.gpsDataRepo.upsert({
                                                    gpsTime: gpsTime,
                                                    latitude: ggaData.latitude || rmcData.latitude,
                                                    longitude: ggaData.longitude || rmcData.longitude,
                                                    altitude: ggaData.altitude,
                                                    groundSpeed: rmcData.groundSpeed,
                                                    inspection: inspection
                                                },
                                                    {
                                                        conflictPaths: ['gpsTime'],
                                                        skipUpdateIfNoValuesChanged: true
                                                    }
                                                )

                                                // const record = this.gpsDataRepo.create({
                                                //     gpsTime: gpsTime,
                                                //     latitude: ggaData.latitude || rmcData.latitude,
                                                //     longitude: ggaData.longitude || rmcData.longitude,
                                                //     altitude: ggaData.altitude,
                                                //     groundSpeed: rmcData.groundSpeed,
                                                //     inspection: inspection
                                                // })

                                                // const gpsData = await this.gpsDataRepo.save(record)                                                

                                            }
                                        }
                                        catch (ex) {
                                            this.logger.error(ex.message)
                                        }
                                    }

                                    // this.logger.warn(`recieved GPS data on Port ${portNumber}: ${ggaData['latitude']}, ${ggaData['latitude']} or ${rmcData['latitude']}, ${rmcData['latitude']}`)

                                    if (this.gpsPort === undefined) {
                                        this.gpsPort = portNumber
                                        const dmPortNumberOfGpsPort = this.dmPorts[this.nmeaPorts.indexOf(this.gpsPort)]

                                        const update = await this.msDataRepo.update({ dmPortNumber: dmPortNumberOfGpsPort, inspection: { id: inspection.id } }, { isGPS: true })
                                        this.logger.warn(`port ${this.gpsPort} set as gps port.`)

                                        const allMSData = await this.msDataRepo.find({ where: { inspection: { id: inspection.id } }, select: { dmPortNumber: true, IMSI: true } })

                                        let mciDMPorts = allMSData.filter(ms => ms.IMSI.slice(0, 6).includes('43211'))
                                        let mtnDMPorts = allMSData.filter(ms => ms.IMSI.slice(0, 6).includes('43235'))

                                        if (mciDMPorts.map(ms => ms.dmPortNumber).includes(dmPortNumberOfGpsPort)) {
                                            this.logger.warn("GPS PORT IN MCI")

                                            const gsmIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: dmPortNumberOfGpsPort, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMIdleMCI })

                                            mciDMPorts = mciDMPorts.filter(ms => ms.dmPortNumber !== dmPortNumberOfGpsPort)

                                            const wcdmaIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[0].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMAIdleMCI })
                                            const lteIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[1].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.LTEIdleMCI })
                                            const gsmLongCallMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[2].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMLongCallMCI })
                                            const wcdmaLongCallMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[3].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMALongCallMCI })
                                            const ftpDLMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[4].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_DL_TH_MCI })

                                            const gsmIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[0].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMIdleMTN })
                                            const wcdmaIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[1].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMAIdleMTN })
                                            const lteIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[2].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.LTEIdleMTN })
                                            const gsmLongCallMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[3].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMLongCallMTN })
                                            const wcdmaLongCallMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[4].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMALongCallMTN })
                                            const ftpDLMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[5].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_DL_TH_MTN })
                                        }

                                        if (mtnDMPorts.map(ms => ms.dmPortNumber).includes(dmPortNumberOfGpsPort)) {
                                            this.logger.warn("GPS PORT IN MTN")

                                            const gsmIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: dmPortNumberOfGpsPort, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMIdleMTN })

                                            mtnDMPorts = mtnDMPorts.filter(ms => ms.dmPortNumber !== dmPortNumberOfGpsPort)

                                            const wcdmaIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[0].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMAIdleMTN })
                                            const lteIdleMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[1].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.LTEIdleMTN })
                                            const gsmLongCallMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[2].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMLongCallMTN })
                                            const wcdmaLongCallMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[3].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMALongCallMTN })
                                            const ftpDLMTNScenario = await this.msDataRepo.update({ dmPortNumber: mtnDMPorts[4].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_DL_TH_MTN })

                                            const gsmIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[0].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMIdleMCI })
                                            const wcdmaIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[1].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMAIdleMCI })
                                            const lteIdleMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[2].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.LTEIdleMCI })
                                            const gsmLongCallMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[3].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMLongCallMCI })
                                            const wcdmaLongCallMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[4].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMALongCallMCI })
                                            const ftpDLMCIScenario = await this.msDataRepo.update({ dmPortNumber: mciDMPorts[5].dmPortNumber, inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_DL_TH_MCI })
                                        }


                                        this.logger.warn(`all scenarios set.`)
                                        this.initializingEnd = true

                                    }
                                }
                                else {
                                    for (const p of this.nmeaPorts) {
                                        if (p !== this.selectedGPSPort) {
                                            this.initializedPorts[`ttyUSB${this.dmPorts[this.nmeaPorts.indexOf(p)]}`].write(commands.gpsStatus)
                                        }
                                    }
                                }
                            }
                        }
                    }

                })

                port.on('error', (err) => {
                    this.logger.error(`Error on port ${portNumber}: ${err.message}`);
                });

                this.initializedPorts[`ttyUSB${portNumber}`] = port
            }
        }

        await this.waitForEndOfInitializing()

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