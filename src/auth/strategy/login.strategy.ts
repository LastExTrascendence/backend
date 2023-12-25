import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../../user/entity/user.entity";
import * as Config from "config";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";

@Injectable()
export class loginStrategy extends PassportStrategy(Strategy, "login") {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    super({
      secretOrKey: process.env.JWT_SECRET || Config.get("jwt.secret"),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(access_token: string): Promise<User | HttpException> {
    try {
      const req = await axios.get("https://api.intra.42.fr/v2/me", {
        headers: { Authorization: `Bearer ${access_token}` }, //authentication code
      });
      return req.data.login;
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
