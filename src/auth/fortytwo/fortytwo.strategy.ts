import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-42";
import { UserStatus } from "src/user/entity/user.enum";
import * as config from "config";
import { userSessionDto } from "src/user/dto/user.dto";

const ftConfig = config.get("FORTYTWO");

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, "fortytwo") {
  private logger = new Logger(FortyTwoStrategy.name);
  constructor() {
    super({
      clientID: ftConfig.get<string>("CLIENT_ID"),
      clientSecret: ftConfig.get<string>("CLIENT_SECRET"),
      callbackURL: ftConfig.get<string>("CALLBACK_URL"),
      passReqToCallback: true,
      profileFields: {
        email: "email",
        intra_name: "login",
      },
      scope: `public`,
    });
  }

  async validate(
    request: any,
    access_token: string,
    refresh_token: string,
    profile: any,
    callback,
  ): Promise<any> {
    this.logger.verbose(
      `Called ${FortyTwoStrategy.name} ${this.validate.name} by ${profile.intra_name}`,
    );
    const user: userSessionDto = {
      id: profile.user_id,
      nickname: null,
      avatar: null,
      email: profile.email,
      two_fa: false,
      status: UserStatus.OFFLINE,
      intra_name: profile.intra_name,
      two_fa_complete: true,
      language: "en",
    };
    callback(null, user);
  }
}
