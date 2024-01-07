import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { JWTSignGuard } from "./jwt/jwtSign.guard";
import * as config from "config";
import { User } from "src/decorator/user.decorator";
import { UserSessionDto } from "src/user/dto/user.dto";
import { FortyTwoAuthGuard } from "./fortytwo/fortytwo.guard";

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
  async login() {
    // NOTE: Cannot reach here
    this.logger.log(`Called ${AuthController.name} ${this.login.name}`);
  }

  // 서비스 로직으로 숨기기 (컨트롤러에서 비즈니스 로직이 드러나고 있음)
  // 가능하다면 정적 문자열들(http://localhost:3333, http://10.19.239.198:3333...)을 env로 관리하기
  @Get("/login/callback")
  @UseGuards(FortyTwoAuthGuard, JWTSignGuard)
  async loginCallback(
    @Res({ passthrough: true }) res: Response,
    @User() user: UserSessionDto,
  ) {
    this.logger.debug(
      `Called ${AuthController.name} ${this.loginCallback.name}`,
    );
    const url = `http://${config.get("FE").get("domain")}:${config
      .get("FE")
      .get("port")}`;
    try {
      const token = await this.authService.login(user);
      if (!token) {
        return res.redirect(`${url}/register`);
      } else {
        return res.redirect(`${url}`);
      }
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //@Post("/otp/generate")
  //@UseGuards(JwtAuthGuard)
  //async generateOtp(@Req() req: any, @Res({ passthrough: true }) res: any) {
  //  this.logger.debug(`Called ${AuthController.name} ${this.generateOtp.name}`);
  //  try {
  //    const user = await this.userService.findUserByNickname(req.user.nickname);
  //    if (!user) {
  //      return new HttpException("User not found", HttpStatus.NOT_FOUND);
  //    }
  //    const otp = await this.authService.generateOtp(user);
  //    if (!otp) {
  //      return new HttpException(
  //        "OTP generation failed",
  //        HttpStatus.BAD_REQUEST,
  //      );
  //    }
  //    res.cookie("two_factor_auth", otp);
  //    res.status(200).json({ otp });
  //  } catch (error) {
  //    return new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //  }
  //}

  //@Get('/42logout')
  // @UseGuards(JWTAuthGuard)
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

//finduser=> o => jwt Token => cookie =>res.status(301).redirect(`http://10.19.239.198:3333/auth/login/otp`);
//finduser=> X => res.status(302).redirect(`http://10.19.239.198:3333/register`); => nickname, avatar, bio => Post('/create') => createuser => user 새로 생성하고 db 저장
// => jwt Token => cookie => res.status(301).redirect(`http://10.19.239.198:3333/auth/login/otp`);

//jwt Token => cookie =>res.status(301).redirect(`http://10.19.239.198:3333/auth/login/otp`);
