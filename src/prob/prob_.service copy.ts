import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { SerialPort } from 'serialport';
import { logLocationType } from './enum/logLocationType.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository, Not, IsNull, Raw, And } from 'typeorm';
import { Quectel } from './entities/quectel.entity';
import { commands } from './enum/commands.enum';
import { scenarioName } from './enum/scenarioName.enum';
import { GPSData } from './entities/gps-data.entity';
import { User } from './entities/user.entity';
import { Inspection } from './entities/inspection.entity';
import { GSMIdle } from './entities/gsmIdle.entity';
import { WCDMAIdle } from './entities/wcdmaIdle.entity';
import { LTEIdle } from './entities/lteIdle.entity';
import { Like } from 'typeorm'
import { ALLTECHIdle } from './entities/alltechIdle.entity';
import { GSMLongCall } from './entities/gsmLongCall.entity';
import { callStatus } from './enum/callStatus.enum';
import { WCDMALongCall } from './entities/wcdmaLongCall.entity';
import { FTPDL } from './entities/ftpDL.entity';
import { FTPUL } from './entities/ftpUL.entity';
import * as fs from 'fs';
import { ONEMBFILE } from './ONEMBTEXTFILE'
import { isNotEmptyObject } from 'class-validator';
import { GPSService } from './gps.service';

const serialPortCount = 32

const WAIT_TO_NEXT_COMMAND_IN_MILISECOND = 600

const serialPortInterfaces = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31]]


const correctPattern = {
  // 'moduleInformation': /ATI\r\r\nQuectel\r\n([^]+)\r\nRevision: ([^\r\n\r\n]+)/,
  'moduleInformation': /.*([^]+)\r\nRevision: ([^\r\n\r\n]+).*/,
  // 'moduleIMSI': /AT\+CIMI\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'moduleIMSI': /.*CIMI\r\r\n(\d+).*/,
  // 'moduleIMEI': /AT\+CGSN\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'moduleIMEI': /.*CGSN\r\r\n(\d+).*/,
  // 'simStatus': /AT\+CPIN\?\r\r\n\+CPIN: (\w+)\r\n\r\nOK\r\n/,
  'simStatus': /.*CPIN: (\w+).*/,
  // 'enableGPS': /AT\+QGPS=1\r\r\n(\w+)\r\n/,
  'enableGPS': /.*QGPS=1\r\r\n(\w+).*/,
  // 'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+QGPSLOC: ([\d.]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+),(\d+),([\d.]+),([\d.]+),([\d.]+),(\d+),(\d+)\r\n\r\nOK\r\n/,
  'isGPSActive': /.*QGPSLOC: ([\d.]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+),(\d+),([\d.]+),([\d.]+),([\d.]+),(\d+),(\d+).*/,
  'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\nOK\r\n/,
  'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\nOK\r\n/,
  'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\nOK\r\n/,
  'allTech': /AT\+QCFG="nwscanmode",0\r\r\nOK\r\n/,
  'getGSMNetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(\w+)","(\w+)",(\d+),(\d+),(\d+),(\w+),(\d+),(\d+),([-]|\w+),(-?\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),"([-]|\w+)"\r\n\r\nOK\r\n/,
  // 'AT+QENG="servingcell";\r\r\n+QENG: "servingcell","LIMSRV","GSM",432,11,587,293A,31,98,-,-63,255,255,0,43,43,1,-,-,-,-,-,-,-,-,-,"-"\r\n\r\nOK\r\n'
  'getWCDMANetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+)/,
  //'AT+QENG="servingcell";\r\r\n+QENG: "servingcell","LIMSRV","WCDMA",432,35,584E,12DBAE3,10662,452,1,-70,-4,-,-,-,-,-\r\n\r\nOK\r\n'
  // 'getLTENetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(-?\w+)","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+)/,
  'getLTENetworkParameters': /.*QENG: "servingcell","(-?\w+)","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-w+?|-?).*/,
  //                         \r\n+QENG: "servingcell","NOCONN","LTE","FDD",432,11,6427D03,220,3300,7,5,5,866B,-98,-12,-64,8,-\r\n\r\nOK\r\n
  // AT+QENG="servingcell";\r\r\n+QENG: "servingcell","NOCONN","LTE","FDD",432,11,6442235,354,3102,7,5,5,866B,-97,-13,-64,3,22\r\n\r\nOK\r\n
  // AT+QENG="servingcell";\r\r\n+QENG: "servingcell","NOCONN","LTE","FDD",432,35,1E77017,456,2850,7,5,5,584E,-100,-17,-62,-1,23\r\n\r\nOK\r\n
  'getCallStatus': /AT\+CPAS\r\r\n\+CPAS: (\d+)\r\n\r\nOK\r\n/,
  // 'AT+CPAS\r\r\n+CPAS: 4\r\n\r\nOK\r\n'
  'getCurrentAPN': /AT\+CGDCONT\?\r\r\n\+CGDCONT: (\d+),"(\w+)","(\w+)","(\d+.\d+.\d+.\d+)",.*\r\n\r\nOK\r\n|.*\+CGDCONT: (\d+),"(\w+)","(\w+)","(\d+.\d+.\d+.\d+)",.*/,
  'setMCIConfigureAPN': '.*CGDCONT.*mcinet.*OK.*',
  'getDataConnectivityStatus': /AT\+QIACT\?\r\r\n\+QIACT: (\d+),(\d+),(\d+),"(\d+.\d+.\d+.\d+)".*\r\n|AT\+QIACT\?\r\r\nOK\r\n/,
  'getFtpStat': /.*QFTPSTAT: 0,(\d+).*/,
  'ftpGetComplete': /.*QFTPGET: 0,(\d+).*/,
  // 'ftpGetComplete': /\r\n\+QFTPGET: 0,(\d+)\r\n/,
  'getMCIFTPDownloadedFileSize': /.*\r\n\+QFLST: "UFS:QuectelMSDocs.zip",(\d+)\r\n\r\nOK\r\n/,
  // 'getMCIFTPDownloadedFileSize': /.*QFLST: "UFS:QuectelMSDocs.zip",(\d+).*/,
  // 'AT+QFLST="UFS:QuectelMSDocs.zip"\r\r\n+QFLST: "UFS:QuectelMSDocs.zip",57897070\r\n\r\nOK\r\n'
  // \r\n+QFLST: "UFS:QuectelMSDocs.zip",57897070\r\n\r\nOK\r\n
  // 'getMCIFTPFile': /AT\+QFTPGET=".\/Upload\/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\nOK\r\n/,
  //AT+QFTPGET="./Upload/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\n+CME ERROR: 603\r\n
  // 'setMCIFTPGETCURRENTDIRECTORY': /.*\r\n\+QFTPCWD: (\d+),(\d+)\r\n/,
  'setMCIFTPGETCURRENTDIRECTORY': /.*QFTPCWD: (\d+),(\d+).*/,
  // \r\n+QFTPCWD: 0,0\r\n

  // 'turnOffData': /AT\+QIDEACT=1\r\r\nOK\r\n/,
  'turnOffData': /.*QIDEACT=1.*/,
  'turnOnData': /AT\+QIACT=1\r\r\nOK\r\n|.*QIACT=1.*/,
  'attachNetwork': /AT\+CGATT=1\r\r\nOK\r\n|.*CGATT=1.*/,
  'dettachNetwork': /AT\+CGATT=0\r\r\nOK\r\n|.*CGATT=0.*/,
  'setMCIAPN': /AT\+QICSGP=1,1,"mcinet","","",1\r\r\nOK\r\n/,
  'setFTPContext': /AT\+QFTPCFG="contextid",1\r\r\nOK\r\n/,
  'setMCIFTPAccount': /AT\+QFTPCFG="account","mci","SIM!mci2020"\r\r\nOK\r\n/,
  'setFTPGETFILETYPE': /AT\+QFTPCFG="filetype",1\r\r\nOK\r\n/,
  'setFTPGETFILETRANSFERMODE': /AT\+QFTPCFG="transmode",1\r\r\nOK\r\n/,
  'setFTPGETTIMEOUT': /AT\+QFTPCFG="rsptimeout",90\r\r\nOK\r\n/,
  'openMCIFTPConnection': /.*\r\n\+QFTPOPEN: (\d+),(\d+)\r\n/,
  'getMCIFTPFile': /.*QFTPGET=.*"UFS:QuectelMSDocs.zip.*/,
  'openFileToWrite': /.*QFOPEN: (\d+).*/,
  'writeToFile': /.*QFWRITE: (\d+),(\d+)/,
  'getPacketDataCounter': /.*QGDCNT: (\d+),(\d+).*/
}

const cmeErrorPattern = {
  'moduleInformation': /ATI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMSI': /AT\+CIMI\r\r\n\+CME ERROR: (\d+)\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n\+CME ERROR: (\d+)\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CME ERROR: (\d+)\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n\+CME ERROR: (\d+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+CME ERROR: (\d+)\r\n/,
  'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\n\+CME ERROR: (\d+)\r\n/,
  'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\n\+CME ERROR: (\d+)\r\n/,
  'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\n\+CME ERROR: (\d+)\r\n/,
  'allTech': /AT\+QCFG="nwscanmode",0\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getGSMNetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getWCDMANetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getLTENetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getCallStatus': /AT\+CPAS\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getCurrentAPN': /AT\+CGDCONT\?\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getDataConnectivityStatus': /AT\+QIACT\?\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getFtpStat': /AT\+QFTPSTAT\r\r\n\+CME ERROR: (\d+)\r\n/,
  'getMCIFTPFile': /AT\+QFTPGET=".\/Upload\/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\n\+CME ERROR: (\d+)\r\n/
}

const cmsErrorPattern = {
  'moduleInformation': /ATI\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'moduleIMSI': /AT\+CIMI\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'allTech': /AT\+QCFG="nwscanmode",0\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getGSMNetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getWCDMANetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getLTENetworkParameters': /AT\+QENG="servingcell";\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getCallStatus': /AT\+CPAS\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getCurrentAPN': /AT\+CGDCONT\?\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getDataConnectivityStatus': /AT\+QIACT\?\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getFtpStat': /AT\+QFTPSTAT\r\r\n\+CMS ERROR: (\d+)\r\n/,
  'getMCIFTPFile': /AT\+QFTPGET=".\/Upload\/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\n\+CMS ERROR: (\d+)\r\n/
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

const sleep = async (milisecond: number) => {
  await new Promise(resolve => setTimeout(resolve, milisecond))
}

async function printTimeReverse(endTimeInSeconds) {
  for (let time = endTimeInSeconds; time >= 0; time--) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust the delay if needed
    console.log(`Time remaining: ${time} seconds`);
  }
  console.log('End time reached!');
}

const makeCallCommand = (imsi: string) => {
  if (imsi.slice(0, 6).includes('43211')) {
    return commands.callMCI
  }
  if (imsi.slice(0, 6).includes('43235')) {
    return commands.callMTN
  }
  if (imsi.slice(0, 6).includes('43220')) {
    return commands.callRTL
  }
  return commands.callMCI
}


@Injectable()
export class ProbService implements OnModuleInit {
  private readonly logger = new Logger(ProbService.name);
  private serialPort: { [key: string]: SerialPort } = {};
  private selectedGPSPort: number;
  private gpsEnabled: boolean = false;
  private logStarted: boolean = false;
  private type: logLocationType
  private code: string
  private expert: User
  private inspection: Inspection
  private imsiDict: { [portNumber: string]: string } = {}
  private callingStatus: { [portNumber: string]: string } = {}

  private gpsTimeHelper: boolean = true

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  private ftpDLIntervalID: { [key: string]: boolean } = {} //{'interval_NodeJS.Timeout:true}

  private ftpDLNetworkParameter: { mcc?: string, mnc?: string, tech?: string } = {}
  private ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()

  private ftpDlPacketDataCounterBytedSent: number
  private ftpDlPacketDataCounterBytedRecv: number
  private ftpDlPacketDataCounterTime = (new Date()).getTime()
  private ftpDlFileCompleted: boolean = true
  private ftpDlRoundNumber: number = 0
  private prevFtpDlStat = '0'
  private ftpDlSizeInterval
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////

  private ftpULConnectionEstablishingProgressTime = (new Date()).getTime()
  private ftpUploadPreRequisits = false
  private ftpUploadFileHandle: number
  private ftpUploadWriteFileInterval: NodeJS.Timeout

  private callabilityChecked: boolean = false
  private callability = {}
  private quectelInit = {
    'p0': {}, 'p1': {}, 'p2': {}, 'p3': {},
    'p4': {}, 'p5': {}, 'p6': {}, 'p7': {},
    'p8': {}, 'p9': {}, 'p10': {}, 'p11': {},
    'p12': {}, 'p13': {}, 'p14': {}, 'p15': {},
    'p16': {}, 'p17': {}, 'p18': {}, 'p19': {},
    'p20': {}, 'p21': {}, 'p22': {}, 'p23': {},
    'p24': {}, 'p25': {}, 'p26': {}, 'p27': {},
    'p28': {}, 'p29': {}, 'p30': {}, 'p31': {},
  }


  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Quectel) private quectelsRepo: Repository<Quectel>,
    @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
    @InjectRepository(Inspection) private inspectionsRepo: Repository<Inspection>,
    @InjectRepository(GSMIdle) private gsmIdlesRepo: Repository<GSMIdle>,
    @InjectRepository(WCDMAIdle) private wcdmaIdlesRepo: Repository<WCDMAIdle>,
    @InjectRepository(LTEIdle) private lteIdlesRepo: Repository<LTEIdle>,
    @InjectRepository(ALLTECHIdle) private allTechIdlesRepo: Repository<ALLTECHIdle>,
    @InjectRepository(GSMLongCall) private gsmLongCallRepo: Repository<GSMLongCall>,
    @InjectRepository(WCDMALongCall) private wcdmaLongCallRepo: Repository<WCDMALongCall>,
    @InjectRepository(FTPDL) private ftpDLRepo: Repository<FTPDL>,
    @InjectRepository(FTPUL) private ftpULRepo: Repository<FTPUL>,
    private gpsService: GPSService
  ) {
  }

  parseData(response: string) {
    // if (response.substring(0, 8) === 'AT+CPIN?') {
    // if (response.match(/ATI\r\r\n\+CME ERROR: (\d+)\r\n/)) {
    // if (response.indexOf('nwscanmode') >= 0 && response.indexOf('ERROR') < 0) {
    // if (response.indexOf('nwscanmode') >= 0) {
    // if (response.indexOf('CPAS') >= 0) {
    //   const stop = true
    // }

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
        if (key === 'lockGSM') return { [key]: { 'status': 'GSM_LOCK_OK' } }
        if (key === 'getGSMNetworkParameters')
          return {
            [key]: {
              'tech': correctMatches[2].trim(),
              'mcc': correctMatches[3].trim(),
              'mnc': correctMatches[4].trim(),
              'lac': correctMatches[5].trim(),
              'cellid': correctMatches[6].trim(),
              'bsic': correctMatches[7].trim(),
              'arfcn': correctMatches[8].trim(),
              'bandgsm': correctMatches[9].trim(),
              'rxlev': correctMatches[10].trim(),
              'txp': correctMatches[11].trim(),
              'tla': correctMatches[12].trim(),
              'drx': correctMatches[13].trim(),
              'c1': correctMatches[14].trim(),
              'c2': correctMatches[15].trim(),
              'gprs': correctMatches[16].trim(),
              'tch': correctMatches[17].trim(),
              'ts': correctMatches[18].trim(),
              'ta': correctMatches[19].trim(),
              'maio': correctMatches[20].trim(),
              'hsn': correctMatches[21].trim(),
              'rxlevsub': correctMatches[22].trim(),
              'rxlevfull': correctMatches[23].trim(),
              'rxqualsub': correctMatches[24].trim(),
              'rxqualfull': correctMatches[25].trim(),
              'voicecodec': correctMatches[26].trim(),
            }
          }
        if (key === 'lockWCDMA') return { [key]: { 'status': 'WCDMA_LOCK_OK' } }
        if (key === 'getWCDMANetworkParameters')
          return {
            [key]: {
              'tech': correctMatches[2].trim(),
              'mcc': correctMatches[3].trim(),
              'mnc': correctMatches[4].trim(),
              'lac': correctMatches[5].trim(),
              'cellid': correctMatches[6].trim(),
              'uarfcn': correctMatches[7].trim(),
              'psc': correctMatches[8].trim(),
              'rac': correctMatches[9].trim(),
              'rscp': correctMatches[10].trim(),
              'ecio': correctMatches[11].trim(),
              'phych': correctMatches[12].trim(),
              'sf': correctMatches[13].trim(),
              'slot': correctMatches[14].trim(),
              'speech_code': correctMatches[15].trim(),
              'comMod': correctMatches[16].trim(),
            }
          }
        if (key === 'lockLTE') return { [key]: { 'status': 'LTE_LOCK_OK' } }
        if (key === 'getLTENetworkParameters')
          return {//"is_tdd","mcc","mnc","cellid","pcid","earfcn","freq_band_ind","ul_bandwidth","dl_bandwidth","tac","rsrp","rsrq","rssi","sinr","srxlev"
            [key]: {
              'tech': correctMatches[2].trim(),
              'is_tdd': correctMatches[3].trim(),
              'mcc': correctMatches[4].trim(),
              'mnc': correctMatches[5].trim(),
              'cellid': correctMatches[6].trim(),
              'pcid': correctMatches[7].trim(),
              'earfcn': correctMatches[8].trim(),
              'freq_band_ind': correctMatches[9].trim(),
              'ul_bandwidth': correctMatches[10].trim(),
              'dl_bandwidth': correctMatches[11].trim(),
              'tac': correctMatches[12].trim(),
              'rsrp': correctMatches[13].trim(),
              'rsrq': correctMatches[14].trim(),
              'rssi': correctMatches[15].trim(),
              'sinr': correctMatches[16].trim(),
              'srxlev': correctMatches[17].trim(),
            }
          }
        if (key === 'allTech') return { [key]: { 'status': 'ALL_TECH_OK' } }
        if (key === 'getCallStatus') return { [key]: { 'status': correctMatches[1].trim() } }
        if (key === 'getCurrentAPN') {
          return {
            [key]: {
              'cid': correctMatches[1] ? correctMatches[1].trim() : correctMatches[5].trim(),
              'PDPType': correctMatches[2] ? correctMatches[2].trim() : correctMatches[6].trim(),
              'APNName': correctMatches[3] ? correctMatches[3].trim() : correctMatches[7].trim(),
              'PDPAdd': correctMatches[4] ? correctMatches[4].trim() : correctMatches[8].trim(),
            }
          }
        }
        if (key === 'getDataConnectivityStatus')
          return {
            [key]: {
              'contextID': correctMatches[1]?.trim(),     // Integer type. The context ID. The range is 1-16
              'contextState': correctMatches[2]?.trim(),  // Integer type. The context state. 0 Deactivated, 1 Activated
              'contextType': correctMatches[3]?.trim(),   // Integer type. The protocol type. 1 IPV4, 2 IPV4V6
              'ipAddress': correctMatches[4]?.trim(),     // The local IP address after the context is activated.
            }
          }
        if (key === 'getFtpStat')
          return {
            [key]: {
              'ftpStat': correctMatches[1].trim(),
              // The current status of FTP(S) server
              //   0 Opening an FTP(S) server
              //   1 The FTP(S) server is opened and idle
              //   2 Transferring data with FTP(S) server
              //   3 Closing the FTP(S) server
              //   4 The FTP(S) server is closed
            }
          }
        if (key === 'ftpGetComplete') return { [key]: { 'transferlen': correctMatches[1].trim() } }
        if (key === 'getMCIFTPDownloadedFileSize') return { [key]: { 'transferlen': correctMatches[1].trim() } }
        if (key === 'setMCIFTPGETCURRENTDIRECTORY')
          return {
            [key]: {
              'err': correctMatches[1].trim(),
              'protocolError': correctMatches[2].trim()
            }
          }
        if (key === 'turnOffData') return { [key]: { 'status': 'OK' } }
        if (key === 'turnOnData') return { [key]: { 'status': 'OK' } }
        if (key === 'attachNetwork') return { [key]: { 'status': 'OK' } }
        if (key === 'dettachNetwork') return { [key]: { 'status': 'OK' } }
        if (key === 'setMCIConfigureAPN') return { [key]: { 'status': 'OK' } }
        if (key === 'setMCIAPN') return { [key]: { 'status': 'OK' } }
        if (key === 'setFTPContext') return { [key]: { 'status': 'OK' } }
        if (key === 'setMCIFTPAccount') return { [key]: { 'status': 'OK' } }
        if (key === 'setFTPGETFILETYPE') return { [key]: { 'status': 'OK' } }
        if (key === 'setFTPGETFILETRANSFERMODE') return { [key]: { 'status': 'OK' } }
        if (key === 'setFTPGETTIMEOUT') return { [key]: { 'status': 'OK' } }
        if (key === 'openMCIFTPConnection')
          return {
            [key]: {
              'err': correctMatches[1].trim(),
              'protocolError': correctMatches[2].trim()
            }
          }
        if (key === 'getMCIFTPFile') return { [key]: { 'status': 'OK' } }
        if (key === 'openFileToWrite') return { [key]: { 'filehandle': correctMatches[1].trim() } }
        if (key === 'writeToFile') return { [key]: { 'writtenLength': correctMatches[1].trim(), 'totalLength': correctMatches[2].trim() } }
        if (key === 'getPacketDataCounter') return { [key]: { 'bytesSent': correctMatches[1].trim(), 'bytesRecv': correctMatches[2].trim() } }
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
        if (key === 'lockGSM') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getGSMNetworkParameters') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'lockWCDMA') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getWCDMANetworkParameters') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'lockLTE') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getLTENetworkParameters') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'allTech') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getCallStatus') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getCurrentAPN') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getDataConnectivityStatus') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getFtpStat') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
        if (key === 'getMCIFTPFile') return { [key]: { 'cmeErrorCode': errorMatches[1].trim() } }
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
        if (key === 'lockGSM') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getGSMNetworkParameters') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'lockWCDMA') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getWCDMANetworkParameters') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'lockLTE') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getLTENetworkParameters') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'allTech') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getCallStatus') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getCurrentAPN') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getDataConnectivityStatus') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getFtpStat') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
        if (key === 'getMCIFTPFile') return { [key]: { 'cmsErrorCode': errorMatches[1].trim() } }
      }
    }

    // if itration tasks dont captured up to now : temprorarly until all tech regex added
    // if (response.indexOf('servingcell') >= 0 && response.indexOf('GPGSA') < 0) {
    //   return {
    //     ['getGSMNetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
    //     ['getWCDMANetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
    //     ['getLTENetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
    //   }
    // }

    return false
  }

  async saveFtpDLEntry_(roundNumber: number, transferLen: number, downloadCompleted: boolean) {
    const now = (new Date()).getTime()
    const speed = (transferLen - this.ftpDlPacketDataCounterBytedRecv) / (now - this.ftpDlPacketDataCounterTime)

    this.logger.log(`FTP DL Speed: ${speed} KB/s`)

    this.ftpDlPacketDataCounterBytedRecv = transferLen
    this.ftpDlPacketDataCounterTime = now

    const location = await this.gpsDataRepo
      .createQueryBuilder('gps_data')
      .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
      .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
      .setParameter('desiredCreatedAt', new Date())
      .getOne();

    const newEntry = this.ftpDLRepo.create({
      speed: speed,
      roundNumber: roundNumber,
      transferLen,
      downloadCompleted,
      inspection: this.inspection,
      location: location,
      mcc: this.ftpDLNetworkParameter.mcc,
      mnc: this.ftpDLNetworkParameter.mnc,
      tech: this.ftpDLNetworkParameter.tech,
    })

    const save = await this.ftpDLRepo.save(newEntry)

    this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
  }

  async onModuleInit() {
    const tableName = this.quectelsRepo.metadata.tableName

    // Truncate table using raw SQL query
    await this.gsmIdlesRepo.query(`delete from ${this.gsmIdlesRepo.metadata.tableName}`);
    await this.wcdmaIdlesRepo.query(`delete from ${this.wcdmaIdlesRepo.metadata.tableName}`);
    await this.lteIdlesRepo.query(`delete from ${this.lteIdlesRepo.metadata.tableName}`);
    await this.allTechIdlesRepo.query(`delete from ${this.allTechIdlesRepo.metadata.tableName}`);
    await this.gsmLongCallRepo.query(`delete from ${this.gsmLongCallRepo.metadata.tableName}`);
    await this.wcdmaLongCallRepo.query(`delete from ${this.wcdmaLongCallRepo.metadata.tableName}`);
    await this.ftpDLRepo.query(`delete from ${this.ftpDLRepo.metadata.tableName}`);
    await this.quectelsRepo.query(`delete from ${this.quectelsRepo.metadata.tableName}`);
    await this.inspectionsRepo.query(`delete from ${this.inspectionsRepo.metadata.tableName}`);
    await this.gpsDataRepo.query(`delete from ${this.gpsDataRepo.metadata.tableName}`);

    await this.gpsService.portsInitializing({} as Inspection)
    // await this.firstINIT()
  }

  async firstINIT() {
    await printTimeReverse(4);
    await this.quectelsRepo.insert([
      { serialPortNumber: 2 }, { serialPortNumber: 3 },
      { serialPortNumber: 6 }, { serialPortNumber: 7 },
      { serialPortNumber: 10 }, { serialPortNumber: 11 },
      { serialPortNumber: 14 }, { serialPortNumber: 15 },
      { serialPortNumber: 18 }, { serialPortNumber: 19 },
      { serialPortNumber: 22 }, { serialPortNumber: 23 },
      { serialPortNumber: 26 }, { serialPortNumber: 27 },
      { serialPortNumber: 30 }, { serialPortNumber: 31 },
    ])
    await printTimeReverse(4);

    this.logger.debug('start to initializing...')

    let tryInit: number = 0

    outerLoop: while (true) {
      tryInit = tryInit + 1;

      const init = await this.allPortsInitializing()

      const openedPorts = Object.entries(this.serialPort).map(([key, value]) => (value.isOpen ? Number(key.replace("ttyUSB", "")) : null)).filter(item => item !== null)
      //.map(([key, value]) => value ? (typeof (key) === typeof ("") ? key.replace("ttyUSB", "") : key) : undefined).filter(item => item !== undefined)

      //.filter(([key, value]) => value?.isOpen === true ? key : undefined).filter(item => item !== undefined)
      this.logger.log("@@@@@@@@@@@", JSON.stringify(openedPorts), "@@@@@@@@@@@")

      const count = await this.quectelsRepo.count({ where: { simStatus: 'READY' } })
      const allEntries = (await this.getModulesStatus()).filter(entry => entry.simStatus === 'READY').sort((a, b) => a.serialPortNumber - b.serialPortNumber)

      this.logger.warn(`\n\ninitializing try number is ${tryInit} and count is ${count} and allEntries count is ${allEntries.length}\n\n`)

      if (openedPorts.length === 32 && count === 16 && allEntries.length === 8) {

        this.logger.log('Testing Callability ...')

        if (!this.callabilityChecked) {
          innerLoop: while (true) {
            for (const item of allEntries) {

              if (!this.callability[`port_${item.serialPortNumber}`]) {

                this.logger.log(`Testing port ${item.serialPortNumber}...`)
                const port = this.serialPort[`ttyUSB${item.serialPortNumber}`]

                port.write(
                  makeCallCommand(this.imsiDict[`ttyUSB${item.serialPortNumber}`]),
                  async (err) => {
                    if (err) {
                      const entry = await this.quectelsRepo.update(
                        { serialPortNumber: item.serialPortNumber },
                        { callability: false },
                      )
                    }
                  })

                await sleep(3000)
                port.write(commands.getCallStatus)
                await sleep(2000)

              }

              if (Object.values(this.callability).filter(x => x === true).length === 8) {
                this.logger.warn('All Devices are callable.')
                this.callabilityChecked = true
                break innerLoop
              }
            }
          }
        }

        this.logger.log('set GPS Confs...')
        const gps = await this.enablingGPS()

        if (gps === true) {
          this.logger.warn('Prob is READY to START.')
          break outerLoop
        }
      }
    }
  }

  async singlePortInitilizing(portNumber: number) {
    if (this.serialPort[`ttyUSB${portNumber}`]) {
      this.serialPort[`ttyUSB${portNumber}`].close(async (err) => {
        if (err) {
          this.logger.error(`Error closing port ${portNumber}: ${err.message}`);
        } else {
          this.logger.log(`Port ${portNumber} closed`);

          // Reopen the port
          this.logger.log(`Reopening Port ${portNumber}`);
          this.serialPort[`ttyUSB${portNumber}`].open();
        }
      })
    }
    else {
      const port = new SerialPort({ path: `/dev/ttyUSB${portNumber}`, baudRate: 115200 }); // baudRate: 9600
      port.on('open', async () => {
        this.logger.warn(`ttyUSB${portNumber} port opened`);
        port.write(commands.automaticNetworkSelectionMode)
        await sleep(3000)
        port.write(commands.getModuleInfo)
        await sleep(500)
        port.write(commands.turnOffData)
        await sleep(300)
        port.write(commands.clearUFSStorage)
        await sleep(300)
        port.write(commands.moduleFullFunctionality)
      })

      port.on('data', async (data) => {
        const response = data.toString()

        if (response.indexOf('+QFTPGET: 627,150') >= 0) {
          if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
            port.write(commands.getMCIFTPFile)
          }
        }

        if (this.callabilityChecked === false) {
          const match = response.match(/.*CPAS: (\d+).*/)
          if (match && match[1] && match[1] === '4') {
            port.write(commands.hangUpCall)
            port.write(commands.hangUpCall)
            port.write(commands.hangUpCall)
            const imsi = this.imsiDict[`ttyUSB${portNumber}`]
            const entry = await this.quectelsRepo.update(
              { IMSI: imsi },
              { callability: true },
            )
            this.logger.log(`port ${portNumber} is callable.`)
            this.callability[`port_${portNumber}`] = true
          }
        }

        // #region debug section
        // if (response.indexOf('FTP') >= 0) {
        //   this.logger.error(JSON.stringify(response))
        // }

        // if (response !== '\r\n' && response.indexOf('GPGSA') < 0 && response.indexOf('GPRMC') < 0 && response.indexOf('GPGSV') < 0 && response.indexOf('GPVTG') < 0 && response.indexOf('GPGGA') < 0 && response.indexOf('servingcell') < 0) {
        //   this.logger.log(JSON.stringify(response))
        // }

        // if (response.indexOf('QFTPSTAT') >= 0) {
        //   const x = response.match(correctPattern.getFtpStat)
        //   this.logger.log('**************************************************')
        //   this.logger.verbose(JSON.stringify(x))
        //   this.logger.log('**************************************************')
        //   if (JSON.stringify(response) === JSON.stringify("AT+QFTPSTAT\r")) {
        //     port.write(commands.getFtpStat)
        //   }
        // }

        // if (response.indexOf('QFTPGET') >= 0) {
        //   const x = response.match(correctPattern.getMCIFTPFile)
        //   this.logger.log('**************************************************')
        //   this.logger.verbose(JSON.stringify(x),JSON.stringify(response))
        //   this.logger.log('**************************************************')
        // }
        // #endregion

        if (this.gpsEnabled) {
          if (!this.selectedGPSPort) {
            if (response.includes('$GPGGA') || response.includes('$GPRMC')) {
              // Extract GPS data from the GGA sentence
              const ggaData = parseGGA(response);
              const rmcData = parseRMC(response);

              if ((ggaData['latitude'] !== null && ggaData['latitude'] !== undefined && ggaData['latitude'] !== 'NaN' && ggaData['latitude'] !== '') || (rmcData['latitude'] !== null && rmcData['latitude'] !== undefined && rmcData['latitude'] !== 'NaN' && rmcData['latitude'] !== '')) {
                this.logger.warn(`recieved GPS data: ${ggaData['latitude']}, ${ggaData['latitude']} or ${rmcData['latitude']}, ${rmcData['latitude']}`)
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
              }
            }
          }
          else {
            if (portNumber === this.selectedGPSPort) {
              const ggaData = parseGGA(response);
              const rmcData = parseRMC(response);
              const gpsTime = ggaData.time || rmcData.time
              if (gpsTime && gpsTime !== '' && this.logStarted) {
                try {
                  if (this.gpsTimeHelper) {
                    this.gpsTimeHelper = false
                    const gpsData = await this.gpsDataRepo.upsert({
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
                    this.gpsTimeHelper = true
                  }
                }
                catch (ex) {
                  this.logger.error(ex.message)
                }
              }
            }
          }
        }

        const parsedResponse = this.parseData(response)

        // #region other events

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
            this.logger.verbose(`quectel entry added for port ${portNumber}. ${entry.raw.insertId} and module info is: ${parsedResponse['moduleInformation']['cmeErrorCode']}`)
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
            this.logger.verbose(`quectel entry added for port ${portNumber}. ${entry.raw.insertId} and module info is: ${parsedResponse['moduleInformation']['cmsErrorCode']}`)
          }
          else {
            // const entry = await this.quectelsRepo.upsert(
            //   {
            //     modelName: parsedResponse['moduleInformation']['modelName'],
            //     revision: parsedResponse['moduleInformation']['revision'],
            //     serialPortNumber: portNumber,
            //     fd: port.port.fd
            // },
            // {
            //   conflictPaths: ['id'],
            //   skipUpdateIfNoValuesChanged: true
            // }
            // )
            this.quectelInit[`p${portNumber}`]['modelName'] = parsedResponse['moduleInformation']['modelName']
            this.quectelInit[`p${portNumber}`]['revision'] = parsedResponse['moduleInformation']['revision']
            this.logger.verbose(`moduleInformation added for port ${portNumber}. moduleInformation was: ${JSON.stringify(parsedResponse['moduleInformation'])}`)
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
            // const entry = await this.quectelsRepo.update(
            //   { serialPortNumber: portNumber },
            //   { IMEI: parsedResponse['moduleIMEI']['IMEI'] },
            // )
            this.quectelInit[`p${portNumber}`]['IMEI'] = parsedResponse['moduleIMEI']['IMEI']
            this.logger.verbose(`moduleIMEI added for port ${portNumber}. moduleIMEI was: ${JSON.stringify(parsedResponse['moduleIMEI'])}`)
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
            // const entry = await this.quectelsRepo.update(
            //   { serialPortNumber: portNumber },
            //   { IMSI: parsedResponse['moduleIMSI']['IMSI'] },
            // )
            this.imsiDict[`ttyUSB${portNumber}`] = parsedResponse['moduleIMSI']['IMSI']
            this.quectelInit[`p${portNumber}`]['IMSI'] = parsedResponse['moduleIMSI']['IMSI']
            this.logger.verbose(`moduleIMSI added for port ${portNumber}.moduleIMSI was: ${JSON.stringify(parsedResponse['moduleIMSI'])}`)

            port.write(commands.getSimStatus)
          }
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
            // const entry = await this.quectelsRepo.update(
            //   { serialPortNumber: portNumber },
            //   { simStatus: parsedResponse['simStatus']['status'] },
            // )
            this.quectelInit[`p${portNumber}`]['simStatus'] = parsedResponse['simStatus']['status']
            this.logger.verbose(`simStatus added for port ${portNumber}. simStatus was: ${JSON.stringify(parsedResponse['simStatus'])}`)
            await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { ...this.quectelInit[`p${portNumber}`], fd: port.port.fd }
            )
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
          }
        }

        if (this.callabilityChecked === true) {

          ////////////////// GSM ///////////////////////////

          if (parsedResponse && parsedResponse['lockGSM']) {
            if (parsedResponse['lockGSM']['cmeErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `GSM lock error: ${cmeErrCodeToDesc(parsedResponse['lockGSM']['cmeErrorCode'])}` },
              )
              port.write(commands.lockGSM)
            }
            else if (parsedResponse['lockGSM']['cmsErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `GSM lock error: ${cmsErrCodeToDesc(parsedResponse['lockGSM']['cmsErrorCode'])}` },
              )
              port.write(commands.lockGSM)
            }
            else {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: parsedResponse['lockGSM']['status'] },
              )
            }
          }

          if (parsedResponse && parsedResponse['getGSMNetworkParameters']) {
            if (parsedResponse['getGSMNetworkParameters']['cmeErrorCode']) {
              port.write(commands.getGSMNetworkParameters)
            }
            else if (parsedResponse['getGSMNetworkParameters']['cmsErrorCode']) {
              port.write(commands.getGSMNetworkParameters)
            }
            else {
              const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario

              if (thisScenario === scenarioName.GSMIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.gsmIdlesRepo.create({
                    tech: parsedResponse.getGSMNetworkParameters.tech,
                    mcc: parsedResponse.getGSMNetworkParameters.mcc,
                    mnc: parsedResponse.getGSMNetworkParameters.mnc,
                    lac: parsedResponse.getGSMNetworkParameters.lac,
                    cellid: parsedResponse.getGSMNetworkParameters.cellid,
                    bsic: parsedResponse.getGSMNetworkParameters.bsic,
                    arfcn: parsedResponse.getGSMNetworkParameters.arfcn,
                    bandgsm: parsedResponse.getGSMNetworkParameters.bandgsm,
                    rxlev: parsedResponse.getGSMNetworkParameters.rxlev,
                    txp: parsedResponse.getGSMNetworkParameters.txp,
                    tla: parsedResponse.getGSMNetworkParameters.tla,
                    drx: parsedResponse.getGSMNetworkParameters.drx,
                    c1: parsedResponse.getGSMNetworkParameters.c1,
                    c2: parsedResponse.getGSMNetworkParameters.c2,
                    gprs: parsedResponse.getGSMNetworkParameters.gprs,
                    tch: parsedResponse.getGSMNetworkParameters.tch,
                    ts: parsedResponse.getGSMNetworkParameters.ts,
                    ta: parsedResponse.getGSMNetworkParameters.ta,
                    maio: parsedResponse.getGSMNetworkParameters.maio,
                    hsn: parsedResponse.getGSMNetworkParameters.hsn,
                    rxlevsub: parsedResponse.getGSMNetworkParameters.rxlevsub,
                    rxlevfull: parsedResponse.getGSMNetworkParameters.rxlevfull,
                    rxqualsub: parsedResponse.getGSMNetworkParameters.rxqualsub,
                    rxqualfull: parsedResponse.getGSMNetworkParameters.rxqualfull,
                    voicecodec: parsedResponse.getGSMNetworkParameters.voicecodec,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.gsmIdlesRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.ALLTechIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.gsmIdlesRepo.create({
                    tech: parsedResponse.getGSMNetworkParameters.tech,
                    mcc: parsedResponse.getGSMNetworkParameters.mcc,
                    mnc: parsedResponse.getGSMNetworkParameters.mnc,
                    lac: parsedResponse.getGSMNetworkParameters.lac,
                    cellid: parsedResponse.getGSMNetworkParameters.cellid,
                    bsic: parsedResponse.getGSMNetworkParameters.bsic,
                    arfcn: parsedResponse.getGSMNetworkParameters.arfcn,
                    bandgsm: parsedResponse.getGSMNetworkParameters.bandgsm,
                    rxlev: parsedResponse.getGSMNetworkParameters.rxlev,
                    txp: parsedResponse.getGSMNetworkParameters.txp,
                    tla: parsedResponse.getGSMNetworkParameters.tla,
                    drx: parsedResponse.getGSMNetworkParameters.drx,
                    c1: parsedResponse.getGSMNetworkParameters.c1,
                    c2: parsedResponse.getGSMNetworkParameters.c2,
                    gprs: parsedResponse.getGSMNetworkParameters.gprs,
                    tch: parsedResponse.getGSMNetworkParameters.tch,
                    ts: parsedResponse.getGSMNetworkParameters.ts,
                    ta: parsedResponse.getGSMNetworkParameters.ta,
                    maio: parsedResponse.getGSMNetworkParameters.maio,
                    hsn: parsedResponse.getGSMNetworkParameters.hsn,
                    rxlevsub: parsedResponse.getGSMNetworkParameters.rxlevsub,
                    rxlevfull: parsedResponse.getGSMNetworkParameters.rxlevfull,
                    rxqualsub: parsedResponse.getGSMNetworkParameters.rxqualsub,
                    rxqualfull: parsedResponse.getGSMNetworkParameters.rxqualfull,
                    voicecodec: parsedResponse.getGSMNetworkParameters.voicecodec,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.allTechIdlesRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.GSMLongCall) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.gsmLongCallRepo.create({
                    tech: parsedResponse.getGSMNetworkParameters.tech,
                    mcc: parsedResponse.getGSMNetworkParameters.mcc,
                    mnc: parsedResponse.getGSMNetworkParameters.mnc,
                    lac: parsedResponse.getGSMNetworkParameters.lac,
                    cellid: parsedResponse.getGSMNetworkParameters.cellid,
                    bsic: parsedResponse.getGSMNetworkParameters.bsic,
                    arfcn: parsedResponse.getGSMNetworkParameters.arfcn,
                    bandgsm: parsedResponse.getGSMNetworkParameters.bandgsm,
                    rxlev: parsedResponse.getGSMNetworkParameters.rxlev,
                    txp: parsedResponse.getGSMNetworkParameters.txp,
                    tla: parsedResponse.getGSMNetworkParameters.tla,
                    drx: parsedResponse.getGSMNetworkParameters.drx,
                    c1: parsedResponse.getGSMNetworkParameters.c1,
                    c2: parsedResponse.getGSMNetworkParameters.c2,
                    gprs: parsedResponse.getGSMNetworkParameters.gprs,
                    tch: parsedResponse.getGSMNetworkParameters.tch,
                    ts: parsedResponse.getGSMNetworkParameters.ts,
                    ta: parsedResponse.getGSMNetworkParameters.ta,
                    maio: parsedResponse.getGSMNetworkParameters.maio,
                    hsn: parsedResponse.getGSMNetworkParameters.hsn,
                    rxlevsub: parsedResponse.getGSMNetworkParameters.rxlevsub,
                    rxlevfull: parsedResponse.getGSMNetworkParameters.rxlevfull,
                    rxqualsub: parsedResponse.getGSMNetworkParameters.rxqualsub,
                    rxqualfull: parsedResponse.getGSMNetworkParameters.rxqualfull,
                    voicecodec: parsedResponse.getGSMNetworkParameters.voicecodec,
                    callingStatus: this.callingStatus[`ttyUSB${portNumber}`] === '4' ? callStatus.Dedicate : callStatus.Idle,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.gsmLongCallRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.FTP_DL_TH) {
                this.ftpDLNetworkParameter.mcc = parsedResponse.getGSMNetworkParameters.mcc;
                this.ftpDLNetworkParameter.mnc = parsedResponse.getGSMNetworkParameters.mnc;
                this.ftpDLNetworkParameter.tech = parsedResponse.getGSMNetworkParameters.tech;
              }
            }
          }

          ////////////////// WCDMA ///////////////////////////////

          if (parsedResponse && parsedResponse['lockWCDMA']) {
            if (parsedResponse['lockWCDMA']['cmeErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `WCDMA lock error: ${cmeErrCodeToDesc(parsedResponse['lockWCDMA']['cmeErrorCode'])}` },
              )
              port.write(commands.lockWCDMA)
            }
            else if (parsedResponse['lockWCDMA']['cmsErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `WCDMA lock error: ${cmsErrCodeToDesc(parsedResponse['lockWCDMA']['cmsErrorCode'])}` },
              )
              port.write(commands.lockWCDMA)
            }
            else {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: parsedResponse['lockWCDMA']['status'] },
              )
            }
          }

          if (parsedResponse && parsedResponse['getWCDMANetworkParameters']) {
            if (parsedResponse['getWCDMANetworkParameters']['cmeErrorCode']) {
              port.write(commands.getWCDMANetworkParameters)
            }
            else if (parsedResponse['getWCDMANetworkParameters']['cmsErrorCode']) {
              port.write(commands.getWCDMANetworkParameters)
            }
            else {
              const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario

              if (thisScenario === scenarioName.WCDMAIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.wcdmaIdlesRepo.create({
                    tech: parsedResponse.getWCDMANetworkParameters.tech,
                    mcc: parsedResponse.getWCDMANetworkParameters.mcc,
                    mnc: parsedResponse.getWCDMANetworkParameters.mnc,
                    lac: parsedResponse.getWCDMANetworkParameters.lac,
                    cellid: parsedResponse.getWCDMANetworkParameters.cellid,
                    uarfcn: parsedResponse.getWCDMANetworkParameters.uarfcn,
                    psc: parsedResponse.getWCDMANetworkParameters.psc,
                    rac: parsedResponse.getWCDMANetworkParameters.rac,
                    rscp: parsedResponse.getWCDMANetworkParameters.rscp,
                    ecio: parsedResponse.getWCDMANetworkParameters.ecio,
                    phych: parsedResponse.getWCDMANetworkParameters.phych,
                    sf: parsedResponse.getWCDMANetworkParameters.sf,
                    slot: parsedResponse.getWCDMANetworkParameters.slot,
                    speech_code: parsedResponse.getWCDMANetworkParameters.speech_code,
                    comMod: parsedResponse.getWCDMANetworkParameters.comMod,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.wcdmaIdlesRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.ALLTechIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.allTechIdlesRepo.create({
                    tech: parsedResponse.getWCDMANetworkParameters.tech,
                    mcc: parsedResponse.getWCDMANetworkParameters.mcc,
                    mnc: parsedResponse.getWCDMANetworkParameters.mnc,
                    lac: parsedResponse.getWCDMANetworkParameters.lac,
                    cellid: parsedResponse.getWCDMANetworkParameters.cellid,
                    uarfcn: parsedResponse.getWCDMANetworkParameters.uarfcn,
                    psc: parsedResponse.getWCDMANetworkParameters.psc,
                    rac: parsedResponse.getWCDMANetworkParameters.rac,
                    rscp: parsedResponse.getWCDMANetworkParameters.rscp,
                    ecio: parsedResponse.getWCDMANetworkParameters.ecio,
                    phych: parsedResponse.getWCDMANetworkParameters.phych,
                    sf: parsedResponse.getWCDMANetworkParameters.sf,
                    slot: parsedResponse.getWCDMANetworkParameters.slot,
                    speech_code: parsedResponse.getWCDMANetworkParameters.speech_code,
                    comMod: parsedResponse.getWCDMANetworkParameters.comMod,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.allTechIdlesRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.WCDMALongCall) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.wcdmaLongCallRepo.create({
                    tech: parsedResponse.getWCDMANetworkParameters.tech,
                    mcc: parsedResponse.getWCDMANetworkParameters.mcc,
                    mnc: parsedResponse.getWCDMANetworkParameters.mnc,
                    lac: parsedResponse.getWCDMANetworkParameters.lac,
                    cellid: parsedResponse.getWCDMANetworkParameters.cellid,
                    uarfcn: parsedResponse.getWCDMANetworkParameters.uarfcn,
                    psc: parsedResponse.getWCDMANetworkParameters.psc,
                    rac: parsedResponse.getWCDMANetworkParameters.rac,
                    rscp: parsedResponse.getWCDMANetworkParameters.rscp,
                    ecio: parsedResponse.getWCDMANetworkParameters.ecio,
                    phych: parsedResponse.getWCDMANetworkParameters.phych,
                    sf: parsedResponse.getWCDMANetworkParameters.sf,
                    slot: parsedResponse.getWCDMANetworkParameters.slot,
                    speech_code: parsedResponse.getWCDMANetworkParameters.speech_code,
                    comMod: parsedResponse.getWCDMANetworkParameters.comMod,
                    callingStatus: this.callingStatus[`ttyUSB${portNumber}`] === '4' ? callStatus.Dedicate : callStatus.Idle,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.wcdmaLongCallRepo.save(newEntry)
                }
              }
              if (thisScenario === scenarioName.FTP_DL_TH) {
                this.ftpDLNetworkParameter.mcc = parsedResponse.getWCDMANetworkParameters.mcc;
                this.ftpDLNetworkParameter.mnc = parsedResponse.getWCDMANetworkParameters.mnc;
                this.ftpDLNetworkParameter.tech = parsedResponse.getWCDMANetworkParameters.tech;
              }
            }
          }

          ////////////////// LTE ///////////////////////////////

          if (parsedResponse && parsedResponse['lockLTE']) {
            if (parsedResponse['lockLTE']['cmeErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `LTE lock error: ${cmeErrCodeToDesc(parsedResponse['lockLTE']['cmeErrorCode'])}` },
              )
              port.write(commands.lockLTE)
            }
            else if (parsedResponse['lockLTE']['cmsErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `LTE lock error: ${cmsErrCodeToDesc(parsedResponse['lockLTE']['cmsErrorCode'])}` },
              )
              port.write(commands.lockLTE)
            }
            else {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: parsedResponse['lockLTE']['status'] },
              )
            }
          }

          if (parsedResponse && parsedResponse['getLTENetworkParameters']) {
            if (parsedResponse['getLTENetworkParameters']['cmeErrorCode']) {
              port.write(commands.getLTENetworkParameters)
            }
            else if (parsedResponse['getLTENetworkParameters']['cmsErrorCode']) {
              port.write(commands.getLTENetworkParameters)
            }
            else {
              const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario

              if (thisScenario === scenarioName.LTEIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.lteIdlesRepo.create({
                    tech: parsedResponse.getLTENetworkParameters.tech,
                    is_tdd: parsedResponse.getLTENetworkParameters.is_tdd,
                    mcc: parsedResponse.getLTENetworkParameters.mcc,
                    mnc: parsedResponse.getLTENetworkParameters.mnc,
                    cellid: parsedResponse.getLTENetworkParameters.cellid,
                    pcid: parsedResponse.getLTENetworkParameters.pcid,
                    earfcn: parsedResponse.getLTENetworkParameters.earfcn,
                    freq_band_ind: parsedResponse.getLTENetworkParameters.freq_band_ind,
                    ul_bandwidth: parsedResponse.getLTENetworkParameters.ul_bandwidth,
                    dl_bandwidth: parsedResponse.getLTENetworkParameters.dl_bandwidth,
                    tac: parsedResponse.getLTENetworkParameters.tac,
                    rsrp: parsedResponse.getLTENetworkParameters.rsrp,
                    rsrq: parsedResponse.getLTENetworkParameters.rsrq,
                    rssi: parsedResponse.getLTENetworkParameters.rssi,
                    sinr: parsedResponse.getLTENetworkParameters.sinr,
                    srxlev: parsedResponse.getLTENetworkParameters.srxlev,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.lteIdlesRepo.save(newEntry)
                }
              }

              if (thisScenario === scenarioName.ALLTechIdle) {
                if (this.logStarted) {
                  const location = await this.gpsDataRepo
                    .createQueryBuilder()
                    .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 2000000') // One second has 1,000,000 microseconds
                    .orderBy('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt))', 'ASC')
                    .setParameter('desiredCreatedAt', new Date())
                    .getOne();

                  const newEntry = this.allTechIdlesRepo.create({
                    tech: parsedResponse.getLTENetworkParameters.tech,
                    is_tdd: parsedResponse.getLTENetworkParameters.is_tdd,
                    mcc: parsedResponse.getLTENetworkParameters.mcc,
                    mnc: parsedResponse.getLTENetworkParameters.mnc,
                    cellid: parsedResponse.getLTENetworkParameters.cellid,
                    pcid: parsedResponse.getLTENetworkParameters.pcid,
                    earfcn: parsedResponse.getLTENetworkParameters.earfcn,
                    freq_band_ind: parsedResponse.getLTENetworkParameters.freq_band_ind,
                    ul_bandwidth: parsedResponse.getLTENetworkParameters.ul_bandwidth,
                    dl_bandwidth: parsedResponse.getLTENetworkParameters.dl_bandwidth,
                    tac: parsedResponse.getLTENetworkParameters.tac,
                    rsrp: parsedResponse.getLTENetworkParameters.rsrp,
                    rsrq: parsedResponse.getLTENetworkParameters.rsrq,
                    rssi: parsedResponse.getLTENetworkParameters.rssi,
                    sinr: parsedResponse.getLTENetworkParameters.sinr,
                    srxlev: parsedResponse.getLTENetworkParameters.srxlev,
                    inspection: this.inspection,
                    location: location
                  })
                  const save = await this.allTechIdlesRepo.save(newEntry)
                }
              }

              if (thisScenario === scenarioName.FTP_DL_TH) {
                this.ftpDLNetworkParameter.mcc = parsedResponse.getLTENetworkParameters.mcc;
                this.ftpDLNetworkParameter.mnc = parsedResponse.getLTENetworkParameters.mnc;
                this.ftpDLNetworkParameter.tech = parsedResponse.getLTENetworkParameters.tech;
              }
            }
          }

          ////////////////// ALLTECH ///////////////////////////

          if (parsedResponse && parsedResponse['allTech']) {
            if (parsedResponse['allTech']['cmeErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `All Tech error: ${cmeErrCodeToDesc(parsedResponse['allTech']['cmeErrorCode'])}` },
              )
              port.write(commands.allTech)
            }
            else if (parsedResponse['allTech']['cmsErrorCode']) {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: `All Tech error: ${cmsErrCodeToDesc(parsedResponse['allTech']['cmsErrorCode'])}` },
              )
              port.write(commands.allTech)
            }
            else {
              const entry = await this.quectelsRepo.update(
                { serialPortNumber: portNumber },
                { lockStatus: parsedResponse['allTech']['status'] },
              )
            }
          }

          ////////////////// CALLSTATUS ////////////////////////

          if (parsedResponse && parsedResponse['getCallStatus']) {
            // we dont need to assess cme or cms error
            if (parsedResponse['getCallStatus']['status']) {
              this.callingStatus[`ttyUSB${portNumber}`] = parsedResponse['getCallStatus']['status']
              if (parsedResponse['getCallStatus']['status'] !== '4') {
                // module in Idle mode
                const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario
                if (thisScenario === scenarioName.GSMLongCall || thisScenario === scenarioName.WCDMALongCall) {
                  port.write(makeCallCommand(this.imsiDict[`ttyUSB${portNumber}`]))
                }
              }
            }
          }

          ////////////////// FTP DL ////////////////////////

          if (parsedResponse && parsedResponse['dettachNetwork']) {
            if (parsedResponse.dettachNetwork.status === 'OK') {

              await sleep(1000)
              port.write(commands.attachNetwork)
              this.logger.debug('attachNetwork')

              if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
                await sleep(1000)
                port.write(commands.setMCIConfigureAPN)
                await sleep(1000)
                port.write(commands.turnOffData)
              }

              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            }
          }

          if (parsedResponse && parsedResponse['attachNetwork']) {
            // if (parsedResponse.attachNetwork.status === 'OK') {
            //   if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
            //     await sleep(300)
            //     port.write(commands.setMCIConfigureAPN)
            //     this.logger.debug('setMCIConfigureAPN')
            //     await sleep(300)
            //     port.write(commands.turnOffData)
            //   }
            //   this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            // }
          }

          if (parsedResponse && parsedResponse['setMCIConfigureAPN']) {
            // if (parsedResponse.setMCIConfigureAPN.status === 'OK') {
            //   await sleep(300)
            //   port.write(commands.turnOffData)
            //   this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            //   this.logger.debug('turnOffData')
            // }
          }

          if (parsedResponse && parsedResponse['turnOffData']) {
            if (parsedResponse.turnOffData.status === 'OK') {
              const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } }))?.activeScenario
              if (thisScenario && thisScenario === scenarioName.FTP_DL_TH) {
                await sleep(300)
                port.write(commands.getCurrentAPN)
                this.logger.debug('getCurrentAPN')
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              }
            }
          }

          if ((parsedResponse && parsedResponse['getCurrentAPN'])) {
            if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
              if (parsedResponse.getCurrentAPN && parsedResponse.getCurrentAPN.APNName !== 'mcinet') {
                await sleep(300)
                port.write(commands.setMCIAPN)
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                this.logger.debug('setMCIAPN')
              }
              else {
                await sleep(300)
                port.write(commands.getDataConnectivityStatus)
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                this.logger.debug('getDataConnectivityStatus')
              }
            }
          }

          if (parsedResponse && parsedResponse['setMCIAPN']) {
            if (parsedResponse.setMCIAPN.status === 'OK') {
              await sleep(300)
              port.write(commands.getDataConnectivityStatus)
              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              this.logger.debug('getDataConnectivityStatus')
            }
          }

          if (parsedResponse && parsedResponse['getDataConnectivityStatus']) {
            if (parsedResponse.getDataConnectivityStatus.contextState !== '1') {
              await sleep(300)
              port.write(commands.turnOnData)
              this.logger.debug('turnOnData')
              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            }
            else {
              await sleep(2000)
              port.write(commands.setFTPContext)
              await sleep(300)
              port.write(commands.setMCIFTPAccount)
              await sleep(300)
              port.write(commands.setFTPGETFILETYPE)
              await sleep(300)
              port.write(commands.setFTPGETFILETRANSFERMODE)
              await sleep(300)
              port.write(commands.setFTPGETTIMEOUT)
              await sleep(300)

              const intervalId = setInterval(
                async () => {
                  port.write(commands.getFtpStat)
                  this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                }
                , 2500)

              this.ftpDLIntervalID[`interval_${intervalId}`] = true

              this.logger.debug('setFTPConfig')
            }
          }

          if (parsedResponse && parsedResponse['turnOnData']) {
            if (parsedResponse.turnOnData.status === 'OK') {
              await sleep(2000)
              port.write(commands.setFTPContext)
              await sleep(300)
              port.write(commands.setMCIFTPAccount)
              await sleep(300)
              port.write(commands.setFTPGETFILETYPE)
              await sleep(300)
              port.write(commands.setFTPGETFILETRANSFERMODE)
              await sleep(300)
              port.write(commands.setFTPGETTIMEOUT)
              await sleep(300)

              const intervalId = setInterval(
                async () => {
                  port.write(commands.getFtpStat)
                  this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                }
                , 2500)

              this.ftpDLIntervalID[`interval_${intervalId}`] = true

              this.logger.debug('setFTPConfig')
            }
          }

          if (parsedResponse && parsedResponse['getFtpStat']) {
            this.logger.verbose(`FTP STAT: prev-${this.prevFtpDlStat}, current-${parsedResponse.getFtpStat.ftpStat}, sizeIntervalId-${this.ftpDlSizeInterval}`)

            if (parsedResponse.getFtpStat.ftpStat !== '2') {
              clearInterval(this.ftpDlSizeInterval)
              this.ftpDlSizeInterval = undefined
            }

            if (this.prevFtpDlStat !== '2' && parsedResponse.getFtpStat.ftpStat === '2') {
              this.ftpDlRoundNumber = this.ftpDlRoundNumber + 1

              await sleep(100)
              this.serialPort[`ttyUSB${portNumber}`].write(commands.resetPacketDataCounter)
              this.ftpDlPacketDataCounterBytedRecv = 0
              this.ftpDlPacketDataCounterTime = (new Date()).getTime()
              this.logger.debug('resetPacketDataCounter')

              if (this.ftpDlSizeInterval !== undefined) {
                clearInterval(this.ftpDlSizeInterval)
                this.ftpDlSizeInterval = setInterval(() => {
                  port.write(commands.getPacketDataCounter)
                }, 800)
              }
              else {
                this.ftpDlSizeInterval = setInterval(() => {
                  port.write(commands.getPacketDataCounter)
                }, 800)
              }
            }

            if (parsedResponse.getFtpStat.ftpStat === '3') {
              port.write(commands.getFtpStat)
            }

            if (parsedResponse.getFtpStat.ftpStat === '4') {
              if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
                port.write(commands.openMCIFTPConnection)
                this.logger.debug('openMCIFTPConnection')
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              }
            }

            if (parsedResponse.getFtpStat.ftpStat === '1') {
              if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
                await sleep(300)
                port.write(commands.clearUFSStorage)

                await sleep(300)
                port.write(commands.fullTCPWindowSize)
                this.logger.debug('fullTCPWindowSize')

                await sleep(300)
                port.write(commands.getMCIFTPFile)
                this.logger.debug('getMCIFTPFile')
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              }
            }

            if (parsedResponse.getFtpStat.ftpStat === '2') {
              this.ftpDlFileCompleted = false;
              if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
                port.write(commands.getAllTechNetworkParameters)
                this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              }
            }

            this.prevFtpDlStat = parsedResponse.getFtpStat.ftpStat

          }

          if (parsedResponse && parsedResponse['openMCIFTPConnection']) {
            if (parsedResponse.openMCIFTPConnection.err === '0') {
              port.write(commands.setMCIFTPGETCURRENTDIRECTORY)
              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
              this.logger.log('setMCIFTPGETCURRENTDIRECTORY')
            }
            else {
              port.write(commands.openMCIFTPConnection)
            }
          }

          if (parsedResponse && parsedResponse['setMCIFTPGETCURRENTDIRECTORY']) {
            if (parsedResponse.setMCIFTPGETCURRENTDIRECTORY.err === '0' && parsedResponse.setMCIFTPGETCURRENTDIRECTORY.protocolError === '0') {
              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            }
            else {
              port.write(commands.setMCIFTPGETCURRENTDIRECTORY)
              this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
            }
          }

          if (parsedResponse && parsedResponse['getMCIFTPFile']) {
          }

          if (parsedResponse && parsedResponse['ftpGetComplete']) {

            this.ftpDlFileCompleted = true

            port.write(commands.getPacketDataCounter)

            this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()

            this.logger.log('Download completed')
          }

          if (parsedResponse && parsedResponse['getMCIFTPDownloadedFileSize']) {
          }

          if (parsedResponse && parsedResponse['getPacketDataCounter']) {
            if (this.logStarted) {
              this.logger.log(`downloaded length is: ${Number(parsedResponse.getPacketDataCounter.bytesRecv) / 1000} KB`)
              await this.saveFtpDLEntry_(
                this.ftpDlRoundNumber,
                Number(parsedResponse.getPacketDataCounter.bytesRecv),
                this.ftpDlFileCompleted
              )
              if (this.ftpDlFileCompleted) {
                port.write(commands.clearUFSStorage)
                this.logger.log('UFS storage cleared successfully')
              }
            }
          }

          // #endregion

          ////////////////// FTP UL ////////////////////////

          if (parsedResponse && parsedResponse['openFileToWrite']) {

            const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario

            if (thisScenario === scenarioName.FTP_UL_TH && parsedResponse.openFileToWrite.filehandle) {
              this.ftpUploadFileHandle = Number(parsedResponse.openFileToWrite.filehandle)
              port.write(`AT + QFWRITE=${parsedResponse.openFileToWrite.filehandle}, 50000000\r\n`)
              await sleep(500)
              const _50MBFILE = ONEMBFILE.repeat(51)
              this.logger.log('write to file started.')
              port.write(_50MBFILE)
              // this.ftpUploadWriteFileInterval = setInterval(() => {
              // }, 10)
            }
          }

          if (parsedResponse && parsedResponse['writeToFile']) {

            const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } })).activeScenario

            if (thisScenario === scenarioName.FTP_UL_TH && Number(parsedResponse.writeToFile.writtenLength) === 50000000) {
              // clearInterval(this.ftpUploadWriteFileInterval)
              port.write(`AT + QFCLOSE=${this.ftpUploadFileHandle}\r\n`)
              this.logger.log('write to file ended.')
            }
          }
        }
      });

      port.on('error', (err) => {
        this.logger.error(`Error on port ${portNumber}: ${err.message}`);
      });

      this.serialPort[`ttyUSB${portNumber}`] = port

    }
  }

  async allPortsInitializing() {
    let allEntries = await this.getModulesStatus()


    const correctEntries = await this.quectelsRepo.find({
      where: {
        // modelName: Not(IsNull()),
        modelName: And(Not(IsNull()), Raw(alias => `${alias} NOT LIKE '%CME%'`)),
        revision: Not(IsNull()),
        IMEI: Not(IsNull()),
        IMSI: Not(IsNull()),
        simStatus: Not(IsNull())
      }
    })

    const correctPorts = [
      ...correctEntries.map(item => item.serialPortNumber),
      ...Object.entries(this.serialPort)
        .map(([key, value]) => (value.isOpen ? Number(key.replace("ttyUSB", "")) : null))
        .filter(item => item !== null)
        .filter(item => [0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29].includes(item))
    ].sort((a, b) => a - b)

    const toReinitiatePorts =
      serialPortInterfaces
        .filter(ports => ports.filter(port => allEntries.map(item => item.serialPortNumber).includes(port)).length < 2)
        .map(ports => ports.filter(port => !allEntries.map(item => item.serialPortNumber).includes(port)))
        .flat(5)
        .sort((a, b) => a - b)

    this.logger.verbose(
      `to initiate ports: ${toReinitiatePorts.toString()}`,
      `correct ports are: ${JSON.stringify(correctPorts)}`
    )

    if (toReinitiatePorts.length > 0) {
      for (const port of toReinitiatePorts) {
        if (!correctPorts.includes(port)) {
          this.logger.debug(`##################################### port ${port} initializing... ###############################################`)
          await this.singlePortInitilizing(port)
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 10000))
    return (await this.getModulesStatus()).map(x => x.serialPortNumber)
  }

  async findAllModules() {
    return Object.keys(this.serialPort).map(item => ({ [item]: this.serialPort[item].port }))
  }

  runATCommand(portNumber: number, command: string) {
    return this.serialPort[`ttyUSB${portNumber}`].write(`${command}\r\n`)
  }

  async getModulesStatus() {
    const allEntries: Quectel[] = (
      await this.quectelsRepo
        .createQueryBuilder()
        .select([
          'MAX(serialPortNumber) AS serialPortNumber',
          'MAX(modelName) as modelName',
          'MAX(IMEI) AS IMEI',
          'MAX(IMSI) AS IMSI',
          'MAX(simStatus) AS simStatus',
          'MAX(isGPSActive) AS isGPSActive',
          'MAX(activeScenario) AS activeScenario',
          'MAX(callability) AS callability'
        ])
        .groupBy('IMEI')
        .having('MAX(IMEI) IS NOT NULL')
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

  async enablingGPS() {
    const inDbPortsCount = await this.quectelsRepo.count()
    if (inDbPortsCount === 16) {
      this.gpsEnabled = true;

      const now = new Date().getTime()
      while (new Date().getTime() < now + 300000) {
        const modulesStatus = await this.getModulesStatus();

        if (modulesStatus.some(item => item.isGPSActive === 'OK')) {
          return true
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      return { data: `there are problem in GPS detecting.please check your conectivities.` }
    }
    else {
      return { data: `please initiate first.current count is: ${inDbPortsCount}` }
    }
  }

  async startLog(type: logLocationType, code: string, expertId: number) {
    if (this.logStarted === false) {
      const count = await this.quectelsRepo.count({ where: { simStatus: 'READY', callability: true } })
      const expert = await this.usersRepo.findOne({ where: { id: expertId } })

      if (expert) {
        if (count === 16) {
          if (this.gpsEnabled) {
            let allEntries = await this.getModulesStatus()

            if (allEntries.filter(entry => entry.simStatus === 'READY').length === 8) {
              let scenarios = [scenarioName.GSMIdle, scenarioName.WCDMAIdle, scenarioName.LTEIdle, scenarioName.ALLTechIdle, scenarioName.GSMLongCall, scenarioName.WCDMALongCall, scenarioName.FTP_DL_TH, scenarioName.FTP_UL_TH]

              scenarios = scenarios.filter(item => item !== scenarioName.FTP_DL_TH)
              const map = allEntries.reduce((p, c) => {
                if (c.IMEI === '866758042198099') {
                  return {
                    ...p,
                    [c.IMEI]: scenarioName.FTP_DL_TH
                  }
                }
                else if (c.modelName === 'EP06' && scenarios.includes(scenarioName.WCDMAIdle)) {
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

              this.logStarted = true;
              this.type = type
              this.code = code
              this.expert = expert

              const newInspection = this.inspectionsRepo.create({
                type: this.type,
                code: this.code,
                expert: this.expert
              })
              this.inspection = await this.inspectionsRepo.save(newInspection)

              for (const module of allEntries) {
                switch (module.activeScenario) {

                  case scenarioName.GSMIdle:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockGSM)
                    await sleep(400)
                    setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                      },
                      700
                    )
                    break;

                  case scenarioName.WCDMAIdle:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockWCDMA)
                    await sleep(400)
                    setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getWCDMANetworkParameters)
                      },
                      800
                    )
                    break;

                  case scenarioName.LTEIdle:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockLTE)
                    await sleep(400)
                    setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getLTENetworkParameters)
                      },
                      900
                    )
                    break;

                  case scenarioName.ALLTechIdle:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.allTech)
                    await sleep(400)
                    setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getAllTechNetworkParameters)
                      },
                      1000
                    )
                    break;

                  case scenarioName.GSMLongCall:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockGSM)
                    await sleep(5000)
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(makeCallCommand(this.imsiDict[`ttyUSB${module.serialPortNumber}`]))
                    await sleep(5000)
                    const checkGSMCallStatusIntervalId = setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getCallStatus)
                      },
                      1900
                    )
                    await sleep(2000)
                    const getGSMNetParamsIntervalId = setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                      },
                      1100
                    )
                    break;

                  case scenarioName.WCDMALongCall:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockWCDMA)
                    await sleep(5000)
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(makeCallCommand(this.imsiDict[`ttyUSB${module.serialPortNumber}`]))
                    await sleep(5000)
                    const checkWCDMACallStatusIntervalId = setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getCallStatus)
                      },
                      2000
                    )
                    await sleep(2000)
                    const getWCDMANetParamsIntervalId = setInterval(
                      () => {
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                      },
                      1200
                    )
                    break;

                  case scenarioName.FTP_DL_TH:
                    // this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()

                    // await sleep(4000)
                    // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockLTE,
                    //   async () => {
                    //     this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                    //     await sleep(4000)
                    //     this.ftpDLConnectionEstablishingProgressTime = (new Date()).getTime()
                    //     //////////////////////////////////////////////////////////////////////////////
                    //     setInterval(async () => {
                    //       const fortySecondsAgo = new Date((new Date()).getTime() - 40000)

                    //       const find = (await this.ftpDLRepo.find({
                    //         where: { createdAt: MoreThanOrEqual(fortySecondsAgo) },
                    //         select: { speed: true }
                    //       })).filter(item => item.speed !== null && item.speed !== undefined)

                    //       const validSpeeds = find.filter(item => item.speed && Number(item.speed) > 0)

                    //       this.logger.debug(`40 sec ago valid ftp count: ${validSpeeds.length} of ${find.length}`)

                    //       if (validSpeeds.length === 0) {
                    //         if ((find.length > 20 && validSpeeds.length < find.length / 3) || (this.ftpDlRoundNumber > 1 && validSpeeds.length === 0 && find.length === 0)) {
                    //           this.logger.debug('Force to reset')

                    //           this.ftpDlFileCompleted = true;

                    //           const toClearIntervalIds = Object.keys(this.ftpDLIntervalID).filter(key => this.ftpDLIntervalID[key]);
                    //           for (const stringified_intervalId of toClearIntervalIds) {
                    //             const intervalId = Number(stringified_intervalId.split("_")[1])
                    //             clearInterval(intervalId)
                    //             this.ftpDLIntervalID[`interval_${intervalId}`] = false
                    //           }

                    //           await sleep(300)
                    //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.clearUFSStorage)

                    //           await sleep(300)
                    //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.dettachNetwork)
                    //         }
                    //       }

                    //       const timeToLastAction = (new Date()).getTime() - this.ftpDLConnectionEstablishingProgressTime
                    //       const activeIntervals = Object.keys(this.ftpDLIntervalID).filter(key => this.ftpDLIntervalID[key])
                    //       this.logger.error(`${JSON.stringify(activeIntervals)} | Try number: ${this.ftpDlRoundNumber} | Time To Last Action: ${timeToLastAction} ms`)

                    //       if (activeIntervals.length === 0 || timeToLastAction > 20000) {
                    //         this.ftpDlFileCompleted = true;

                    //         const toClearIntervalIds = Object.keys(this.ftpDLIntervalID).filter(key => this.ftpDLIntervalID[key]);
                    //         for (const stringified_intervalId of toClearIntervalIds) {
                    //           const intervalId = Number(stringified_intervalId.split("_")[1])
                    //           clearInterval(intervalId)
                    //           this.ftpDLIntervalID[`interval_${intervalId}`] = false
                    //         }

                    //         await sleep(300)
                    //         this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.clearUFSStorage)

                    //         await sleep(300)
                    //         this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.dettachNetwork)
                    //       }
                    //     }, 30000)
                    //   })
                    break;

                  case scenarioName.FTP_UL_TH:
                    // this.serialPort[`ttyUSB${ module.serialPortNumber }`].write(commands.clearUFSStorage)
                    // await sleep(1000)
                    // this.serialPort[`ttyUSB${ module.serialPortNumber }`].write(commands.clearUFSStorage)
                    // this.ftpULConnectionEstablishingProgressTime = (new Date()).getTime()
                    // await sleep(1000)
                    // this.ftpULConnectionEstablishingProgressTime = (new Date()).getTime()
                    // this.serialPort[`ttyUSB${ module.serialPortNumber }`].write(commands.allTech)
                    // await sleep(1000)
                    // this.serialPort[`ttyUSB${ module.serialPortNumber }`].write(commands.openFileToWrite)
                    break;

                  default:
                    break;
                }

              }
            }
            return allEntries.map(item => ({ portNumber: item.serialPortNumber, IMSI: item.IMSI, activeScenario: item.activeScenario, isGPSActive: item.isGPSActive }))
          }
          else {
            return { msg: 'please enable GPS first.' }
          }
        }
        else {
          return { msg: `please initiate again - ${count} modeuls are ready from 16.` }
        }
      }
      else {
        return { msg: `provided userId doesnt exist.` }
      }
    }
    else {
      return { msg: `please end current logging process.` }
    }
  }

  pauseLog() {
    if (this.logStarted === true) {
      this.logStarted = false
      return true
    }
    return { data: 'log dont started yet.' }
  }

  async gsmLockIdle(port: SerialPort) {
    port.write(commands.lockGSM)
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
