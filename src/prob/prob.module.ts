import { Module } from '@nestjs/common';
import { ProbService } from './prob.service';
import { ProbController } from './prob.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quectel } from './entities/quectel.entity';
import { GPSData } from './entities/gps-data.entity';
import { User } from './entities/user.entity';
import { GSMIdle } from './entities/gsmIdle.entity';
import { Inspection } from './entities/inspection.entity';
import { WCDMAIdle } from './entities/wcdmaIdle.entity';
import { LTEIdle } from './entities/lteIdle.entity';
import { ALLTECHIdle } from './entities/alltechIdle.entity';
import { GSMLongCall } from './entities/gsmLongCall.entity';
import { WCDMALongCall } from './entities/wcdmaLongCall.entity';
import { FTPDL } from './entities/ftpDL.entity';
import { FTPUL } from './entities/ftpUL.entity';
import { GPSService } from './gps.service';
import { MSData } from './entities/ms-data.entity';
import { MSService } from './ms.service'
import { GSMIdleService } from './idle.gsm.service';
import { WCDMAIdleService } from './idle.wcdma.service';
import { LTEIdleService } from './idle.lte.service';
import { ALLTECHIdleService } from './idle.allTech.service';
import { GSMLongCallService } from './longCall.gsm.service';
import { WCDMALongCallService } from './longCall.wcdma.service';
import { ProbGateway } from './prob.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Quectel,
      GPSData,
      GSMIdle,
      WCDMAIdle,
      LTEIdle,
      ALLTECHIdle,
      GSMLongCall,
      WCDMALongCall,
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
    MSService,
    GSMIdleService,
    WCDMAIdleService,
    LTEIdleService,
    ALLTECHIdleService,
    GSMLongCallService,
    WCDMALongCallService,
    ProbGateway
  ],
})
export class ProbModule { }
