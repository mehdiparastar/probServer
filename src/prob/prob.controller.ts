import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { ProbService } from './prob.service';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { ATCommandDto } from './dto/AT-command.dto'
import { StartLogDto } from './dto/start-log.dto';
import { dtCurrentStatusENUM } from './enum/dtcurrentStatus.enum';
import { Response } from 'express';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { InspectionDto } from './dto/inspection.dto';


@Controller('prob')
export class ProbController {
  constructor(
    private readonly probService: ProbService,
  ) { }

  @Get('prob-socket')
  getProbSocket() {
    return this.probService.getProbSocket()
  }


  @Post('get-kml')
  getKML(@Body() body: { inspectionId: number }) {
    return this.probService.getKML(body.inspectionId)
  }

  @Post('init-dt')
  initDT(@Body() body: StartLogDto) {
    return this.probService.initDT(body.type, body.code, body.expertId)
  }

  @Get('start-dt')
  startDT() {
    return this.probService.start()
  }

  @Get('stop-dt')
  stopDT() {
    return this.probService.stop()
  }

  @Get('start-recording')
  startRecording() {
    return this.probService.startRecording()
  }

  @Get('pause-recording')
  pauseRecording() {
    return this.probService.pauseRecording()
  }

  @Get('portsInitingStatus')
  portsInitingStatus() {
    return global.portsInitingStatus
  }

  @Get('getDTCurrentStatus')
  getDTCurrentStatus() {
    return { status: global.dtCurrentStatus }
  }

  @Get('getDTCurrentExpertId')
  getDTCurrentExpertId() {
    return this.probService.getDTCurrentExpertId()
  }

  @Get('getDTCurrentLogLocType')
  getDTCurrentLogLocType() {
    return this.probService.getDTCurrentLogLocType()
  }

  @Get('getDTCurrentLogLocCode')
  getDTCurrentLogLocCode() {
    return this.probService.getDTCurrentLogLocCode()
  }

  @Get('getDTCurrentGSMLockIdle_MCI')
  getDTCurrentGSMLockIdle_MCI() {
    return this.probService.getDTCurrentGSMLockIdle("MCI")
  }

  @Get('getDTCurrentGSMLockIdle_MTN')
  getDTCurrentGSMLockIdle_MTN() {
    return this.probService.getDTCurrentGSMLockIdle("MTN")
  }

  @Get('getDTCurrentWCDMALockIdle_MCI')
  getDTCurrentWCDMALockIdle_MCI() {
    return this.probService.getDTCurrentWCDMALockIdle("MCI")
  }

  @Get('getDTCurrentWCDMALockIdle_MTN')
  getDTCurrentWCDMALockIdle_MTN() {
    return this.probService.getDTCurrentWCDMALockIdle("MTN")
  }

  @Get('getDTCurrentLTELockIdle_MCI')
  getDTCurrentLTELockIdle_MCI() {
    return this.probService.getDTCurrentLTELockIdle("MCI")
  }

  @Get('getDTCurrentLTELockIdle_MTN')
  getDTCurrentLTELockIdle_MTN() {
    return this.probService.getDTCurrentLTELockIdle("MTN")
  }

  @Get('getDTCurrentGSMLockLongCall_MCI')
  getDTCurrentGSMLockLongCall_MCI() {
    return this.probService.getDTCurrentGSMLockLongCall("MCI")
  }

  @Get('getDTCurrentGSMLockLongCall_MTN')
  getDTCurrentGSMLockLongCall_MTN() {
    return this.probService.getDTCurrentGSMLockLongCall("MTN")
  }

  @Get('getDTCurrentWCDMALockLongCall_MCI')
  getDTCurrentWCDMALockLongCall_MCI() {
    return this.probService.getDTCurrentWCDMALockLongCall("MCI")
  }

  @Get('getDTCurrentWCDMALockLongCall_MTN')
  getDTCurrentWCDMALockLongCall_MTN() {
    return this.probService.getDTCurrentWCDMALockLongCall("MTN")
  }

  @Get('getAllInspections')
  @Serialize(InspectionDto)
  getAllInspections() {
    return this.probService.getAllInspections();
  }

  @Get('getCurrentActiveInspection')
  @Serialize(InspectionDto)
  getCurrentActiveInspection() {
    return this.probService.getCurrentActiveInspection();
  }

  @Post('find-ms-details')
  findMSDetails(@Body() body: { inspectionId: number }) {
    return this.probService.findMSDetails(body.inspectionId)
  }


  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateProbDto: UpdateProbDto) {
  //   return this.probService.update(+id, updateProbDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.probService.remove(+id);
  // }
}
