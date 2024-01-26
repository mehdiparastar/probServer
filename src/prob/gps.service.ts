import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GPSData } from "./entities/gps-data.entity";
import { Repository } from "typeorm";
import { SerialPort } from "serialport";
import { commands } from "./enum/commands.enum";
import { MSData } from "./entities/ms-data.entity";
import { scenarioName } from "./enum/scenarioName.enum";
import { Inspection } from "./entities/inspection.entity";


function convertDMStoDD(degrees: string, direction: string) {
    const d = parseFloat(degrees);
    const dd = Math.floor(d / 100) + (d % 100) / 60;
    return direction === 'S' || direction === 'W' ? `${-dd}` : `${dd}`;
}


@Injectable()
export class GPSService {
    private readonly logger = new Logger(GPSService.name);
    private nmeaPorts = [1, 5, 9, 13, 17, 21, 25, 29]
    private initializedPorts: { [key: string]: SerialPort } = {}
    private dmPorts = [2, 6, 10, 14, 18, 22, 26, 30]
    private selectedGPSPort: number
    private disabledGPSPorts: number[] = []
    private gpsPort: number
    private initializingEnd: boolean = false

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

    async portsInitializing(inspection: Inspection) {

        for (const portNumber of ([...this.dmPorts, ...this.nmeaPorts])) {
            if (this.initializedPorts[`ttyUSB${portNumber}`]) {
                if (!this.initializedPorts[`ttyUSB${portNumber}`].isOpen) {
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
                            this.initializedPorts[`ttyUSB${portNumber}`].close()
                            this.initializedPorts[`ttyUSB${this.nmeaPorts[this.dmPorts.indexOf(portNumber)]}`].close()
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
                                    this.initializedPorts[`ttyUSB${this.dmPorts[this.nmeaPorts.indexOf(this.selectedGPSPort)]}`].close()
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
                                        const dmPortsExceptMappedGpsPort = this.dmPorts.filter(p => p !== dmPortNumberOfGpsPort)

                                        const update = await this.msDataRepo.update({ dmPortNumber: dmPortNumberOfGpsPort, inspection: { id: inspection.id } }, { isGPS: true })
                                        this.logger.warn(`port ${this.gpsPort} set as gps port.`)

                                        const gsmIdleScenario = await this.msDataRepo.update({ dmPortNumber: dmPortNumberOfGpsPort, inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMIdle })

                                        const wcdmaIdleScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[0], inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMAIdle })

                                        const lteIdleScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[1], inspection: { id: inspection.id } }, { activeScenario: scenarioName.LTEIdle })

                                        const allTechIdleScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[2], inspection: { id: inspection.id } }, { activeScenario: scenarioName.ALLTechIdle })

                                        const gsmLongCallScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[3], inspection: { id: inspection.id } }, { activeScenario: scenarioName.GSMLongCall })

                                        const wcdmaLongCallScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[4], inspection: { id: inspection.id } }, { activeScenario: scenarioName.WCDMALongCall })

                                        const ftpDLScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[5], inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_DL_TH })

                                        const ftpUlScenario = await this.msDataRepo.update({ dmPortNumber: dmPortsExceptMappedGpsPort[6], inspection: { id: inspection.id } }, { activeScenario: scenarioName.FTP_UL_TH })

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