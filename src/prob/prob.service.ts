import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { SerialPort } from 'serialport';
import { logLocationType } from './enum/logLocationType.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quectel } from './entities/quectel.entity';
import { commands } from './enum/commands.enum';
import { scenarioName } from './enum/scenarioName.enum';
import { GPSData } from './entities/gps-data.entity';

const serialPortCount = 32

const serialPortInterfaces = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31]]

const correctPattern = {
  'moduleInformation': /ATI\r\r\nQuectel\r\n([^]+)\r\nRevision: ([^\r\n\r\n]+)/,
  'moduleIMSI': /AT\+CIMI\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CPIN: (\w+)\r\n\r\nOK\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n(\w+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+QGPSLOC: ([\d.]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+),(\d+),([\d.]+),([\d.]+),([\d.]+),(\d+),(\d+)\r\n\r\nOK\r\n/
}

const cmeErrorPattern = {
  'moduleInformation': /ATI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMSI': /AT\+CIMI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n\+CME ERROR: (\d+)\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CME ERROR: (\d+)\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n\+CME ERROR: (\d+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+CME ERROR: (\d+)\r\n/,
}

const cmsErrorPattern = {
  'moduleInformation': /ATI\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'moduleIMSI': /AT\+CIMI\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+CMS ERROR: (\d+)\r\n/,
}

function convertDMStoDD(degrees: string, direction: string) {
  const d = parseFloat(degrees);
  const dd = Math.floor(d / 100) + (d % 100) / 60;
  return direction === 'S' || direction === 'W' ? `${-dd}` : `${dd}`;
}


// Function to parse GGA sentence
function parseGGA(sentence: string) {
  const fields = (sentence.split('\n').filter(sen => sen.includes('$GPGGA')).splice(-1)[0])?.split(',')
  const time = fields && fields[1];
  const latitude = fields && convertDMStoDD(fields[2], fields[3]);
  const longitude = fields && convertDMStoDD(fields[4], fields[5]);
  const altitude = fields && fields[9];
  return { time, latitude, longitude, altitude };
}

// Function to parse RMC sentence
function parseRMC(sentence: string) {
  const fields = (sentence.split('\n').filter(sen => sen.includes('$GPRMC')).splice(-1)[0])?.split(',')
  const time = fields && fields[1];
  const latitude = fields && convertDMStoDD(fields[3], fields[4]);
  const longitude = fields && convertDMStoDD(fields[5], fields[6]);
  const groundSpeed = fields && fields[7];
  const trackAngle = fields && fields[8];
  return { time, latitude, longitude, groundSpeed, trackAngle };
}

const cmeErrCodeToDesc = (code: string) => {
  switch (code) {
    case '0':
      return 'Phone failure';
    case '1':
      return 'No connection to phone';
    case '2':
      return 'Phone-adaptor link reserved';
    case '3':
      return 'Operation not allowed';
    case '4':
      return 'Operation not supported';
    case '5':
      return 'PH-SIM PIN required';
    case '6':
      return 'PH-FSIM PIN required';
    case '7':
      return 'PH-FSIM PUK required';
    case '10':
      return 'SIM not inserted';
    case '11':
      return 'SIM PIN required';
    case '12':
      return 'SIM PUK required';
    case '13':
      return 'SIM failure';
    case '14':
      return 'SIM busy';
    case '15':
      return 'SIM wrong';
    case '16':
      return 'Incorrect password';
    case '17':
      return 'SIM PIN2 required';
    case '18':
      return 'SIM PUK2 required';
    case '20':
      return 'Memory full';
    case '21':
      return 'Invalid index';
    case '22':
      return 'Not found';
    case '23':
      return 'Memory failure';
    case '24':
      return 'Text string too long';
    case '25':
      return 'Invalid characters in text string';
    case '26':
      return 'Dial string too long';
    case '27':
      return 'Invalid characters in dial string';
    case '30':
      return 'No network service';
    case '31':
      return 'Network timeout';
    case '32':
      return 'Network not allowed - emergency calls only';
    case '40':
      return 'Network personalization PIN required';
    case '41':
      return 'Network personalization PUK required';
    case '42':
      return 'Network subset personalization PIN required';
    case '43':
      return 'Network subset personalization PUK required';
    case '44':
      return 'Service provider personalization PIN required';
    case '45':
      return 'Service provider personalization PUK required';
    case '46':
      return 'Corporate personalization PIN required';
    case '47':
      return 'Corporate personalization PUK required';
    case '901':
      return 'Audio unknown error';
    case '902':
      return 'Audio invalid parameters';
    case '903':
      return 'Audio operation not supported';
    case '904':
      return 'Audio device busy';
    default:
      return `Unknown ${code} error code`;
  }
}

const cmsErrCodeToDesc = (code: string) => {
  switch (code) {
    case '300':
      return 'ME failure';
    case '301':
      return 'SMS ME reserved';
    case '302':
      return 'Operation not allowed';
    case '303':
      return 'Operation not supported';
    case '304':
      return 'Invalid PDU mode';
    case '305':
      return 'Invalid text mode';
    case '310':
      return 'SIM not inserted';
    case '311':
      return 'SIM pin necessary';
    case '312':
      return 'PH SIM pin necessary';
    case '313':
      return 'SIM failure';
    case '314':
      return 'SIM busy';
    case '315':
      return 'SIM wrong';
    case '316':
      return 'SIM PUK required';
    case '317':
      return 'SIM PIN2 required';
    case '318':
      return 'SIM PUK2 required';
    case '320':
      return 'Memory failure';
    case '321':
      return 'Invalid memory index';
    case '322':
      return 'Memory full';
    case '330':
      return 'SMSC address unknown';
    case '331':
      return 'No network';
    case '332':
      return 'Network timeout';
    case '500':
      return 'Unknown';
    case '512':
      return 'SIM not ready';
    case '513':
      return 'Message length exceeds';
    case '514':
      return 'Invalid request parameters';
    case '515':
      return 'ME storage failure';
    case '517':
      return 'Invalid service mode';
    case '528':
      return 'More message to send state error';
    case '529':
      return 'MO SMS is not allowed';
    case '530':
      return 'GPRS is suspended';
    case '531':
      return 'ME storage full';
    default:
      return 'Unknown error code';
  }
}

const parseData = (response: string) => {
  // if (response.substring(0, 8) === 'AT+CPIN?') {
  // if (response.match(/ATI\r\r\n\+CME ERROR: (\d+)\r\n/)) {
  if (response.indexOf('QGPSLOC') >= 0 && response.indexOf('ERROR') < 0) {
    // console.log(response)
  }

  const correctKeys = Object.keys(correctPattern)
  for (const key of correctKeys) {

    const correctMatches = response.match(correctPattern[key])
    if (correctMatches !== null) {
      if (key === 'moduleInformation')
        return {
          [key]: {
            'modelName': correctMatches[1].trim(),  // Extracted model name
            'revision': correctMatches[2].trim()    // Extracted revision
          }
        }
      if (key === 'moduleIMSI') return { [key]: { 'IMSI': correctMatches[1].trim() } }
      if (key === 'moduleIMEI') return { [key]: { 'IMEI': correctMatches[1].trim() } }
      if (key === 'simStatus') return { [key]: { 'status': correctMatches[1].trim() } }
      if (key === 'enableGPS') return { [key]: { 'status': 'OK' } }
      if (key === 'isGPSActive') return { [key]: { 'status': 'OK' } }
    }
  }

  const cmeErrorKeys = Object.keys(cmeErrorPattern)
  for (const key of cmeErrorKeys) {
    const errorMatches = response.match(cmeErrorPattern[key])

    if (errorMatches !== null) {
      if (key === 'moduleInformation') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
      if (key === 'moduleIMSI') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
      if (key === 'moduleIMEI') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
      if (key === 'simStatus') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
      if (key === 'enableGPS') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
      if (key === 'isGPSActive') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
    }
  }

  const cmsErrorKeys = Object.keys(cmsErrorPattern)
  for (const key of cmsErrorKeys) {
    const errorMatches = response.match(cmsErrorPattern[key])

    if (errorMatches !== null) {
      if (key === 'moduleInformation') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      if (key === 'moduleIMSI') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      if (key === 'moduleIMEI') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      if (key === 'simStatus') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      if (key === 'enableGPS') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      if (key === 'isGPSActive') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
    }
  }

  return false
}

@Injectable()
export class ProbService implements OnModuleInit {
  private readonly logger = new Logger(ProbService.name);
  private serialPort: { [key: string]: SerialPort } = {};
  private selectedGPSPort: number;
  private selectedGPSIMEI: string;
  private enableGPS: boolean = false;

  constructor(
    @InjectRepository(Quectel) private quectelsRepo: Repository<Quectel>,
    @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>
  ) {
    this.allPortsInitializing()
  }

  async onModuleInit() {
    const tableName = this.quectelsRepo.metadata.tableName

    // Truncate table using raw SQL query
    await this.quectelsRepo.query(`TRUNCATE TABLE ${tableName}`);
  }

  singlePortInitilizing(portNumber: number) {
    if (this.serialPort[`ttyUSB${portNumber}`]) {
      this.serialPort[`ttyUSB${portNumber}`].close(err => {
        if (err) {
          this.logger.error(`Error closing port ${portNumber}:`, err.message);
        } else {
          this.logger.log(`Port ${portNumber} closed`);

          // Reopen the port
          this.serialPort[`ttyUSB${portNumber}`].open();
        }
      })
    }
    else {
      const port = new SerialPort({ path: `/dev/ttyUSB${portNumber}`, baudRate: 115200 }); // baudRate: 9600
      port.on('open', async () => {
        this.logger.warn(`ttyUSB${portNumber} port opened`);
        port.write(commands.getModuleInfo)
      })

      port.on('data', async (data) => {
        const response = data.toString()

        if (this.enableGPS) {
          if (!this.selectedGPSPort) {
            if (response.includes('$GPGGA') || response.includes('$GPRMC')) {
              // Extract GPS data from the GGA sentence
              const ggaData = parseGGA(response);
              const rmcData = parseRMC(response);

              if ((ggaData['latitude'] !== null && ggaData['latitude'] !== 'NaN' && ggaData['latitude'] !== '') || (rmcData['latitude'] !== null && rmcData['latitude'] !== 'NaN' && rmcData['latitude'] !== '')) {
                this.quectelsRepo.update({ serialPortNumber: serialPortInterfaces.find(item => item.includes(portNumber))[2] }, { isGPSActive: 'OK' })
                this.quectelsRepo.update({ serialPortNumber: serialPortInterfaces.find(item => item.includes(portNumber))[3] }, { isGPSActive: 'OK' })
                this.quectelsRepo.update({ serialPortNumber: serialPortInterfaces.find(item => item.includes(portNumber))[2] }, { gpsEnabling: 'enabled' })
                this.quectelsRepo.update({ serialPortNumber: serialPortInterfaces.find(item => item.includes(portNumber))[3] }, { gpsEnabling: 'enabled' })
                this.selectedGPSPort = portNumber;

                const portsToDisableGPS = (serialPortInterfaces.filter(item => !item.includes(portNumber)).map(item => ([item[2], item[3]]))).flat(2)
                for (const port of portsToDisableGPS) {
                  this.serialPort[`ttyUSB${port}`].write(commands.disableGPS)
                  this.quectelsRepo.update({ serialPortNumber: port }, { gpsEnabling: 'disabled', isGPSActive: 'deactive' })
                }

                this.selectedGPSIMEI = (await this.quectelsRepo.findOne({ where: { serialPortNumber: serialPortInterfaces.find(item => item.includes(portNumber))[2] }, select: { IMEI: true } })).IMEI
              }
            }
          }
          else {
            if (portNumber === this.selectedGPSPort) {
              const ggaData = parseGGA(response);
              const rmcData = parseRMC(response);
              const gpsTime = ggaData.time || rmcData.time
              if (gpsTime && gpsTime !== '') {
                const gpsData = this.gpsDataRepo.upsert({
                  gpsTime: gpsTime,
                  latitude: ggaData.latitude || rmcData.latitude,
                  longitude: ggaData.longitude || rmcData.longitude,
                  altitude: ggaData.altitude,
                  groundSpeed: rmcData.groundSpeed,
                },
                  {
                    conflictPaths: ['gpsTime'],
                    skipUpdateIfNoValuesChanged: true
                  }
                )
              }
            }
          }
        }

        const parsedResponse = parseData(response)

        if (parsedResponse && parsedResponse['moduleInformation']) {
          if (parsedResponse['moduleInformation']['cmeErrorCode']) {
            const entry = await this.quectelsRepo.upsert(
              {
                modelName: cmeErrCodeToDesc(parsedResponse['moduleInformation']['cmeErrorCode']),
                revision: cmeErrCodeToDesc(parsedResponse['moduleInformation']['cmeErrorCode']),
                serialPortNumber: portNumber,
                fd: port.port.fd
              },
              {
                conflictPaths: ['id'],
                skipUpdateIfNoValuesChanged: true
              }
            )
            this.logger.verbose(entry.raw.insertId, parsedResponse['moduleInformation']['cmeErrorCode'])
          }
          else if (parsedResponse['moduleInformation']['cmsErrorCode']) {
            const entry = await this.quectelsRepo.upsert(
              {
                modelName: cmsErrCodeToDesc(parsedResponse['moduleInformation']['cmsErrorCode']),
                revision: cmsErrCodeToDesc(parsedResponse['moduleInformation']['cmsErrorCode']),
                serialPortNumber: portNumber,
                fd: port.port.fd
              },
              {
                conflictPaths: ['id'],
                skipUpdateIfNoValuesChanged: true
              }
            )
            this.logger.verbose(entry.raw.insertId, parsedResponse['moduleInformation']['cmeErrorCode'])
          }
          else {
            const entry = await this.quectelsRepo.upsert(
              {
                modelName: parsedResponse['moduleInformation']['modelName'],
                revision: parsedResponse['moduleInformation']['revision'],
                serialPortNumber: portNumber,
                fd: port.port.fd
              },
              {
                conflictPaths: ['id'],
                skipUpdateIfNoValuesChanged: true
              }
            )
            this.logger.verbose(entry.raw.insertId)
          }

          port.write(commands.getModuleIMEI)
        }

        if (parsedResponse && parsedResponse['moduleIMEI']) {
          if (parsedResponse['moduleIMEI']['cmeErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMEI: cmeErrCodeToDesc(parsedResponse['moduleIMEI']['cmeErrorCode']) },
            )
            this.logger.verbose(cmeErrCodeToDesc(parsedResponse['moduleIMEI']['cmeErrorCode']))
          }
          else if (parsedResponse['moduleIMEI']['cmsErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMEI: cmsErrCodeToDesc(parsedResponse['moduleIMEI']['cmsErrorCode']) },
            )
            this.logger.verbose(cmsErrCodeToDesc(parsedResponse['moduleIMEI']['cmsErrorCode']))
          }
          else {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMEI: parsedResponse['moduleIMEI']['IMEI'] },
            )
            this.logger.debug(parsedResponse['moduleIMEI']['IMEI'])
          }

          port.write(commands.getSimIMSI)
        }

        if (parsedResponse && parsedResponse['moduleIMSI']) {
          if (parsedResponse['moduleIMSI']['cmeErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMSI: cmeErrCodeToDesc(parsedResponse['moduleIMSI']['cmeErrorCode']) },
            )
            this.logger.verbose(cmeErrCodeToDesc(parsedResponse['moduleIMSI']['cmeErrorCode']))
          }
          else if (parsedResponse['moduleIMSI']['cmsErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMSI: cmsErrCodeToDesc(parsedResponse['moduleIMSI']['cmsErrorCode']) },
            )
            this.logger.verbose(cmsErrCodeToDesc(parsedResponse['moduleIMSI']['cmsErrorCode']))
          }
          else {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { IMSI: parsedResponse['moduleIMSI']['IMSI'] },
            )
            this.logger.debug(parsedResponse['moduleIMSI']['IMSI'])
          }

          port.write(commands.getSimStatus)
        }

        if (parsedResponse && parsedResponse['simStatus']) {
          if (parsedResponse['simStatus']['cmeErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { simStatus: cmeErrCodeToDesc(parsedResponse['simStatus']['cmeErrorCode']) },
            )
            this.logger.verbose(cmeErrCodeToDesc(parsedResponse['simStatus']['cmeErrorCode']))
          }
          else if (parsedResponse['simStatus']['cmsErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { simStatus: cmsErrCodeToDesc(parsedResponse['simStatus']['cmsErrorCode']) },
            )
            this.logger.verbose(cmsErrCodeToDesc(parsedResponse['simStatus']['cmsErrorCode']))
          }
          else {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { simStatus: parsedResponse['simStatus']['status'] },
            )
            this.logger.debug(parsedResponse['simStatus']['status'])
          }

          port.write(commands.enableGPS)
        }

        if (parsedResponse && parsedResponse['enableGPS']) {
          if (parsedResponse['enableGPS']['cmeErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { gpsEnabling: cmeErrCodeToDesc(parsedResponse['enableGPS']['cmeErrorCode']) },
            )
            this.logger.verbose(cmeErrCodeToDesc(parsedResponse['enableGPS']['cmeErrorCode']))
          }
          else if (parsedResponse['enableGPS']['cmsErrorCode']) {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { gpsEnabling: cmsErrCodeToDesc(parsedResponse['enableGPS']['cmsErrorCode']) },
            )
            this.logger.verbose(cmsErrCodeToDesc(parsedResponse['enableGPS']['cmsErrorCode']))
          }
          else {
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { gpsEnabling: parsedResponse['enableGPS']['status'] },
            )
            this.logger.debug(parsedResponse['enableGPS']['status'])

            // port.write(commands.getCurrentLoc)
          }
        }



      });

      port.on('error', (err) => {
        this.logger.error(`Error on port ${portNumber}: ${err.message}`);
      });

      this.serialPort[`ttyUSB${portNumber}`] = port
    }
  }

  allPortsInitializing() {
    for (let i = 0; i < serialPortCount; i++) {
      if (!this.serialPort[`ttyUSB${i}`]) {
        this.singlePortInitilizing(i)
      }
    }
  }

  async findAllModules() {
    return Object.keys(this.serialPort).map(item => ({ [item]: this.serialPort[item].port }))
  }

  runATCommand(portNumber: number, command: string) {
    return this.serialPort[`ttyUSB${portNumber}`].write(`${command}\r\n`)
  }

  async getModulesStatus() {
    const allEntries = (
      await this.quectelsRepo
        .createQueryBuilder()
        .select(['serialPortNumber', 'modelName', 'IMEI', 'IMSI', 'simStatus', 'isGPSActive'])
        .groupBy('IMEI')
        .orderBy('modelName', 'DESC')
        .getRawMany()
    )
      .sort((a: Quectel, b: Quectel) => {
        // 'EP06' should always come first
        if (a.modelName === 'EP06' && b.modelName !== 'EP06') return -1;
        if (a.modelName !== 'EP06' && b.modelName === 'EP06') return 1;

        // For other model names, follow the original sorting logic
        if (a.modelName < b.modelName) return -1;
        if (a.modelName > b.modelName) return 1;

        // Secondary sorting based on isGPS
        if (a.isGPSActive && !b.isGPSActive) return -1;
        if (!a.isGPSActive && b.isGPSActive) return 1;

        return 0; // Default: elements are considered equal
      });

    return allEntries
  }

  enablingGPS() {
    this.enableGPS = true;
    return true
  }

  async startLog(type: logLocationType, code: string, expert: string) {
    let allEntries = await this.quectelsRepo.find()
    const toReinitiatePorts = serialPortInterfaces.filter(ports => ports.filter(port => allEntries.map(item => item.serialPortNumber).includes(port)).length < 2).map(ports => ports.filter(port => !allEntries.map(item => item.serialPortNumber).includes(port)))

    for (const ports of toReinitiatePorts) {
      for (const port of ports) {
        this.singlePortInitilizing(port)
      }
    }

    allEntries = await this.getModulesStatus()

    if (allEntries.filter(entry => entry.simStatus === 'READY').length === 8) {
      let scenarios = [scenarioName.GSMIdle, scenarioName.WCDMAIdle, scenarioName.LTEIdle, scenarioName.ALLTechIdle, scenarioName.GSMLongCall, scenarioName.WCDMALongCall, scenarioName.FTP_DL_TH, scenarioName.FTP_UP_TH]


      const map = allEntries.reduce((p, c) => {
        if (c.modelName === 'EP06' && scenarios.includes(scenarioName.WCDMAIdle)) {
          scenarios = scenarios.filter(item => item !== scenarioName.WCDMAIdle)
          return {
            ...p,
            [c.IMEI]: scenarioName.WCDMAIdle
          }
        }
        else if (c.modelName === 'EP06' && scenarios.includes(scenarioName.WCDMALongCall)) {
          scenarios = scenarios.filter(item => item !== scenarioName.WCDMALongCall)
          return {
            ...p,
            [c.IMEI]: scenarioName.WCDMALongCall
          }
        }
        else {
          const select = scenarios[0]
          scenarios = scenarios.filter(item => item !== select)
          return {
            ...p,
            [c.IMEI]: select
          }
        }
      }, {})

      for (const imei of Object.keys(map)) {
        await this.quectelsRepo.update({ IMEI: imei }, { activeScenario: map[imei] })
      }

      allEntries = await this.getModulesStatus()

      for (const module of allEntries) {

      }

    }

    return allEntries
    // check module types

    // start scenario
  }

  gsmLockIdle(port: SerialPort) { }


  create(createProbDto: CreateProbDto) {
    return 'This action adds a new prob';
  }

  findOne(id: number) {
    return `This action returns a #${id} prob`;
  }

  update(id: number, updateProbDto: UpdateProbDto) {
    return `This action updates a #${id} prob`;
  }

  remove(id: number) {
    return `This action removes a #${id} prob`;
  }
}
