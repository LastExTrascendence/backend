import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    throw new Error('Method not implemented.');
  }
  googleLogin(req) {
    if (!req.user) {
      return 'No user from google'
    }

    return {
      message: 'User information from google',
      user: req.user
    }
  }
  FortyTwoLogin(req) {
    if (!req.user) {
      return 'No user from FortyTwo'
    }

    return {
      message: 'User information from FortyTwo',
      user: req.user
    }
  }
}