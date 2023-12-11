import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';

import { Injectable } from '@nestjs/common';
import * as config from 'config';

const jwtConfig = config.get('FORTYTWO');

//config();
//@Injectable()
//export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

//  constructor() {
//    super({
//      clientID: process.env.GOOGLE_CLIENT_ID,
//      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//      callbackURL: 'https://localhost:3000/google/redirect',
//      scope: ['email', 'profile'],
//    });
//  }

//  async validate (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
//    const { name, emails, photos } = profile
//    const user = {
//      email: emails[0].value,
//      firstName: name.familyName,
//      lastName: name.givenName,
//      picture: photos[0].value,
//      accessToken
//    }
//    done(null, user);
//  }
//}

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'auth') {

  constructor() {
    super({
      authorizationURL : `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.FORTYTWO_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code`,
      tokenURL : `http://api.intra.42.fr/oauth/token`,
      clientID: process.env.FORTYTWO_CLIENT_ID || jwtConfig.FORTYTWO_CLIENT_ID,
      clientSecret: process.env.FORTYTWO_CLIENT_SECRET || jwtConfig.FORTYTWO_CLIENT_SECRET,
      callbackURL: process.env.FORTYTWO_CLIENT_CALLBACK || jwtConfig.FORTYTWO_CLIENT_CALLBACK,
    });
  }

  async validate (accessToken: string, refreshToken: string): Promise<any> {
    try {
      console.log('accessToken: ', accessToken);
      console.log('refreshToken: ', refreshToken);
      return accessToken;
    } catch (error) {
      console.log(error);
    }
  }
}

//https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code
//https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2FFortyTwo%2Fredirect&response_type=code
