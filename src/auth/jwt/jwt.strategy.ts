import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../../user/entity/user.entity";
import * as config from "config";
import { Repository } from "typeorm";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private logger = new Logger(JwtStrategy.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    super({
      secretOrKey: process.env.JWT_SECRET || config.get("jwt.secret"),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload): Promise<User> {
    this.logger.verbose(
      `Called ${JwtStrategy.name} ${this.validate.name} by ${payload.intra_name}`,
    );
    const { intra_name } = payload;
    const user: User = await this.userRepository.findOne({
      where: { intra_name },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
