import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as config from 'config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  //default.yaml에 있는 server 부분을 가져옴
  const serverConfig = config.get('server');
  const port = serverConfig.port;
  await app.listen(3000);
  Logger.log(`Application running on port ${port}`);
}
bootstrap();
