import { Module } from '@nestjs/common';
import { ProbService } from './prob.service';
import { ProbController } from './prob.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quectel } from './entities/quectel.entity';
import { GPSData } from './entities/gps-data.entity';
import { User } from './entities/user.entity';
import { GSMIdle } from './entities/gsmIdle.entity';
import { Inspection } from './entities/inspection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Quectel, GPSData, GSMIdle, Inspection])],
  controllers: [ProbController],
  providers: [ProbService],
})
export class ProbModule { }
