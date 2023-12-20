import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-42";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as config from "config";
import axios from "axios";

//passport-oauth2

const ftConfig = config.get("FORTYTWO");

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, "auth") {
  constructor() {
    super({
      clientID: ftConfig.get<string>("CLIENT_ID"),
      clientSecret: ftConfig.get<string>("CLIENT_SECRET"),
      callbackURL: ftConfig.get<string>("CALLBACK_URL"),
      scope: `public`,
    });
  }

  //42api에 접근하는 accessToken -> 유저에 대한 접근 권한
  //profile -> 유저의 정보
  //  async validate (accessToken: string, refreshToken: string, profile: any, cd : any): Promise<any> {

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    //   try {
    //     console.log('accessToken: ', accessToken);
    //     console.log('refreshToken: ', refreshToken);
    //     return accessToken;
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }

    //저 도메인이 42api에서 나의 정보를 불러오는 도메인인데 -> acctoken 그걸로 내 정보 권한을 얻는다.
    // try {
    //   const req = await axios.get('https://api.intra.42.fr/v2/me', {
    //     headers: { Authorization: `Bearer ${accessToken}` }, //authentication code
    //   });

    //   return req.data.login;
    // } catch (error) {
    //   console.log(error);
    // }

    try {
      const user = {
        intra_id: profile.id,
        nickname: profile.username,
        avator: profile.photos[0].value,
        access_token: accessToken,
        // avator : profile._json.image[0'link']],
        email: profile.emails[0].value,
      };
      // console.log(profile);
      return user;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

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
