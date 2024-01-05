import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import * as config from "config";

async function bootstrap() {
  dotenv.config(); // .env 파일 로드
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: config.get("FE").get("domain"),
    credentials: true,
    preflightContinue: false,
  });
  app.useStaticAssets(join(__dirname, "..", "static"));
  app.use(cookieParser());
  await app.listen(config.get("server").get("port"));
}
bootstrap();
