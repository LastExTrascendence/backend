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
import { userSessionDto } from "src/user/dto/user.dto";
import * as config from "config";
import { UserService } from "src/user/user.service";

@Injectable()
export class JWTSignGuard implements CanActivate {
  private logger = new Logger(JWTSignGuard.name);

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    return this.generateJWT(req, res);
  }

  private async generateJWT(request: any, response: any): Promise<boolean> {
    this.logger.verbose(`Called ${JWTSignGuard.name} ${this.generateJWT.name}`);
    let user = request.user as userSessionDto | undefined;
    if (user === undefined) {
      this.logger.debug(`cannot generate JWT`);
      return false;
    }
    try {
      const result = await this.userService.findUserByIntraname(
        user.intra_name,
      );
      user.id = result.id;
      user.nickname = result.nickname;
      user.two_fa = result.two_fa;
      user.two_fa_complete = !result.two_fa;
      user.language = result.language;
    } catch (error) {
      this.logger.verbose(`cannot find user ${user.intra_name} in DB`);
      user.two_fa_complete = true;
      user.language = "en";
    }
    const token = this.jwtService.sign(user);
    this.logger.debug(`genereted ${user.intra_name}'s JWT`);

    if (config.get("IS_LOCAL") === true) {
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
