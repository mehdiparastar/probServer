import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { join } from 'path';
import { ApplicationSocketIOAdapter } from './socket-io-adaptor';
import { dtCurrentStatusENUM } from './prob/enum/dtcurrentStatus.enum';

async function bootstrap() {
  global.recording = false
  global.activeIntervals = []
  global.portsInitingStatus = []
  global.dtCurrentStatus = dtCurrentStatusENUM.idle

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<IconfigService>);
  const serverPort = configService.get<number>('SERVER_PORT');

  app.enableCors();

  app.useWebSocketAdapter(new ApplicationSocketIOAdapter(app, configService));

  app.use(express.static(join(__dirname, '..', '..', 'prob_front', 'build')));

  await app.listen(serverPort, async () => {
    console.log(`Application is running on: ${await app.getUrl()}`);
  });
}
bootstrap();
