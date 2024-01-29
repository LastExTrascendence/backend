import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";
import { userSessionDto } from "src/user/dto/user.dto";

@Injectable()
export class JWTUserCreationGuard implements CanActivate {
  private logger = new Logger(JWTUserCreationGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const token = request.headers.authorization?.split(" ")[1];
    if (!token) return false;
    try {
      const validToken = this.jwtService.verify(token);
      return this.generateJWT(request, response, token);
    } catch (error) {
      return false;
    }
  }

  private async generateJWT(request: any, response: any, jwt: string) {
    this.logger.verbose(
      `Called ${JWTUserCreationGuard.name} ${this.generateJWT.name}`,
    );
    const decoded = this.jwtService.decode(jwt);
    if (!decoded) return false;
    const user = {
      nickname: request.body.nickname,
      email: decoded["email"],
      two_fa: decoded["two_fa"],
      status: decoded["status"],
      intra_name: decoded["intra_name"],
      two_fa_complete: decoded["two_fa_complete"],
      language: decoded["language"] ?? "en",
    };
    const token = this.jwtService.sign(user);
    response.cookie("access_token", token);
    return true;
  }
}
