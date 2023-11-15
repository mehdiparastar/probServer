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

const serialPortCount = 32

const WAIT_TO_NEXT_COMMAND_IN_MILISECOND = 600

const serialPortInterfaces = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [16, 17, 18, 19], [20, 21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31]]

const correctPattern = {
  'moduleInformation': /ATI\r\r\nQuectel\r\n([^]+)\r\nRevision: ([^\r\n\r\n]+)/,
  'moduleIMSI': /AT\+CIMI\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'moduleIMEI': /AT\+CGSN\r\r\n(\d+)\r\n\r\nOK\r\n/,
  'simStatus': /AT\+CPIN\?\r\r\n\+CPIN: (\w+)\r\n\r\nOK\r\n/,
  'enableGPS': /AT\+QGPS=1\r\r\n(\w+)\r\n/,
  'isGPSActive': /AT\+QGPSLOC=2\r\r\n\+QGPSLOC: ([\d.]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+),(\d+),([\d.]+),([\d.]+),([\d.]+),(\d+),(\d+)\r\n\r\nOK\r\n/,
  'lockGSM': /AT\+QCFG="nwscanmode",1\r\r\nOK\r\n/,
  'lockWCDMA': /AT\+QCFG="nwscanmode",2\r\r\nOK\r\n/,
  'lockLTE': /AT\+QCFG="nwscanmode",3\r\r\nOK\r\n/,
  'allTech': /AT\+QCFG="nwscanmode",0\r\r\nOK\r\n/,
  'getGSMNetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(\w+)","(\w+)",(\d+),(\d+),(\d+),(\w+),(\d+),(\d+),([-]|\w+),(-?\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),"([-]|\w+)"\r\n\r\nOK\r\n/,
  // 'AT+QENG="servingcell";\r\r\n+QENG: "servingcell","LIMSRV","GSM",432,11,587,293A,31,98,-,-63,255,255,0,43,43,1,-,-,-,-,-,-,-,-,-,"-"\r\n\r\nOK\r\n'
  'getWCDMANetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+),([-]|\w+)/,
  //'AT+QENG="servingcell";\r\r\n+QENG: "servingcell","LIMSRV","WCDMA",432,35,584E,12DBAE3,10662,452,1,-70,-4,-,-,-,-,-\r\n\r\nOK\r\n'
  'getLTENetworkParameters': /AT\+QENG="servingcell";\r\r\n\+QENG: "servingcell","(-?\w+)","(-?\w+)","(-?\w+)",(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+),(-?\w+)/,
  // AT+QENG="servingcell";\r\r\n+QENG: "servingcell","NOCONN","LTE","FDD",432,11,6442235,354,3102,7,5,5,866B,-97,-13,-64,3,22\r\n\r\nOK\r\n
  // AT+QENG="servingcell";\r\r\n+QENG: "servingcell","NOCONN","LTE","FDD",432,35,1E77017,456,2850,7,5,5,584E,-100,-17,-62,-1,23\r\n\r\nOK\r\n
  'getCallStatus': /AT\+CPAS\r\r\n\+CPAS: (\d+)\r\n\r\nOK\r\n/,
  // 'AT+CPAS\r\r\n+CPAS: 4\r\n\r\nOK\r\n'
  'getCurrentAPN': /AT\+CGDCONT\?\r\r\n\+CGDCONT: (\d+),"(\w+)","(\w+)","(\d+.\d+.\d+.\d+)",.*\r\n\r\nOK\r\n/,
  'getDataConnectivityStatus': /AT\+QIACT\?\r\r\n\+QIACT: (\d+),(\d+),(\d+),"(\d+.\d+.\d+.\d+)".*\r\n|AT\+QIACT\?\r\r\nOK\r\n/,
  'getFtpStat': /AT\+QFTPSTAT\r\r\nOK\r\n\r\n\+QFTPSTAT: 0,(\d+)\r\n/,
  'ftpGetComplete': /\r\n\+QFTPGET: 0,(\d+)\r\n/,
  'getMCIFTPDownloadedFileSize': /.*\r\n\+QFLST: "UFS:QuectelMSDocs.zip",(\d+)\r\n\r\nOK\r\n/,
  // 'AT+QFLST="UFS:QuectelMSDocs.zip"\r\r\n+QFLST: "UFS:QuectelMSDocs.zip",57897070\r\n\r\nOK\r\n'
  // \r\n+QFLST: "UFS:QuectelMSDocs.zip",57897070\r\n\r\nOK\r\n
  'getMCIFTPFile': /AT\+QFTPGET=".\/Upload\/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\nOK\r\n/,
  //AT+QFTPGET="./Upload/QuectelMSDocs.zip","UFS:QuectelMSDocs.zip"\r\r\n+CME ERROR: 603\r\n
  'setMCIFTPGETCURRENTDIRECTORY': /.*\r\n\+QFTPCWD: (\d+),(\d+)\r\n/,
  // \r\n+QFTPCWD: 0,0\r\n
  'turnOffData': /AT\+QIDEACT=1\r\r\nOK\r\n/,
  'turnOnData': /AT\+QIACT=1\r\r\nOK\r\n|.*QIACT=1.*/,
  'setMCIAPN': /AT\+QICSGP=1,1,"mcinet","","",1\r\r\nOK\r\n/,
  'setFTPContext': /AT\+QFTPCFG="contextid",1\r\r\nOK\r\n/,
  'setMCIFTPAccount': /AT\+QFTPCFG="account","mci","SIM!mci2020"\r\r\nOK\r\n/,
  'setFTPGETFILETYPE': /AT\+QFTPCFG="filetype",1\r\r\nOK\r\n/,
  'setFTPGETFILETRANSFERMODE': /AT\+QFTPCFG="transmode",1\r\r\nOK\r\n/,
  'setFTPGETTIMEOUT': /AT\+QFTPCFG="rsptimeout",90\r\r\nOK\r\n/,
  'openMCIFTPConnection': /.*\r\n\+QFTPOPEN: (\d+),(\d+)\r\n/,
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

const parseData = (response: string) => {
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
      if (key === 'getCurrentAPN')
        return {
          [key]: {
            'cid': correctMatches[1].trim(),
            'PDPType': correctMatches[2].trim(),
            'APNName': correctMatches[3].trim(),
            'PDPAdd': correctMatches[4].trim(),
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
  if (response.indexOf('servingcell') >= 0 && response.indexOf('GPGSA') < 0) {
    return {
      ['getGSMNetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
      ['getWCDMANetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
      ['getLTENetworkParameters']: { 'cmeErrorCode': 'temprorarly until all tech regex added' },
    }
  }

  return false
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
  private ftpDLDFileSize: number
  private ftpDLDFileTime: number
  private waitForFtpStatToChangeFrom1to2: number = 2;
  private mciDirectorySetCorrectly: boolean = false

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
        await sleep(500)
        port.write(commands.turnOffData)
      })

      port.on('data', async (data) => {
        const response = data.toString()
        if (response !== '\r\n' && response.indexOf('GPGSA') < 0 && response.indexOf('GPRMC') < 0 && response.indexOf('GPGSV') < 0 && response.indexOf('GPVTG') < 0 && response.indexOf('GPGGA') < 0 && response.indexOf('servingcell') < 0) {
          // console.log(response)
          const x = 1;
        }
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
            this.imsiDict[`ttyUSB${portNumber}`] = parsedResponse['moduleIMSI']['IMSI']
            this.logger.debug(parsedResponse['moduleIMSI']['IMSI'])

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
            const entry = await this.quectelsRepo.update(
              { serialPortNumber: portNumber },
              { simStatus: parsedResponse['simStatus']['status'] },
            )
            this.logger.debug(parsedResponse['simStatus']['status'])

            port.write(
              makeCallCommand(this.imsiDict[`ttyUSB${portNumber}`]),
              async (err) => {
                if (err) {
                  const entry = await this.quectelsRepo.update(
                    { serialPortNumber: portNumber },
                    { callability: false },
                  )
                }
                else {
                  port.write(commands.hangUpCall)
                  const entry = await this.quectelsRepo.update(
                    { serialPortNumber: portNumber },
                    { callability: true },
                  )
                }
              })
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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
                  .where('ABS(TIMESTAMPDIFF(MICROSECOND, createdAt, :desiredCreatedAt)) <= 1000000') // One second has 1,000,000 microseconds
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

        if (parsedResponse && parsedResponse['turnOffData']) {
          if (parsedResponse.turnOffData.status === 'OK') {
            const thisScenario = (await this.quectelsRepo.findOne({ where: { serialPortNumber: portNumber }, select: { activeScenario: true } }))?.activeScenario
            if (thisScenario && thisScenario === scenarioName.FTP_DL_TH) {
              port.write(commands.getCurrentAPN)
              this.logger.debug('getCurrentAPN')
            }
          }
        }

        if (parsedResponse && parsedResponse['getCurrentAPN']) {
          if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
            if (parsedResponse.getCurrentAPN.APNName !== 'mcinet') {
              port.write(commands.setMCIAPN)
              this.logger.debug('setMCIAPN')
            }
            else {
              port.write(commands.getDataConnectivityStatus)
              this.logger.debug('getDataConnectivityStatus')
            }
          }
        }

        if (parsedResponse && parsedResponse['setMCIAPN']) {
          if (parsedResponse.setMCIAPN.status === 'OK') {
            port.write(commands.getDataConnectivityStatus)
            this.logger.debug('getDataConnectivityStatus')
          }
        }

        if (parsedResponse && parsedResponse['getDataConnectivityStatus']) {
          if (parsedResponse.getDataConnectivityStatus.contextState !== '1') {
            port.write(commands.turnOnData)
            this.logger.debug('turnOnData')
          }
          else {
            port.write(commands.setFTPContext)
            this.logger.debug('setFTPContext')
          }
        }

        if (parsedResponse && parsedResponse['turnOnData']) {
          if (parsedResponse.turnOnData.status === 'OK') {
            port.write(commands.setFTPContext)
            this.logger.debug('setFTPContext')
          }
        }

        if (parsedResponse && parsedResponse['setFTPContext']) {
          if (parsedResponse.setFTPContext.status === 'OK') {
            if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
              port.write(commands.setMCIFTPAccount)
              this.logger.debug('setMCIFTPAccount')
            }
          }
        }

        if (parsedResponse && parsedResponse['setMCIFTPAccount']) {
          if (parsedResponse.setMCIFTPAccount.status === 'OK') {
            port.write(commands.setFTPGETFILETYPE)
            this.logger.debug('setFTPGETFILETYPE')
          }
        }

        if (parsedResponse && parsedResponse['setFTPGETFILETYPE']) {
          if (parsedResponse.setFTPGETFILETYPE.status === 'OK') {
            port.write(commands.setFTPGETFILETRANSFERMODE)
            this.logger.debug('setFTPGETFILETRANSFERMODE')
          }
        }

        if (parsedResponse && parsedResponse['setFTPGETFILETRANSFERMODE']) {
          if (parsedResponse.setFTPGETFILETRANSFERMODE.status === 'OK') {
            port.write(commands.setFTPGETTIMEOUT)
            this.logger.debug('setFTPGETTIMEOUT')
          }
        }

        if (parsedResponse && parsedResponse['setFTPGETTIMEOUT']) {
          if (parsedResponse.setFTPGETTIMEOUT.status === 'OK') {
            port.write(commands.getFtpStat)
            this.logger.debug('getFtpStat')
          }
        }

        if (parsedResponse && parsedResponse['getFtpStat']) {

          if (parsedResponse.getFtpStat.ftpStat === '4') {
            if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
              port.write(commands.openMCIFTPConnection)
              this.logger.debug('openMCIFTPConnection')
            }
          }
          if (parsedResponse.getFtpStat.ftpStat === '2') {
            if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
              port.write(commands.getMCIFTPDownloadedFileSize)
              // port.write(commands.clearUFSStorage)
              this.logger.log('getting ftp file size')
            }
          }
          if (parsedResponse.getFtpStat.ftpStat === '1') {
            if ((this.imsiDict[`ttyUSB${portNumber}`]).slice(0, 6).includes('43211')) {
              // if (this.waitForFtpStatToChangeFrom1to2 === 0) {
              //   this.waitForFtpStatToChangeFrom1to2 = 4
              //   if (this.mciDirectorySetCorrectly) {
                  port.write(commands.getMCIFTPFile)
                  this.logger.debug('getMCIFTPFile')
                  this.ftpDLDFileSize = 0
                  this.ftpDLDFileTime = (new Date()).getTime()
              //   }
              // }
              // else {
              //   this.waitForFtpStatToChangeFrom1to2 = this.waitForFtpStatToChangeFrom1to2 - 1
              // }

            }
          }
        }

        if (parsedResponse && parsedResponse['openMCIFTPConnection']) {
          if (parsedResponse.openMCIFTPConnection.err === '0') {
            port.write(commands.setMCIFTPGETCURRENTDIRECTORY)
            this.logger.log('setMCIFTPGETCURRENTDIRECTORY')
          }
        }

        if (parsedResponse && parsedResponse['setMCIFTPGETCURRENTDIRECTORY']) {
          if (parsedResponse.setMCIFTPGETCURRENTDIRECTORY.err === '0' && parsedResponse.setMCIFTPGETCURRENTDIRECTORY.protocolError === '0') {
            this.mciDirectorySetCorrectly = true
            port.write(commands.getFtpStat)
            this.logger.log('getFtpStat')
          }
          else {
            port.write(commands.setMCIFTPGETCURRENTDIRECTORY)
          }
        }


        if (parsedResponse && parsedResponse['ftpGetComplete']) {
          const speed = (Number(parsedResponse.ftpGetComplete.transferlen) - this.ftpDLDFileSize) / ((new Date()).getTime() - this.ftpDLDFileTime)
          this.logger.log(`FTP DL Speed: ${speed} KB/s`)
          this.ftpDLDFileSize = 0
          this.ftpDLDFileTime = (new Date()).getTime()
          port.write(commands.clearUFSStorage, (err) => {
            if (!err) {
              this.logger.log('Download completed and UFS storage cleared successfully. ')
            }
          })
        }
        if (parsedResponse && parsedResponse['getMCIFTPDownloadedFileSize']) {
          const speed = (Number(parsedResponse.getMCIFTPDownloadedFileSize.transferlen) - this.ftpDLDFileSize) / ((new Date()).getTime() - this.ftpDLDFileTime)
          this.logger.log(`FTP DL Speed: ${speed} KB/s`)
          this.ftpDLDFileSize = Number(parsedResponse.getMCIFTPDownloadedFileSize.transferlen) === 57675882 ? 0 : Number(parsedResponse.getMCIFTPDownloadedFileSize.transferlen)
          this.ftpDLDFileTime = (new Date()).getTime()
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
    const toReinitiatePorts =
      serialPortInterfaces
        .filter(ports => ports.filter(port => allEntries.map(item => item.serialPortNumber).includes(port)).length < 2)
        .map(ports => ports.filter(port => !allEntries.map(item => item.serialPortNumber).includes(port)))
        .flat(5)

    this.logger.verbose(`to initiate ports: ${toReinitiatePorts.toString()}`)
    if (toReinitiatePorts.length > 0) {
      for (const port of toReinitiatePorts) {
        this.singlePortInitilizing(port)
      }
    }

    await new Promise(resolve => setTimeout(resolve, 10000))
    return await this.getModulesStatus()
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
      return { data: `there are problem in GPS detecting. please check your conectivities.` }
    }
    else {
      return { data: `please initiate first. current count is: ${inDbPortsCount}` }
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

              this.logStarted = true;
              this.type = type
              this.code = code
              this.expert = expert

              const newInspection = this.inspectionsRepo.create({
                type: type,
                code: code,
                expert: expert
              })
              this.inspection = await this.inspectionsRepo.save(newInspection)

              for (const module of allEntries) {
                switch (module.activeScenario) {

                  // case scenarioName.GSMIdle:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockGSM, async (err) => {
                  //     if (!err) {
                  //       await sleep(400)

                  //       const intervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;

                  // case scenarioName.WCDMAIdle:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockWCDMA, async (err) => {
                  //     if (!err) {
                  //       await sleep(400)

                  //       const intervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getWCDMANetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;

                  // case scenarioName.LTEIdle:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockLTE, async (err) => {
                  //     if (!err) {
                  //       await sleep(400)

                  //       const intervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getLTENetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;

                  // case scenarioName.ALLTechIdle:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.allTech, async (err) => {
                  //     if (!err) {
                  //       await sleep(400)

                  //       const intervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getAllTechNetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;

                  // case scenarioName.GSMLongCall:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockGSM, async (err) => {
                  //     if (!err) {
                  //       await sleep(5000)
                  //       this.serialPort[`ttyUSB${module.serialPortNumber}`].write(makeCallCommand(this.imsiDict[`ttyUSB${module.serialPortNumber}`]))
                  //       await sleep(5000)
                  //       const checkCallStatusIntervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getCallStatus)
                  //         },
                  //         2000
                  //       )
                  //       await sleep(2000)
                  //       const getNetParamsIntervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;

                  // case scenarioName.WCDMALongCall:
                  //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.lockWCDMA, async (err) => {
                  //     if (!err) {
                  //       await sleep(5000)
                  //       this.serialPort[`ttyUSB${module.serialPortNumber}`].write(makeCallCommand(this.imsiDict[`ttyUSB${module.serialPortNumber}`]))
                  //       await sleep(5000)
                  //       const checkCallStatusIntervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getCallStatus)
                  //         },
                  //         2000
                  //       )
                  //       await sleep(2000)
                  //       const getNetParamsIntervalId = setInterval(
                  //         () => {
                  //           this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getGSMNetworkParameters)
                  //         },
                  //         WAIT_TO_NEXT_COMMAND_IN_MILISECOND
                  //       )

                  //     }
                  //   })
                  //   break;


                  case scenarioName.FTP_DL_TH:
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.clearUFSStorage)
                    await sleep(1000)
                    this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.allTech,
                      async () => {
                        await sleep(4000)
                        this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.turnOffData)
                        // await sleep(2000)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getCurrentAPN)
                        // await sleep(2000)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getDataConnectivityStatus)
                        // await sleep(2000)

                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setFTPContext)
                        // await sleep(500)
                        // if (this.imsiDict[`ttyUSB${module.serialPortNumber}`].slice(0, 6).includes('43211')) {
                        //   this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setMCIFTPAccount)
                        // }
                        // await sleep(500)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setFTPGETFILETYPE)
                        // await sleep(500)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setFTPGETFILETRANSFERMODE)
                        // await sleep(500)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setFTPGETTIMEOUT)
                        // await sleep(500)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.openMCIFTPConnection)
                        // await sleep(2000)
                        // this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.setMCIFTPGETCURRENTDIRECTORY)
                        // await sleep(2000)
                        // setInterval(
                        //   async () => {
                        //     this.serialPort[`ttyUSB${module.serialPortNumber}`].write(commands.getFtpStat)
                        //   }, 1000
                        // )
                      })

                    break;

                  default:
                    break;
                }

              }
            }
            return allEntries
          }
          else {
            return { msg: 'please enable GPS first.' }
          }
        }
        else {
          return { msg: `please initiate again  - ${count} modeuls are ready from 16.` }
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
