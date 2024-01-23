import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JWTWebSocketGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token;
    const bearerToken = token.split(" ")[1];
    if (!bearerToken) return false;
    try {
      const validToken = this.jwtService.verify(bearerToken);
      const decodedToken = this.jwtService.decode(bearerToken);
      return Boolean(validToken) && decodedToken.two_fa_complete;
    } catch (error) {
      throw new Error(error);
    }
  }
}
