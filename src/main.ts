import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { initializeTransactionalContext } from "typeorm-transactional";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import * as config from "config";
import { json, urlencoded } from "express";

async function bootstrap() {
  dotenv.config(); // .env 파일 로드
  initializeTransactionalContext();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: `http://${config.get("FE").get("domain")}:${config
      .get("FE")
      .get("port")}`,
    credentials: true,
    preflightContinue: false,
  });
  app.use(cookieParser());
  app.use(json({ limit: "2mb" }));
  app.use(urlencoded({ limit: "2mb", extended: true }));
  await app.listen(config.get("BE").get("port"));
}
bootstrap();
