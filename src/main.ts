import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

async function bootstrap() {
  dotenv.config(); // .env 파일 로드
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: "http://10.19.239.198:3333",
    credentials: true,
    preflightContinue: false,
  });
  app.useStaticAssets(join(__dirname, "..", "static"));
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
