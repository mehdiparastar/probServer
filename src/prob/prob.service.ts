import { Injectable, Logger } from '@nestjs/common';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { SerialPort } from 'serialport';
import { logLocationType } from './enum/logLocationType.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quectel } from './entities/quectel.entity';
import { commands } from './enum/commands.enum';

const serialPortCount = 32

const correctPattern = {
  'moduleInformation': /ATI\r\r\nQuectel\r\n([^]+)\r\nRevision: ([^\r\n\r\n]+)/,
  'moduleIMSI': /AT\+CIMI\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CPIN: (\w+)\r\n\r\nOK\r\n/,
}

const cmeErrorPattern = { //indicates an error related to mobile equipment or network.
  'moduleInformation': /ATI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMSI': /AT\+CIMI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n\+CME ERROR: (\d+)\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CME ERROR: (\d+)\r\n/,
  // 'cmeERR': /ATI\r\r\n\+CME ERROR: (\d+)\r\n/,
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
      return 'Unknown error code';
  }
}

const parseData = (response: string) => {
  // if (response.substring(0, 8) === 'AT+CPIN?') {
  if (response.match(/ATI\r\r\n\+CME ERROR: (\d+)\r\n/)) {
    console.log(response)
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
    }
  }

  return false
}

@Injectable()
export class ProbService {
  private readonly logger = new Logger(ProbService.name);
  private serialPort: { [key: string]: SerialPort } = {};

  constructor(@InjectRepository(Quectel) private quectelsRepo: Repository<Quectel>) {
    this.allPortsInitializing()
  }

  singlePortInitilizing(portNumber: number) {
    const port = new SerialPort({ path: `/dev/ttyUSB${portNumber}`, baudRate: 115200 }); // baudRate: 9600
    port.on('open', () => {
      this.logger.warn(`ttyUSB${portNumber} port opened`);
      port.write(commands.getModuleInfo)
    })

    port.on('data', async (data) => {
      const response = data.toString()
      const parsedResponse = parseData(response)

      if (parsedResponse && parsedResponse['moduleInformation']) {
        this.logger.warn(`Received data in ttyUSB${portNumber}: ${parsedResponse['moduleInformation']['modelName']} - fd: ${port.port.fd}`);

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
        else {
          const entry = await this.quectelsRepo.update(
            { serialPortNumber: portNumber },
            { simStatus: parsedResponse['simStatus']['status'] },
          )
          this.logger.debug(parsedResponse['simStatus']['status'])
        }

        // -------------------------------------------------
      }
    });

    port.on('error', (err) => {
      this.logger.error(`Error on port ${portNumber}: ${err.message}`);
    });

    this.serialPort[`ttyUSB${portNumber}`] = port
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

  async startLog(type: logLocationType, code: string, expert: string) {
    let allEntries = await this.quectelsRepo.find()
    for (let i = 0; i < serialPortCount; i++) {
      // registering serial ports.
      if (this.serialPort[`ttyUSB${i}`])
        this.logger.log(this.serialPort[`ttyUSB${i}`].port.openOptions.lock)
      if (!allEntries.map(item => item.serialPortNumber).includes(i)) {
        this.singlePortInitilizing(i)
      }
    }
    allEntries = await this.quectelsRepo.find()
    return allEntries.map(item => item.serialPortNumber)
    // check module types

    // start scenario
  }






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
