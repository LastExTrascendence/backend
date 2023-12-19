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
} from "@nestjs/common";
import { Response } from "express";
import { FortyTwoAuthGuard, JWTAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
//import { AuthCredentialsDto } from './dto/auth-credential.dto';
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { User } from "src/user/entity/user.entity";
import { equal } from "assert";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  @Get("/42login")
  @UseGuards(FortyTwoAuthGuard)
  async FortyTwoAuth(@Res() res: Response) {
    try {
      res.status(301).redirect(`http://localhost:3000/auth/redirect`);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  //301 혹은 영구이동(Permanently Moved)는 해당 URL이 영구적으로 새로운 URL로 변경되었음을 나타냅니다.
  //검색엔진은 301 요청을 만나면 컨텐트가 새로운 URL로 영원히 이동했다고 판단합니다.
  //https://nsinc.tistory.com/168

  @Get("/redirect")
  @UseGuards(FortyTwoAuthGuard)
  async redirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
    try {
      if (req.user) {
        // console.log('req.user', req.user); //yeomin
        const token = await this.authService.login(req.user);
        if (!token) {
          const payload = {
            oauth_name: req.user.nickname,
            email: req.user.email,
          };
          const access_token = this.jwtService.sign(payload);
          res.cookie("access_token", access_token);

          res.status(301).redirect(`http://localhost:3333/register`);
        } else {
          res.cookie("accessToken", token.access_token);
          res.cookie("avatar", token.avatar);
          res.cookie("2fa_status", token["2fa_status"]);
          res.cookie("access_token", token.access_token);

          // 2fa_status 확인 후 리다이렉트 여부

          res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
        }
      } else {
        res.status(301).redirect(`http://localhost:3333`);
      }
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

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
