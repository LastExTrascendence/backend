import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { FortyTwoAuthGuard } from './app.guard';

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) {}

  getHello(): any {
    throw new Error('Method not implemented.');
  }
  @Get()
  findAll(): string {
    return 'Main Page!';
  }
}

//@Controller('google')
//export class GoogleController {
//  constructor(private readonly appService: AppService) {}

//  @Get()
//  @UseGuards(AuthGuard('google'))
//  async googleAuth(@Req() req) {}

//  @Get('redirect')
//  @UseGuards(AuthGuard('google'))
//  googleAuthRedirect(@Req() req) {
//    return this.appService.googleLogin(req)
//  }
//}

@Controller('auth')
export class FortyTwoController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(FortyTwoAuthGuard)
  @Get('/42login')
  async FortyTwoAuth(@Req() req) {
    return 'success';
  }

  @Get('/redirect')
  @UseGuards(AuthGuard('auth'))
  FortyTwoRedirect(@Req() req) {
    return this.appService.FortyTwoLogin(req)
  }
}

