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

@Module({
  imports: [TypeOrmModule.forFeature([User, Quectel, GPSData, GSMIdle, WCDMAIdle, LTEIdle, ALLTECHIdle, GSMLongCall, Inspection])],
  controllers: [ProbController],
  providers: [ProbService],
})
export class ProbModule { }
