// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import * as cookieParser from 'cookie-parser';
// import * as dotenv from 'dotenv';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { join } from 'path';
// import { IoAdapter } from '@nestjs/platform-socket.io';

// async function bootstrap() {

//   dotenv.config(); // .env 파일 로드
//   // const app = await NestFactory.create(AppModule);
//   const app = await NestFactory.create< NestExpressApplication>(AppModule);
//   app.enableCors({ credentials: true, origin: 'http://localhost:3000' });
//   app.use(cookieParser());
//   app.useStaticAssets(join(__dirname, '..', 'static'));
//   app.useWebSocketAdapter(new IoAdapter(app));
//   await app.listen(3000);
// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create< NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join(__dirname, '..', 'static'));
  await app.listen(3000);
}
bootstrap();
