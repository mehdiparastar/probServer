import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { ProbService } from './prob.service';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { ATCommandDto } from './dto/AT-command.dto'
import { StartLogDto } from './dto/start-log.dto';
import { dtCurrentStatusENUM } from './enum/dtcurrentStatus.enum';
import { Response } from 'express';


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

  @Get('getDTCurrentGSMLockIdle')
  getDTCurrentGSMLockIdle() {
    return this.probService.getDTCurrentGSMLockIdle()
  }


  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.probService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateProbDto: UpdateProbDto) {
  //   return this.probService.update(+id, updateProbDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.probService.remove(+id);
  // }
}
