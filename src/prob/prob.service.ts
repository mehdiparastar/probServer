import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ALLTECHIdle } from './entities/alltechIdle.entity';
import { FTPDL } from './entities/ftpDL.entity';
import { FTPUL } from './entities/ftpUL.entity';
import { GPSData } from './entities/gps-data.entity';
import { GSMIdle } from './entities/gsmIdle.entity';
import { GSMLongCall } from './entities/gsmLongCall.entity';
import { Inspection } from './entities/inspection.entity';
import { LTEIdle } from './entities/lteIdle.entity';
import { Quectel } from './entities/quectel.entity';
import { User } from './entities/user.entity';
import { WCDMAIdle } from './entities/wcdmaIdle.entity';
import { WCDMALongCall } from './entities/wcdmaLongCall.entity';
import { MSService } from './ms.service';
import { GPSService } from './gps.service';
import { GSMIdleService } from './idle.gsm.service';
import { MSData } from './entities/ms-data.entity';
import { logLocationType } from './enum/logLocationType.enum';
import { WCDMAIdleService } from './idle.wcdma.service';
import { LTEIdleService } from './idle.lte.service';
import { ALLTECHIdleService } from './idle.allTech.service';
import { GSMLongCallService } from './longCall.gsm.service';
import { WCDMALongCallService } from './longCall.wcdma.service';
import * as fs from 'fs';
import { callStatus } from './enum/callStatus.enum';


const sleep = async (milisecond: number) => {
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
    pointValue: number;
    valueName: string;
    pointColor: string;
    pointMNC: string;
    pointMCC: string;
    pointTech: string;
    pointCallStatus: callStatus;
    pointTCH: string;
  };
}

@Injectable()
export class ProbService implements OnModuleInit {
  private readonly logger = new Logger(ProbService.name);
  private inspection: Inspection
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
    @InjectRepository(GSMIdle) private gsmIdlesRepo: Repository<GSMIdle>,
    @InjectRepository(WCDMAIdle) private wcdmaIdlesRepo: Repository<WCDMAIdle>,
    @InjectRepository(LTEIdle) private lteIdlesRepo: Repository<LTEIdle>,
    @InjectRepository(ALLTECHIdle) private allTechIdlesRepo: Repository<ALLTECHIdle>,
    @InjectRepository(GSMLongCall) private gsmLongCallRepo: Repository<GSMLongCall>,
    @InjectRepository(WCDMALongCall) private wcdmaLongCallRepo: Repository<WCDMALongCall>,
    @InjectRepository(FTPDL) private ftpDLRepo: Repository<FTPDL>,
    @InjectRepository(FTPUL) private ftpULRepo: Repository<FTPUL>,
    @InjectRepository(MSData) private msDataRepo: Repository<MSData>,
    private msService: MSService,
    private gpsService: GPSService,
    private gsmIdleService: GSMIdleService,
    private wcdmaIdleService: WCDMAIdleService,
    private lteIdleService: LTEIdleService,
    private alltechIdleService: ALLTECHIdleService,
    private gsmLongCallService: GSMLongCallService,
    private wcdmaLongCallService: WCDMALongCallService,
  ) {
  }

  async onModuleInit() {


  }

  private getRxLevColor(rxLev: number): string {
    if (rxLev < -93) {
      return styleDict.red //'ff0000'; // Red
    } else if (rxLev >= -90) {
      return styleDict.green // '00ff00'; // Green
    } else if (rxLev >= -93 && rxLev < -90) {
      return styleDict.yellow // 'ffff00'; // Yellow
    } {
      return styleDict.black //'000'; // Black
    }
  };

  private getRxQualColor(rxQual: number): string {
    if (rxQual < 5) {
      return styleDict.green // '00ff00'; // Green
    } else if (rxQual >= 6) {
      return styleDict.red //'ff0000'; // Red
    } else if (rxQual >= 5 && rxQual < 6) {
      return styleDict.yellow // 'ffff00'; // Yellow
    } {
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


        this.logger.error('------------------- start ms service -----------------------')
        this.portsInitializing = true
        await this.msService.portsInitializing(this.inspection)
        this.portsInitialized = true
        this.portsInitializing = false
        this.logger.error('------------------- end ms service -----------------------')

        this.logger.error('------------------- start gps service -----------------------')
        this.gpsInitializing = true
        await this.gpsService.portsInitializing(this.inspection)
        this.gpsInitialized = true
        this.gpsInitializing = false
        this.logger.error('------------------- end gps service -----------------------')

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

      this.logger.error('------------------- start gsm idle service -----------------------')
      await this.gsmIdleService.portsInitializing(2, this.inspection)
      this.logger.error('------------------- end gsm idle service -----------------------')

      this.logger.error('------------------- start wcdma idle service -----------------------')
      await this.wcdmaIdleService.portsInitializing(6, this.inspection)
      this.logger.error('------------------- end wcdma idle service -----------------------')

      this.logger.error('------------------- start lte idle service -----------------------')
      await this.lteIdleService.portsInitializing(10, this.inspection)
      this.logger.error('------------------- end lte idle service -----------------------')

      this.logger.error('------------------- start alltech idle service -----------------------')
      await this.alltechIdleService.portsInitializing(14, this.inspection)
      this.logger.error('------------------- end alltech idle service -----------------------')

      this.logger.error('------------------- start gsm LongCall service -----------------------')
      await this.gsmLongCallService.portsInitializing(18, this.inspection)
      this.logger.error('------------------- end gsm LongCall service -----------------------')

      this.logger.error('------------------- start wcdma LongCall service -----------------------')
      await this.wcdmaLongCallService.portsInitializing(22, this.inspection)
      this.logger.error('------------------- end wcdma LongCall service -----------------------')


      this.firstStartDT = true
      this.startRecording()

      return { msg: `DT started successfully.` }

    }
    else {
      return { msg: `please init first.` }
    }
  }

  async truncate() {
    // Truncate table using raw SQL query
    await this.gsmIdlesRepo.query(`delete from ${this.gsmIdlesRepo.metadata.tableName}`);
    await this.wcdmaIdlesRepo.query(`delete from ${this.wcdmaIdlesRepo.metadata.tableName}`);
    await this.lteIdlesRepo.query(`delete from ${this.lteIdlesRepo.metadata.tableName}`);
    await this.allTechIdlesRepo.query(`delete from ${this.allTechIdlesRepo.metadata.tableName}`);
    await this.gsmLongCallRepo.query(`delete from ${this.gsmLongCallRepo.metadata.tableName}`);
    await this.wcdmaLongCallRepo.query(`delete from ${this.wcdmaLongCallRepo.metadata.tableName}`);
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
      const gsmIdleData = await this.gsmIdlesRepo.find({ where: { inspection: { id: inspection.id } }, relations: { location: true, inspection: true } })
      const gsmIdle_kmlContent = this.generateKMLContent(
        gsmIdleData.filter(item => !!item.location)
          .map(point => ({
            location: {
              latitude: point.location.latitude,
              longitude: point.location.longitude
            },
            data: {
              pointValue: Number(point.rxlev),
              valueName: 'RxLev',
              pointColor: this.getRxLevColor(Number(point.rxlev)),
              pointMNC: point.mnc,
              pointMCC: point.mcc,
              pointTech: point.tech,
              pointCallStatus: callStatus.Idle,
              pointTCH: point.tch
            }
          })),
        inspection,
        'gsmIdle'
      )

      const gsmIdle_filePath = 'gsmIdle.kml';
      fs.writeFileSync(gsmIdle_filePath, gsmIdle_kmlContent);


      const gsmLongCallData = await this.gsmLongCallRepo.find({ where: { inspection: { id: inspection.id } }, relations: { location: true, inspection: true } })
      const gsmLongCall_kmlContent = this.generateKMLContent(
        gsmLongCallData.filter(item => !!item.location)
          .map(point => ({
            location: {
              latitude: point.location.latitude,
              longitude: point.location.longitude
            },
            data: {
              pointValue: Number(point.rxqualsub),
              valueName: 'RxQualSUB',
              pointColor: this.getRxQualColor(Number(point.rxqualsub)),
              pointMNC: point.mnc,
              pointMCC: point.mcc,
              pointTech: point.tech,
              pointCallStatus: point.callingStatus,
              pointTCH: point.tch
            }
          })),
        inspection,
        'gsmLongCall'
      )

      const gsmLongCall_filePath = 'gsmLongCall.kml';
      fs.writeFileSync(gsmLongCall_filePath, gsmLongCall_kmlContent);

      return { msg: `KMLs Created successfully.` }

    }
    else {
      return { msg: `provided inspection not found.` }
    }
  }

  async startRecording() {
    if (this.firstStartDT === true && global.recording === false) {
      global.recording = true
      return { msg: 'recording started successfully.' }
    }
  }

  async pauseRecording() {
    if (global.recording === true) {
      global.recording = false
      return { msg: 'recording paused successfully.' }
    }
  }
}
