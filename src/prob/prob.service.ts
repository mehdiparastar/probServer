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
import { GSMIdleService } from './gsmIdle.service';
import { MSData } from './entities/ms-data.entity';


const sleep = async (milisecond: number) => {
  await new Promise(resolve => setTimeout(resolve, milisecond))
}

@Injectable()
export class ProbService implements OnModuleInit {
  private readonly logger = new Logger(ProbService.name);

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
    private gsmIdleService: GSMIdleService
  ) {
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
    await this.ftpULRepo.query(`delete from ${this.ftpULRepo.metadata.tableName}`);
    await this.quectelsRepo.query(`delete from ${this.quectelsRepo.metadata.tableName}`);
    await this.inspectionsRepo.query(`delete from ${this.inspectionsRepo.metadata.tableName}`);
    await this.gpsDataRepo.query(`delete from ${this.gpsDataRepo.metadata.tableName}`);
    await this.msDataRepo.query(`delete from ${this.msDataRepo.metadata.tableName}`);

    this.logger.error('------------------- start ms service -----------------------')
    await this.msService.portsInitializing()
    this.logger.error('------------------- end ms service -----------------------')

    this.logger.error('------------------- start gps service -----------------------')
    await this.gpsService.portsInitializing()
    this.logger.error('------------------- end gps service -----------------------')

    this.logger.error('------------------- start gsm idle service -----------------------')
    await this.gsmIdleService.portsInitializing(2)
    this.logger.error('------------------- end gsm idle service -----------------------')

  }
}
