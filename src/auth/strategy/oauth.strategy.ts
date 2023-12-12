import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-42';

import { Injectable } from '@nestjs/common';
import * as config from 'config';
import axios from 'axios';

const ftConfig = config.get('FORTYTWO');

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'auth') {

  constructor() {
    super({
      //authorizationURL : `https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code`,
      //tokenURL : `http://api.intra.42.fr/oauth/token`,
      //clientID: process.env.FORTYTWO_CLIENT_ID || ftConfig.FORTYTWO_CLIENT_ID,
      //clientSecret: process.env.FORTYTWO_CLIENT_SECRET || ftConfig.FORTYTWO_CLIENT_SECRET,
      //callbackURL: process.env.FORTYTWO_CLIENT_CALLBACK || ftConfig.FORTYTWO_CLIENT_CALLBACK,
      // clientID: ftConfig.FORTYTWO_CLIENT_ID,
      // clientSecret: process.env.FORTYTWO_CLIENT_SECRET || ftConfig.FORTYTWO_CLIENT_SECRET,
      // callbackURL: process.env.FORTYTWO_CLIENT_CALLBACK ||  ftConfig.FORTYTWO_CLIENT_CALLBACK,
      // scope: 'public',
      // clientID: ftConfig.get<string>("FORTYTWO_CLIENT_ID"),
      // clientSecret: ftConfig.get<string>("FORTYTWO_CLIENT_SECRET"),
      // callbackURL: ftConfig.get<string>("FORTYTWO_CLIENT_CALLBACK"),
      clientID: ftConfig.get<string>("CLIENT_ID"),
      clientSecret: ftConfig.get<string>("CLIENT_SECRET"),
      callbackURL: ftConfig.get<string>("CALLBACK_URL"),
      //authorizationURL : `https://api.intra.42.fr/oauth/authorize?client_id=${ftConfig.FORTYTWO_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code`,
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
  // try {
  //   const req = await axios.get('https://api.intra.42.fr/v2/me', {
  //     headers: { Authorization: `Bearer ${accessToken}` },
  //   });

  //   return req.data.login;
  // } catch (error) {
  //   console.log(error);
  // }
}

//https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&response_type=code

//https://api.intra.42.fr/oauth/authorize?response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2FFORTYTWO_CLIENT_CALLBACK%3Dhttp%3A%2F%2Flocalhost%3A3000%2Fauth%2Fredirect&client_id=FORTYTWO_CLIENT_ID%3Du-s4t2ud-d73e50e7ffad718ea84af12ee950e7dfb26e492c7abb0d377143dd63dc0d7a76