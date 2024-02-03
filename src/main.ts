import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  global.recording = false
  global.activeIntervals = []

  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('PROB api')
    .setDescription('Drive Test Module')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  const configService = app.get(ConfigService<IconfigService>);
  const serverPort = configService.get<number>('SERVER_PORT');

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false, // Allow sending cookies from the client
  });

  app.use(express.static(join(__dirname, '..', 'public')));

  await app.listen(serverPort, async () => {
    console.log(`Application is running on: ${await app.getUrl()}`);
  });
}
bootstrap();
