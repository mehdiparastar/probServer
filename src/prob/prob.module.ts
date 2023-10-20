import { Module } from '@nestjs/common';
import { ProbService } from './prob.service';
import { ProbController } from './prob.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quectel } from './entities/quectel.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Quectel])],
  controllers: [ProbController],
  providers: [ProbService],
})
export class ProbModule {}
