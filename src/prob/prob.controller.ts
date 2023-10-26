import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProbService } from './prob.service';
import { CreateProbDto } from './dto/create-prob.dto';
import { UpdateProbDto } from './dto/update-prob.dto';
import { ATCommandDto } from './dto/AT-command.dto'
import { StartLogDto } from './dto/start-log.dto';

@Controller('prob')
export class ProbController {
  constructor(private readonly probService: ProbService) { }

  @Post()
  create(@Body() createProbDto: CreateProbDto) {
    return this.probService.create(createProbDto);
  }

  @Get()
  findAllModeles() {
    return this.probService.findAllModules();
  }

  @Post('run-at-command')
  runATCommand(@Body() body: ATCommandDto) {
    return this.probService.runATCommand(body.portNumber, body.command)
  }

  @Get('port-initializing')
  portInitializing() {
    return this.probService.allPortsInitializing()
  }

  @Get('get-modules-status')
  getModelesStatus() {
    return this.probService.getModulesStatus()
  }

  @Get('enableGPS')
  async enablingGPS() {
    return await this.probService.enablingGPS()
  }

  @Post('start')
  start(@Body() body: StartLogDto) {
    return this.probService.startLog(body.type, body.code, body.expertId)
  }

  @Post('pause')
  pause() {
    return this.probService.pauseLog()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.probService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProbDto: UpdateProbDto) {
    return this.probService.update(+id, updateProbDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.probService.remove(+id);
  }
}
