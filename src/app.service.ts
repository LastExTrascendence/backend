import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  //constructor(private usersService: UsersService, private jwtService: JwtService) {}
  constructor() {}

  getHello(): string {
    return 'Hello World!';
  }
}
