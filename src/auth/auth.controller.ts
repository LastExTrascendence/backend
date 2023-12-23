import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  ValidationPipe,
  Req,
  Res,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { FortyTwoAuthGuard, JWTAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { JWTSignGuard } from "./jwt/jwtSign.guard";

@Controller("auth")
export class AuthController {
  private logger = new Logger(AuthController.name);
  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  @Get("/login")
  @UseGuards(FortyTwoAuthGuard)
  login() {
    this.logger.log(`Called ${AuthController.name} ${this.login.name}`);
  }

  @Get("/redirect")
  @UseGuards(FortyTwoAuthGuard, JWTSignGuard)
  async redirect(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Called ${AuthController.name} ${this.redirect.name}`);
    try {
      // const tmp = await this.userService.findUserByName(req.user.intra_name);
      const token = await this.authService.login(req.user);
      if (!token) {
        const payload = {
          intra_name: req.user.intra_name,
          email: req.user.email,
        };
        const access_token = this.jwtService.sign(payload);
        res.cookie("access_token", access_token);

        res.status(301).redirect(`http://localhost:3333/register`);
      } else {
        res.cookie("access_token", token.access_token);

        // two_fa 확인 후 리다이렉트 여부
        // res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
        res.status(301).redirect(`http://localhost:3333`);
      }
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // @Get("/redirect")
  // @UseGuards(FortyTwoAuthGuard, JWTAuthGuard)
  // async redirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
  //   try {
  //     if (req.user) {
  //       const token = await this.authService.login(req.user);
  //       if (!token) {
  //         const payload = {
  //           intra_name: req.user.intra_name,
  //           email: req.user.email,
  //         };
  //         const access_token = this.jwtService.sign(payload);
  //         res.cookie("access_token", access_token);

  //         res.status(301).redirect(`http://localhost:3333/register`);
  //       } else {
  //         res.cookie("access_token", token.access_token);

  //         // two_fa 확인 후 리다이렉트 여부

  //         // res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
  //         res.status(301).redirect(`http://localhost:3333`);
  //       }
  //     } else {
  //       res.status(301).redirect(`http://localhost:3333`);
  //     }
  //   } catch (error) {
  //     return new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //   }
  // }
  //@Post('/otp')
  //async setOtpCookie(@Req() req: any, @Res({ passthrough: true }) res: Response) {
  //    const body = req.body;
  //    if (body.otp && body.secret) {
  //    const isValid = this.authService.isTwoFactorAuthCodeValid(body.otp, body.secret);
  //    console.log('isValid', isValid);
  //    if (isValid) {
  //        res.cookie('two_factor_auth', true, {
  //        httpOnly: false,
  //        });
  //    }
  //    res.status(302).redirect(`${process.env.HOST}:${process.env.CLIENT_PORT}`);
  //    }
  //}

  //@Post('/otp/on')
  //@UseGuards(JWTAuthGuard)
  //updateOtpOn(@Req() req: any): Promise<object> | HttpException {
  //  try {
  //    return this.authService.onOtp(req.user);
  //  } catch (e) {
  //    return new HttpException(e.message, HttpStatus.BAD_REQUEST);
  //  }
  //}

  //@Post('/otp/off')
  //@UseGuards(JWTAuthGuard)
  //updateOtpOff(@Req() req: any): Promise<object> | HttpException {
  //  try {
  //    return this.authService.offOtp(req.user.userId);
  //  } catch (e) {
  //    return new HttpException(e.message, HttpStatus.BAD_REQUEST);
  //  }
  //}
  //@Get('/42logout')
  //logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
  //    res.clearCookie('two_factor_auth');
  //    res.cookie('access_token', '', {
  //      httpOnly: false,
  //    });
  //    // userState를 logout으로 바꾸는 usersService 부르기
  //    if (req.query?.userID) {
  //      this.userService.updateUserState(req.query.userID, 'logout');
  //    } else {
  //      console.log('logout: no user ID in query');
  //    }
  //    res.status(302).redirect(`${process.env.HOST}:${process.env.CLIENT_PORT}`);
  //  }
}

//finduser=> o => jwt Token => cookie =>res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
//finduser=> X => res.status(302).redirect(`http://localhost:3333/register`); => nickname, avatar, bio => Post('/create') => createuser => user 새로 생성하고 db 저장
// => jwt Token => cookie => res.status(301).redirect(`http://localhost:3333/auth/login/otp`);

//jwt Token => cookie =>res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
