import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';

import { Injectable } from '@nestjs/common';
import * as config from 'config';

const jwtConfig = config.get('FORTYTWO');

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