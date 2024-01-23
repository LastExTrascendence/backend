import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TwoFAGuard implements CanActivate {
  private logger = new Logger(TwoFAGuard.name);
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    this.logger.verbose(`Called ${TwoFAGuard.name} ${this.canActivate.name}`);
    const request = context.switchToHttp().getRequest();
    const jwt = request.cookies["access_token"];
    const payload = this.jwtService.decode(jwt);
    return payload.two_fa_complete || !payload.two_fa;
  }
}
