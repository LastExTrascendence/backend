import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class FortyTwoAuthGuard extends AuthGuard("fortytwo") {
  handleRequest<T = any>(err: any, user: any): T {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
