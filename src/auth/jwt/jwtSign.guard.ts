import { CookieOptions, Request, Response } from "express";
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UserSessionDto } from "src/user/dto/user.dto";
import * as config from "config";

@Injectable()
export class JWTSignGuard implements CanActivate {
  private logger = new Logger(JWTSignGuard.name);

  constructor(
    private jwtService: JwtService,
    @Inject(ConfigService) private configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    return this.generateJWT(req, res);
  }

  private generateJWT(request: any, response: any): boolean {
    this.logger.verbose(`Called ${JWTSignGuard.name} ${this.generateJWT.name}`);
    const user = request.user as UserSessionDto | undefined;
    if (user === undefined) {
      this.logger.debug(`cannot generate JWT`);
      return false;
    }
    const token = this.jwtService.sign(user);
    this.logger.debug(`genereted ${user.intra_name}'s JWT`);
    if (this.configService.get<boolean>("is_local") === true) {
      response.cookie("access_token", token);
    } else {
      const expires = new Date(this.jwtService.decode(token)["exp"] * 1000);
      const cookieOptions: CookieOptions = {
        expires,
        httpOnly: false,
        domain: config.get("FE").get("domain"),
      };
      response.cookie("access_token", token, cookieOptions);
    }
    return true;
  }
}
