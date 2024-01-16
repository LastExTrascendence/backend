import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as cookieParser from "cookie-parser";
import { Middleware } from "./middleware";

@Injectable()
export class SessionMiddleware {
  cookieParser: Middleware;
  helmet: Middleware;
  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.cookieParser = cookieParser();
  }
}
