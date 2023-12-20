import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

async function bootstrap() {
  dotenv.config(); // .env 파일 로드
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "http://localhost:3333",
    credentials: true,
    preflightContinue: false,
  });
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
