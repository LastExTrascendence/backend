import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class FortyTwoAuthGuard extends AuthGuard("fortytwo") {
  handleRequest(err, user, info, context) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}

@Injectable()
export class JWTAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class loginAuthGuard extends AuthGuard("login") {}
