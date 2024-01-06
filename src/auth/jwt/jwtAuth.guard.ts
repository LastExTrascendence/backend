import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JWTAuthGuard extends AuthGuard("jwt") {
  handleRequest<T = any>(err: any, user: any): T {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          "로그인 정보가 유효하지 않습니다\n다시 로그인해주세요",
        )
      );
    }
    return user;
  }
}
