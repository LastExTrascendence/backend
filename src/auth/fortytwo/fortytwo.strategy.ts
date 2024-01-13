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
    };
    callback(null, user);
  }
}

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//   ): Promise<any> {
//     try {
//       const user = {
//         intra_name: profile.id,
//         nickname: profile.username,
//         avatar: profile.photos[0].value,
//         access_token: accessToken,
//         // avatar : profile._json.image[0'link']],
//         email: profile.emails[0].value,
//       };
//       // console.log(profile);
//       return user;
//     } catch (e) {
//       return new HttpException(e.message, HttpStatus.BAD_REQUEST);
//     }
//   }
// }

//   async validate (accessToken: string, refreshToken: string): Promise<any> {
//   //   try {
//   //     console.log('accessToken: ', accessToken);
//   //     console.log('refreshToken: ', refreshToken);
//   //     return accessToken;
//   //   } catch (error) {
//   //     console.log(error);
//   //   }
//   // }

//     //저 도메인이 42api에서 나의 정보를 불러오는 도메인인데 -> acctoken 그걸로 내 정보 권한을 얻는다.
//   try {
//     const req = await axios.get('https://api.intra.42.fr/v2/me', {
//       headers: { Authorization: `Bearer ${accessToken}` }, //authentication code
//     });

//     return req.data.login;
//   } catch (error) {
//     console.log(error);
//   }
// }
// }

//https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code

//https://api.intra.42.fr/oauth/authorize?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2FFORTYTWO_CLIENT_CALLBACK%3Dhttp%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&client_id=FORTYTWO_CLIENT_ID%3Du-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76
