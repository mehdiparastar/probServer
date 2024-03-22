import { Module } from '@nestjs/common';
import { ProbService } from './prob.service';
import { ProbController } from './prob.controller';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Quectel } from './entities/quectel.entity';
import { GPSData } from './entities/gps-data.entity';
import { User } from './entities/user.entity';
import { GSMIdleMCI } from './entities/gsmIdleMCI.entity';
import { Inspection } from './entities/inspection.entity';
import { WCDMAIdleMCI } from './entities/wcdmaIdleMCI.entity';
import { LTEIdleMCI } from './entities/lteIdleMCI.entity';
import { GSMLongCallMCI } from './entities/gsmLongCallMCI.entity';
import { WCDMALongCallMCI } from './entities/wcdmaLongCallMCI.entity';
import { FTPDL } from './entities/ftpDL.entity';
import { FTPUL } from './entities/ftpUL.entity';
import { GPSService } from './gps.service';
import { MSData } from './entities/ms-data.entity';
import { MSService } from './ms.service'
import { GSMIdleService } from './idle.gsm.service';
import { WCDMAIdleService } from './idle.wcdma.service';
import { LTEIdleService } from './idle.lte.service';
import { GSMLongCallService } from './longCall.gsm.service';
import { WCDMALongCallService } from './longCall.wcdma.service';
import { ProbGateway } from './prob.gateway';
import { Repository } from 'typeorm';
import { GSMIdleMTN } from './entities/gsmIdleMTN.entity';
import { WCDMAIdleMTN } from './entities/wcdmaIdleMTN.entity';
import { LTEIdleMTN } from './entities/lteIdleMTN.entity';
import { GSMLongCallMTN } from './entities/gsmLongCallMTN.entity ';
import { WCDMALongCallMTN } from './entities/wcdmaLongCallMTN.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Quectel,
      GPSData,
      GSMIdleMCI,
      WCDMAIdleMCI,
      LTEIdleMCI,
      GSMLongCallMCI,
      WCDMALongCallMCI,
      GSMIdleMTN,
      WCDMAIdleMTN,
      LTEIdleMTN,
      GSMLongCallMTN,
      WCDMALongCallMTN,
      Inspection,
      FTPDL,
      FTPUL,
      MSData
    ])
  ],
  controllers: [ProbController],
  providers: [
    ProbService,
    GPSService,
    {
      provide: 'MSService01',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [2]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService02',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [6]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService03',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [10]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService04',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [14]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService05',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [18]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService06',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [22]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService07',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [26]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService08',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [30]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService09',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [34]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService10',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [38]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService11',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [42]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'MSService12',
      useFactory: (msDataRepo: Repository<MSData>, probSocketGateway: ProbGateway) => {
        return new MSService(msDataRepo, probSocketGateway, [46]);
      },
      inject: [getRepositoryToken(MSData), ProbGateway],
    },
    {
      provide: 'GSMIdleMCIService',
      useFactory: (msDataRepo: Repository<MSData>, gsmIdlesRepo: Repository<GSMIdleMCI>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new GSMIdleService(msDataRepo, gsmIdlesRepo, gpsDataRepo, probSocketGateway, "MCI");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(GSMIdleMCI), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'GSMIdleMTNService',
      useFactory: (msDataRepo: Repository<MSData>, gsmIdlesRepo: Repository<GSMIdleMTN>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new GSMIdleService(msDataRepo, gsmIdlesRepo, gpsDataRepo, probSocketGateway, "MTN");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(GSMIdleMTN), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'WCDMAIdleMCIService',
      useFactory: (msDataRepo: Repository<MSData>, wcdmaIdlesRepo: Repository<WCDMAIdleMCI>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new WCDMAIdleService(msDataRepo, wcdmaIdlesRepo, gpsDataRepo, probSocketGateway, "MCI");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(WCDMAIdleMCI), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'WCDMAIdleMTNService',
      useFactory: (msDataRepo: Repository<MSData>, wcdmaIdlesRepo: Repository<WCDMAIdleMTN>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new WCDMAIdleService(msDataRepo, wcdmaIdlesRepo, gpsDataRepo, probSocketGateway, "MTN");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(WCDMAIdleMTN), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'LTEIdleMCIService',
      useFactory: (msDataRepo: Repository<MSData>, lteIdlesRepo: Repository<LTEIdleMCI>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new LTEIdleService(msDataRepo, lteIdlesRepo, gpsDataRepo, probSocketGateway, "MCI");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(LTEIdleMCI), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'LTEIdleMTNService',
      useFactory: (msDataRepo: Repository<MSData>, lteIdlesRepo: Repository<LTEIdleMTN>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new LTEIdleService(msDataRepo, lteIdlesRepo, gpsDataRepo, probSocketGateway, "MTN");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(LTEIdleMTN), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'GSMLongCallMCIService',
      useFactory: (msDataRepo: Repository<MSData>, gsmLongCallsRepo: Repository<GSMLongCallMCI>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new GSMLongCallService(msDataRepo, gsmLongCallsRepo, gpsDataRepo, probSocketGateway, "MCI");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(GSMLongCallMCI), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'GSMLongCallMTNService',
      useFactory: (msDataRepo: Repository<MSData>, gsmLongCallsRepo: Repository<GSMLongCallMTN>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new GSMLongCallService(msDataRepo, gsmLongCallsRepo, gpsDataRepo, probSocketGateway, "MTN");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(GSMLongCallMTN), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'WCDMALongCallMCIService',
      useFactory: (msDataRepo: Repository<MSData>, gsmLongCallsRepo: Repository<WCDMALongCallMCI>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new WCDMALongCallService(msDataRepo, gsmLongCallsRepo, gpsDataRepo, probSocketGateway, "MCI");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(WCDMALongCallMCI), getRepositoryToken(GPSData), ProbGateway],
    },
    {
      provide: 'WCDMALongCallMTNService',
      useFactory: (msDataRepo: Repository<MSData>, gsmLongCallsRepo: Repository<WCDMALongCallMTN>, gpsDataRepo: Repository<GPSData>, probSocketGateway: ProbGateway) => {
        return new WCDMALongCallService(msDataRepo, gsmLongCallsRepo, gpsDataRepo, probSocketGateway, "MTN");
      },
      inject: [getRepositoryToken(MSData), getRepositoryToken(WCDMALongCallMTN), getRepositoryToken(GPSData), ProbGateway],
    },
    ProbGateway,
  ],
  exports: [
    'MSService01',
    'MSService02',
    'MSService03',
    'MSService04',
    'MSService05',
    'MSService06',
    'MSService07',
    'MSService08',
    'MSService09',
    'MSService10',
    'MSService11',
    'MSService12',
    'GSMIdleMCIService',
    'GSMIdleMTNService',
    'WCDMAIdleMCIService',
    'WCDMAIdleMTNService',
    'LTEIdleMCIService',
    'LTEIdleMTNService',
    'GSMLongCallMCIService',
    'GSMLongCallMTNService',
    'WCDMALongCallMCIService',
    'WCDMALongCallMTNService',
  ],
})
export class ProbModule { }
