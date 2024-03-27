import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FTPDL } from './entities/ftpDL.entity';
import { FTPUL } from './entities/ftpUL.entity';
import { GPSData } from './entities/gps-data.entity';
import { GSMIdleMCI } from './entities/gsmIdleMCI.entity';
import { GSMLongCallMCI } from './entities/gsmLongCallMCI.entity';
import { Inspection } from './entities/inspection.entity';
import { LTEIdleMCI } from './entities/lteIdleMCI.entity';
import { Quectel } from './entities/quectel.entity';
import { User } from './entities/user.entity';
import { WCDMAIdleMCI } from './entities/wcdmaIdleMCI.entity';
import { WCDMALongCallMCI } from './entities/wcdmaLongCallMCI.entity';
import { MSService, allDMPorts } from './ms.service';
import { GPSService } from './gps.service';
import { GSMIdleService } from './idle.gsm.service';
import { MSData } from './entities/ms-data.entity';
import { logLocationType } from './enum/logLocationType.enum';
import { WCDMAIdleService } from './idle.wcdma.service';
import { LTEIdleService } from './idle.lte.service';
import { GSMLongCallService } from './longCall.gsm.service';
import { WCDMALongCallService } from './longCall.wcdma.service';
import * as fs from 'fs';
import { callStatus } from './enum/callStatus.enum';
import { ProbGateway, probSocketInItRoom } from './prob.gateway';
import { dtCurrentStatusENUM } from './enum/dtcurrentStatus.enum';
import { scenarioName } from './enum/scenarioName.enum';
import { WCDMALongCallMTN } from './entities/wcdmaLongCallMTN.entity';
import { LTEIdleMTN } from './entities/lteIdleMTN.entity';
import { GSMIdleMTN } from './entities/gsmIdleMTN.entity';
import { GSMLongCallMTN } from './entities/gsmLongCallMTN.entity ';
import { WCDMAIdleMTN } from './entities/wcdmaIdleMTN.entity';


export const sleep = async (milisecond: number) => {
  await new Promise(resolve => setTimeout(resolve, milisecond))
}

const styleDict = {
  green: "n0",
  yellow: "n1",
  red: "n2",
  black: "n3"
}

const styleDict_reverse = {
  "n0": "green",
  "n1": "yellow",
  "n2": "red",
  "n3": "black",
}

interface KMLData {
  location: {
    latitude: string;
    longitude: string;
  };
  data: {
    pointValue: number | string;
    valueName: string;
    pointColor: string;
    pointMNC: string;
    pointMCC: string;
    pointTech: string;
    pointCallStatus: callStatus;
    pointTCH?: string;
  };
}

@Injectable()
export class ProbService implements OnModuleInit {
  private readonly logger = new Logger(ProbService.name);
  private inspection: Inspection = null
  private portsInitializing: boolean = false
  private portsInitialized: boolean = false
  private gpsInitializing: boolean = false
  private gpsInitialized: boolean = false
  private firstStartDT: boolean = false
  private tryTofirstStartDT: boolean = false

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Quectel) private quectelsRepo: Repository<Quectel>,
    @InjectRepository(GPSData) private gpsDataRepo: Repository<GPSData>,
    @InjectRepository(Inspection) private inspectionsRepo: Repository<Inspection>,
    @InjectRepository(GSMIdleMCI) private gsmIdlesMCIRepo: Repository<GSMIdleMCI>,
    @InjectRepository(WCDMAIdleMCI) private wcdmaIdlesMCIRepo: Repository<WCDMAIdleMCI>,
    @InjectRepository(LTEIdleMCI) private lteIdlesMCIRepo: Repository<LTEIdleMCI>,
    @InjectRepository(GSMLongCallMCI) private gsmLongCallMCIRepo: Repository<GSMLongCallMCI>,
    @InjectRepository(WCDMALongCallMCI) private wcdmaLongCallMCIRepo: Repository<WCDMALongCallMCI>,
    @InjectRepository(GSMIdleMTN) private gsmIdlesMTNRepo: Repository<GSMIdleMTN>,
    @InjectRepository(WCDMAIdleMTN) private wcdmaIdlesMTNRepo: Repository<WCDMAIdleMTN>,
    @InjectRepository(LTEIdleMTN) private lteIdlesMTNRepo: Repository<LTEIdleMTN>,
    @InjectRepository(GSMLongCallMTN) private gsmLongCallMTNRepo: Repository<GSMLongCallMTN>,
    @InjectRepository(WCDMALongCallMTN) private wcdmaLongCallMTNRepo: Repository<WCDMALongCallMTN>,
    @InjectRepository(FTPDL) private ftpDLRepo: Repository<FTPDL>,
    @InjectRepository(FTPUL) private ftpULRepo: Repository<FTPUL>,
    @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
    // private msService: MSService,
    private gpsService: GPSService,
    private readonly probSocketGateway: ProbGateway,
    @Inject('MSService01') private msService01: MSService,
    @Inject('MSService02') private msService02: MSService,
    @Inject('MSService03') private msService03: MSService,
    @Inject('MSService04') private msService04: MSService,
    @Inject('MSService05') private msService05: MSService,
    @Inject('MSService06') private msService06: MSService,
    @Inject('MSService07') private msService07: MSService,
    @Inject('MSService08') private msService08: MSService,
    @Inject('MSService09') private msService09: MSService,
    @Inject('MSService10') private msService10: MSService,
    @Inject('MSService11') private msService11: MSService,
    @Inject('MSService12') private msService12: MSService,
    @Inject('GSMIdleMCIService') private gsmIdleMCIService: GSMIdleService,
    @Inject('GSMIdleMTNService') private gsmIdleMTNService: GSMIdleService,
    @Inject('WCDMAIdleMCIService') private wcdmaIdleMCIService: WCDMAIdleService,
    @Inject('WCDMAIdleMTNService') private wcdmaIdleMTNService: WCDMAIdleService,
    @Inject('LTEIdleMCIService') private lteIdleMCIService: LTEIdleService,
    @Inject('LTEIdleMTNService') private lteIdleMTNService: LTEIdleService,
    @Inject('GSMLongCallMCIService') private gsmLongCallMCIService: GSMLongCallService,
    @Inject('GSMLongCallMTNService') private gsmLongCallMTNService: GSMLongCallService,
    @Inject('WCDMALongCallMCIService') private wcdmaLongCallMCIService: WCDMALongCallService,
    @Inject('WCDMALongCallMTNService') private wcdmaLongCallMTNService: WCDMALongCallService,

  ) {
  }

  async onModuleInit() {


  }

  async getProbSocket() {
    const clients = this.probSocketGateway.io.adapter.rooms.get(probSocketInItRoom)
    return ({ connected: true, connectedClientCount: clients ? clients.size : 0 })
  }

  private getRxLevColor(rxLev: number | string): string {
    if (Number.isNaN(+rxLev) === false || (typeof (rxLev) === 'string' && rxLev.trim() !== '')) {
      if (+rxLev < -93) {
        return styleDict.red //'ff0000'; // Red
      } else if (+rxLev >= -90) {
        return styleDict.green // '00ff00'; // Green
      } else if (+rxLev >= -93 && +rxLev < -90) {
        return styleDict.yellow // 'ffff00'; // Yellow
      } {
        return styleDict.black //'000'; // Black
      }
    }
    else {
      return styleDict.black //'000'; // Black
    }
  };

  private getRxQualColor(rxQual: number | string): string {
    if (Number.isNaN(+rxQual) === false || (typeof (rxQual) === 'string' && rxQual.trim() !== '')) {
      if (+rxQual < 5) {
        return styleDict.green // '00ff00'; // Green
      } else if (+rxQual >= 6) {
        return styleDict.red //'ff0000'; // Red
      } else if (+rxQual >= 5 && +rxQual < 6) {
        return styleDict.yellow // 'ffff00'; // Yellow
      } {
        return styleDict.black //'000'; // Black
      }
    }
    else {
      return styleDict.black //'000'; // Black
    }
  };

  private generateKMLContent(data: KMLData[], inspection: Inspection, fileName: string): string {
    // Define a color scale based on rxLev values

    const colorCounts = data.map((point) => styleDict_reverse[point.data.pointColor]).reduce((p, c) => {
      p[c] = (p[c] || 0) + 1;
      return p;
    }, {})

    const summaryTable = `<table border=1 style='font-size: 14px; width: 300px;'><tr><th>Color</th><th>Count</th></tr>${Object.entries(colorCounts).map(
      ([color, count]) => `<tr><td>${color}</td><td>${count}</td></tr>`
    )}</table>`;

    this.logger.debug(JSON.stringify({ "green": 0, "red": 0, "yellow": 0, "black": 0, ...colorCounts }))

    // Construct KML content using data and styles
    const kmlFeatures = data.map((point) =>
      `<Placemark>
    <styleUrl>#${point.data.pointColor}</styleUrl>
    <Point>
      <coordinates>${point.location.longitude},${point.location.latitude}</coordinates>
    </Point>
    <description>
      <![CDATA[
      <table border=0 style='font-size: 12px; width: 200px;'>
        <tr>
          <td>${point.data.valueName}:</td> 
          <td><p align=right>${point.data.pointValue}</p></td>
        </tr>
        <tr>
          <td>Traffic channel:</td> 
          <td><p align=right>${point.data.pointTCH}</p></td>
        </tr>
        <tr>
          <td>Technology:</td> 
          <td><p align=right>${point.data.pointTech}</p></td>
        </tr>
        <tr>
          <td>MCC:</td> 
          <td><p align=right>${point.data.pointMCC}</p></td>
        </tr>
        <tr>
          <td>MNC:</td> 
          <td><p align=right>${point.data.pointMNC}</p></td>
        </tr>
        <tr>
          <td>Call Status:</td> 
          <td><p align=right>${point.data.pointCallStatus}</p></td>
        </tr>
      </table>]]>
    </description>
  </Placemark>`);

    // Define styles based on rxlev values
    const kmlStyles =
      `<Style id="n0">
  <IconStyle>
  <color>FF008000</color>
  <scale>0.30</scale>
  <Icon>
  <href>http://td.analytics.tems.net/TDD/GoogleEarth/dot.png</href>
  </Icon>
  </IconStyle>
  </Style>
  <Style id="n1">
  <IconStyle>
  <color>FF00ffff</color>
  <scale>0.30</scale>
  <Icon>
  <href>http://td.analytics.tems.net/TDD/GoogleEarth/dot.png</href>
  </Icon>
  </IconStyle>
  </Style>
  <Style id="n2">
  <IconStyle>
  <color>FF0000ff</color>
  <scale>0.30</scale>
  <Icon>
  <href>http://td.analytics.tems.net/TDD/GoogleEarth/dot.png</href>
  </Icon>
  </IconStyle>
  </Style>
  <Style id="n3">
  <IconStyle>
  <color>FF000000</color>
  <scale>0.30</scale>
  <Icon>
  <href>http://td.analytics.tems.net/TDD/GoogleEarth/dot.png</href>
  </Icon>
  </IconStyle>
  </Style>`


    // Complete KML structure with styles
    const kml =
      `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
      <name>${fileName}_${inspection.type}_${inspection.code}_${new Date().toJSON().slice(0, 19)}</name>
      ${kmlStyles}\n
      ${kmlFeatures.join('\n')}    
    </Document>
  </kml>`;

    return kml;

  }

  async initDT(type: logLocationType, code: string, expertId: number) {

    if (this.portsInitialized === false && this.portsInitializing === false && this.gpsInitializing === false) {

      const expert = await this.usersRepo.findOne({ where: { id: expertId } })

      if (expert) {

        const newEntry = this.inspectionsRepo.create({
          type: type,
          code: code,
          expert: expert
        })
        this.inspection = await this.inspectionsRepo.save(newEntry)

        this.probSocketGateway.emitDTCurrentExpertId(this.inspection.expert.id)
        this.probSocketGateway.emitDTCurrentLogLocType(this.inspection.type)
        this.probSocketGateway.emitDTCurrentLogLocCode(this.inspection.code)

        global.dtCurrentStatus = dtCurrentStatusENUM.initing
        this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)
        this.logger.error('------------------- start ms service -----------------------')
        this.portsInitializing = true
        await Promise.all([
          this.msService01.portsInitializing(this.inspection),
          this.msService02.portsInitializing(this.inspection),
          this.msService03.portsInitializing(this.inspection),
          this.msService04.portsInitializing(this.inspection),
          this.msService05.portsInitializing(this.inspection),
          this.msService06.portsInitializing(this.inspection),
          this.msService07.portsInitializing(this.inspection),
          this.msService08.portsInitializing(this.inspection),
          this.msService09.portsInitializing(this.inspection),
          this.msService10.portsInitializing(this.inspection),
          this.msService11.portsInitializing(this.inspection),
          this.msService12.portsInitializing(this.inspection),
        ])
        this.portsInitialized = true
        this.portsInitializing = false
        this.logger.error('------------------- end ms service -----------------------')
        global.dtCurrentStatus = dtCurrentStatusENUM.inited
        this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)


        global.dtCurrentStatus = dtCurrentStatusENUM.findingLoc
        this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)
        this.logger.error('------------------- start gps service -----------------------')
        this.gpsInitializing = true
        await this.gpsService.portsInitializing(this.inspection)
        this.gpsInitialized = true
        this.gpsInitializing = false
        this.logger.error('------------------- end gps service -----------------------')
        global.dtCurrentStatus = dtCurrentStatusENUM.findedLoc
        this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)


        global.dtCurrentStatus = dtCurrentStatusENUM.inited
        this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)
        return { msg: `DT inited successfully.` }

      }
      else {
        return { msg: `provided userId doesnt exist.` }
      }
    }
    else {
      return { msg: `please wait, initializing in process... ` }
    }
  }

  async start() {

    if (this.inspection && this.portsInitialized && this.gpsInitialized && this.firstStartDT === false && this.tryTofirstStartDT === false) {

      this.tryTofirstStartDT = true

      global.dtCurrentStatus = dtCurrentStatusENUM.starting
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      const msData = await this.msDataRepo.find({ where: { inspection: { id: this.inspection.id } }, select: { dmPortNumber: true, activeScenario: true } })

      await Promise.all(
        msData.map(ms => {
          switch (ms.activeScenario) {
            case scenarioName.GSMIdleMCI:
              return this.gsmIdleMCIService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.WCDMAIdleMCI:
              return this.wcdmaIdleMCIService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.LTEIdleMCI:
              return this.lteIdleMCIService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.GSMLongCallMCI:
              return this.gsmLongCallMCIService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.WCDMALongCallMCI:
              return this.wcdmaLongCallMCIService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.GSMIdleMTN:
              return this.gsmIdleMTNService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.WCDMAIdleMTN:
              return this.wcdmaIdleMTNService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.LTEIdleMTN:
              return this.lteIdleMTNService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.GSMLongCallMTN:
              return this.gsmLongCallMTNService.portsInitializing(ms.dmPortNumber, this.inspection)

            case scenarioName.WCDMALongCallMTN:
              return this.wcdmaLongCallMTNService.portsInitializing(ms.dmPortNumber, this.inspection)

            default:
              return;
          }
        })
      )

      this.firstStartDT = true
      this.startRecording()

      global.dtCurrentStatus = dtCurrentStatusENUM.started
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      return { msg: `DT started successfully. ` }

    }
    else {
      if (this.inspection && this.portsInitialized && this.gpsInitialized && this.firstStartDT === true && this.tryTofirstStartDT === true) {
        return this.startRecording()
      }
      else {
        return { msg: `please init first.` }
      }
    }
  }

  async stop() {
    if (global.recording === true || (this.inspection !== null && this.inspection !== undefined)) {

      this.pauseRecording()

      global.dtCurrentStatus = dtCurrentStatusENUM.stopping
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      await sleep(1000)

      for (const interval of global.activeIntervals) {
        clearInterval(interval)
      }

      await sleep(1000)

      await this.gpsService.portsTermination()

      await sleep(2500)

      await Promise.all([
        this.msService01.portsTermination(),
        this.msService02.portsTermination(),
        this.msService03.portsTermination(),
        this.msService04.portsTermination(),
        this.msService05.portsTermination(),
        this.msService06.portsTermination(),
        this.msService07.portsTermination(),
        this.msService08.portsTermination(),
        this.msService09.portsTermination(),
        this.msService10.portsTermination(),
        this.msService11.portsTermination(),
        this.msService12.portsTermination(),

      ]).then((res) => {
        this.logger.warn('Ports Terminated.')
      }).catch(ex => {
        this.logger.error(ex)
      })

      await sleep(1000)

      this.logger.warn(`stopped ${global.activeIntervals.length} current active threads.`)

      global.activeIntervals = []

      for (const portInItStatus of global.portsInitingStatus) {
        this.probSocketGateway.emitPortsInitingStatus(portInItStatus.port, 0)
      }
      global.portsInitingStatus = []

      this.inspection = null
      this.portsInitializing = false
      this.portsInitialized = false
      this.gpsInitializing = false
      this.gpsInitialized = false
      this.firstStartDT = false
      this.tryTofirstStartDT = false

      global.dtCurrentStatus = dtCurrentStatusENUM.stopped
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }

      return { msg: 'DT stopped successfully.' }
    }
    else {
      return { msg: 'There is no DT still.' }
    }
  }

  async truncate() {
    // Truncate table using raw SQL query
    await this.gsmIdlesMCIRepo.query(`delete from ${this.gsmIdlesMCIRepo.metadata.tableName}`);
    await this.wcdmaIdlesMCIRepo.query(`delete from ${this.wcdmaIdlesMCIRepo.metadata.tableName}`);
    await this.lteIdlesMCIRepo.query(`delete from ${this.lteIdlesMCIRepo.metadata.tableName}`);
    await this.gsmLongCallMCIRepo.query(`delete from ${this.gsmLongCallMCIRepo.metadata.tableName}`);
    await this.wcdmaLongCallMCIRepo.query(`delete from ${this.wcdmaLongCallMCIRepo.metadata.tableName}`);
    await this.gsmIdlesMTNRepo.query(`delete from ${this.gsmIdlesMTNRepo.metadata.tableName}`);
    await this.wcdmaIdlesMTNRepo.query(`delete from ${this.wcdmaIdlesMTNRepo.metadata.tableName}`);
    await this.lteIdlesMTNRepo.query(`delete from ${this.lteIdlesMTNRepo.metadata.tableName}`);
    await this.gsmLongCallMTNRepo.query(`delete from ${this.gsmLongCallMTNRepo.metadata.tableName}`);
    await this.wcdmaLongCallMTNRepo.query(`delete from ${this.wcdmaLongCallMTNRepo.metadata.tableName}`);
    await this.ftpDLRepo.query(`delete from ${this.ftpDLRepo.metadata.tableName}`);
    await this.ftpULRepo.query(`delete from ${this.ftpULRepo.metadata.tableName}`);
    await this.quectelsRepo.query(`delete from ${this.quectelsRepo.metadata.tableName}`);
    await this.inspectionsRepo.query(`delete from ${this.inspectionsRepo.metadata.tableName}`);
    await this.gpsDataRepo.query(`delete from ${this.gpsDataRepo.metadata.tableName}`);
    await this.msDataRepo.query(`delete from ${this.msDataRepo.metadata.tableName}`);
  }

  async getKML(inspectionId: number) {
    const [inspection] = await this.inspectionsRepo.find({ where: { id: inspectionId } })
    this.logger.error(JSON.stringify(inspection))

    if (inspection) {
      const gsmIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: inspectionId } }, relations: { gsmIdleSamplesMCI: true } })
      const gsmIdle_kmlContent = this.generateKMLContent(
        gsmIdleData
          .map(x => ({ ...x, ...x.gsmIdleSamplesMCI[0] }))
          .map(point => ({
            location: {
              latitude: point.latitude,
              longitude: point.longitude
            },
            data: {
              pointValue: (!Number.isNaN(+point.rxlev)) ? Number(point.rxlev) : '-',
              valueName: 'RxLev',
              pointColor: this.getRxLevColor((!Number.isNaN(+point.rxlev)) ? Number(point.rxlev) : '-'),
              pointMNC: point.mnc || '-',
              pointMCC: point.mcc || '-',
              pointTech: point.tech || '-',
              pointCallStatus: callStatus.Idle,
              pointTCH: point.tch || '-'
            }
          })),
        inspection,
        'gsmIdle'
      )

      const gsmIdle_filePath = 'reports/gsmIdle.kml';
      fs.writeFileSync(gsmIdle_filePath, gsmIdle_kmlContent);


      const wcdmaIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: inspectionId } }, relations: { wcdmaIdleSamplesMCI: true } })
      const wcdmaIdle_kmlContent = this.generateKMLContent(
        wcdmaIdleData
          .map(x => ({ ...x, ...x.wcdmaIdleSamplesMCI[0] }))
          .map(point => ({
            location: {
              latitude: point.latitude,
              longitude: point.longitude
            },
            data: {
              pointValue: (!Number.isNaN(+point.rscp)) ? Number(point.rscp) : '-',
              valueName: 'RSCP',
              pointColor: this.getRxLevColor((!Number.isNaN(+point.rscp)) ? Number(point.rscp) : '-'),
              pointMNC: point.mnc || '-',
              pointMCC: point.mcc || '-',
              pointTech: point.tech || '-',
              pointCallStatus: callStatus.Idle,
            }
          })),
        inspection,
        'wcdmaIdle'
      )

      const wcdmaIdle_filePath = 'reports/wcdmaIdle.kml';
      fs.writeFileSync(wcdmaIdle_filePath, wcdmaIdle_kmlContent);


      const lteIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: inspectionId } }, relations: { lteIdleSamplesMCI: true } })
      const lteIdle_kmlContent = this.generateKMLContent(
        lteIdleData
          .map(x => ({ ...x, ...x.lteIdleSamplesMCI[0] }))
          .map(point => ({
            location: {
              latitude: point.latitude,
              longitude: point.longitude
            },
            data: {
              pointValue: (!Number.isNaN(+point.rsrp)) ? Number(point.rsrp) : '-',
              valueName: 'RSRP',
              pointColor: this.getRxLevColor((!Number.isNaN(+point.rsrp)) ? Number(point.rsrp) : '-'),
              pointMNC: point.mnc || '-',
              pointMCC: point.mcc || '-',
              pointTech: point.tech || '-',
              pointCallStatus: callStatus.Idle,
            }
          })),
        inspection,
        'lteIdle'
      )

      const lteIdle_filePath = 'reports/lteIdle.kml';
      fs.writeFileSync(lteIdle_filePath, lteIdle_kmlContent);


      const gsmLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: inspectionId } }, relations: { gsmLongCallSamplesMCI: true } })
      const gsmLongCall_kmlContent = this.generateKMLContent(
        gsmLongCallData
          .map(x => ({ ...x, ...x.gsmLongCallSamplesMCI[0] }))
          .map(point => ({
            location: {
              latitude: point.latitude,
              longitude: point.longitude
            },
            data: {
              pointValue: (!Number.isNaN(+point.rxqualsub)) ? Number(point.rxqualsub) : '-',
              valueName: 'RxQualSUB',
              pointColor: this.getRxQualColor((!Number.isNaN(+point.rxqualsub)) ? Number(point.rxqualsub) : '-'),
              pointMNC: point.mnc || '-',
              pointMCC: point.mcc || '-',
              pointTech: point.tech || '-',
              pointCallStatus: point.callingStatus,
              pointTCH: point.tch || '-'
            }
          })),
        inspection,
        'gsmLongCall'
      )

      const gsmLongCall_filePath = 'reports/gsmLongCall.kml';
      fs.writeFileSync(gsmLongCall_filePath, gsmLongCall_kmlContent);


      const wcdmaLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: inspectionId } }, relations: { wcdmaLongCallSamplesMCI: true } })
      const wcdmaLongCall_kmlContent = this.generateKMLContent(
        wcdmaLongCallData
          .map(x => ({ ...x, ...x.wcdmaLongCallSamplesMCI[0] }))
          .map(point => ({
            location: {
              latitude: point.latitude,
              longitude: point.longitude
            },
            data: {
              pointValue: (!Number.isNaN(+point.ecio)) ? Number(point.ecio) : '-',
              valueName: 'RxQualSUB',
              pointColor: this.getRxQualColor((!Number.isNaN(+point.ecio)) ? Number(point.ecio) : '-'),
              pointMNC: point.mnc || '-',
              pointMCC: point.mcc || '-',
              pointTech: point.tech || '-',
              pointCallStatus: point.callingStatus,
            }
          })),
        inspection,
        'wcdmaLongCall'
      )

      const wcdmaLongCall_filePath = 'reports/wcdmaLongCall.kml';
      fs.writeFileSync(wcdmaLongCall_filePath, wcdmaLongCall_kmlContent);


      return { msg: `KMLs Created successfully.` }

    }
    else {
      return { msg: `provided inspection not found.` }
    }
  }

  async startRecording() {
    if (this.firstStartDT === true && global.recording === false) {
      global.recording = true

      global.dtCurrentStatus = dtCurrentStatusENUM.started
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      return { msg: 'recording started successfully.' }
    }
  }

  async pauseRecording() {
    if (global.recording === true) {
      global.recording = false

      global.dtCurrentStatus = dtCurrentStatusENUM.paused
      this.probSocketGateway.emitDTCurrentStatus(global.dtCurrentStatus)

      return { msg: 'recording paused successfully.' }
    }
  }

  async getDTCurrentExpertId() {
    const expertId = this.inspection && this.inspection.expert && this.inspection.expert.id
    return ({ expertId })
  }

  async getDTCurrentLogLocType() {
    const logLocType = this.inspection && this.inspection.type
    return ({ logLocType })
  }

  async getDTCurrentLogLocCode() {
    const logLocCode = this.inspection && this.inspection.code
    return ({ logLocCode })
  }

  async getDTCurrentGSMLockIdle(op: "MCI" | "MTN") {
    if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MCI") {
      const gsmIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { gsmIdleSamplesMCI: true } })
      return gsmIdleData.filter(item => item.gsmIdleSamplesMCI.length > 0)
    } else if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MTN") {
      const gsmIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { gsmIdleSamplesMTN: true } })
      return gsmIdleData.filter(item => item.gsmIdleSamplesMTN.length > 0)
    }
    else {
      return ([])
    }
  }

  async getDTCurrentWCDMALockIdle(op: "MCI" | "MTN") {
    if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MCI") {
      const wcdmaIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { wcdmaIdleSamplesMCI: true } })
      return wcdmaIdleData.filter(item => item.wcdmaIdleSamplesMCI.length > 0)
    } else if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MTN") {
      const wcdmaIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { wcdmaIdleSamplesMTN: true } })
      return wcdmaIdleData.filter(item => item.wcdmaIdleSamplesMTN.length > 0)
    }
    else {
      return ([])
    }
  }

  async getDTCurrentLTELockIdle(op: "MCI" | "MTN") {
    if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MCI") {
      const lteIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { lteIdleSamplesMCI: true } })
      return lteIdleData.filter(item => item.lteIdleSamplesMCI.length > 0)
    } else if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MTN") {
      const lteIdleData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { lteIdleSamplesMTN: true } })
      return lteIdleData.filter(item => item.lteIdleSamplesMTN.length > 0)
    }
    else {
      return ([])
    }
  }

  async getDTCurrentGSMLockLongCall(op: "MCI" | "MTN") {
    if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MCI") {
      const gsmLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { gsmLongCallSamplesMCI: true } })
      return gsmLongCallData.filter(item => item.gsmLongCallSamplesMCI.length > 0)
    } else if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MTN") {
      const gsmLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { gsmLongCallSamplesMTN: true } })
      return gsmLongCallData.filter(item => item.gsmLongCallSamplesMTN.length > 0)
    }
    else {
      return ([])
    }
  }

  async getDTCurrentWCDMALockLongCall(op: "MCI" | "MTN") {
    if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MCI") {
      const wcdmaLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { wcdmaLongCallSamplesMCI: true } })
      return wcdmaLongCallData.filter(item => item.wcdmaLongCallSamplesMCI.length > 0)
    } else if (this.portsInitialized && this.gpsInitialized && this.inspection && op === "MTN") {
      const wcdmaLongCallData = await this.gpsDataRepo.find({ where: { inspection: { id: this.inspection.id } }, relations: { wcdmaLongCallSamplesMTN: true } })
      return wcdmaLongCallData.filter(item => item.wcdmaLongCallSamplesMTN.length > 0)
    }
    else {
      return ([])
    }
  }
}
