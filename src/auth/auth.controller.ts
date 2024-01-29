import {
  Controller,
  Get,
  UseGuards,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  Body,
  ValidationPipe,
} from "@nestjs/common";
import { CookieOptions, Response } from "express";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { JWTSignGuard } from "./jwt/jwtSign.guard";
import * as config from "config";
import { User } from "src/decorator/user.decorator";
import { userOtpDto, userSessionDto } from "src/user/dto/user.dto";
import { FortyTwoAuthGuard } from "./fortytwo/fortytwo.guard";
import { JWTAuthGuard } from "./jwt/jwtAuth.guard";
import { TwoFAGuard } from "./twoFA/twoFA.guard";
import { RedisService } from "src/commons/redis-client.service";

@Controller("auth")
export class AuthController {
  private logger = new Logger(AuthController.name);
  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private jwtService: JwtService,
    private redisService: RedisService,
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
    @User() user: userSessionDto,
  ) {
    this.logger.debug(
      `Called ${AuthController.name} ${this.loginCallback.name}`,
    );
    const url = `http://${config.get("FE").get("domain")}:${config
      .get("FE")
      .get("port")}`;
    try {
      const isRegistered = await this.authService.changeUserStatus(
        user.intra_name,
      );
      if (!isRegistered) {
        return res.redirect(`${url}/register`);
      } else {
        if (user.two_fa === true) {
          return res.redirect(`${url}/login/otp`);
        }
        return res.redirect(`${url}`);
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/generate")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async generateOtp(
    @Res({ passthrough: true }) res: Response,
    @User() user: userSessionDto,
  ) {
    this.logger.debug(`Called ${AuthController.name} ${this.generateOtp.name}`);
    try {
      const userInfo = await this.userService.findUserById(user.id);
      if (!userInfo) {
        throw new HttpException(
          "해당 유저가 존재하지 않습니다.",
          HttpStatus.NOT_FOUND,
        );
      }

      const otp = await this.authService.generateOtp(userInfo);
      return otp;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/verify")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async verifyOtp(
    @Body() otp: any,
    @Res({ passthrough: true }) res: any,
    @User() user: userSessionDto,
  ): Promise<void | HttpException> {
    this.logger.debug(`Called ${AuthController.name} ${this.verifyOtp.name}`);
    try {
      // Assuming you have a 'User' entity
      const userInfo = await this.userService.findUserById(user.id);

      if (!userInfo) {
        throw new HttpException(
          "해당 유저가 존재하지 않습니다.",
          HttpStatus.NOT_FOUND,
        );
      }

      const isValid = await this.authService.verifyOtp(userInfo, otp.otp);
      if (isValid) {
        if (userInfo.two_fa === true) {
          throw new HttpException("너 잘못했잖아", HttpStatus.BAD_REQUEST);
        }
      } else {
        throw new HttpException(
          "OTP 코드가 일치하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/login")
  @UseGuards(JWTAuthGuard)
  async otpLogin(
    @Body() otp: any,
    @Res({ passthrough: true }) res: Response,
    @User() user: userSessionDto,
  ) {
    try {
      this.logger.debug(`Called ${AuthController.name} ${this.otpLogin.name}`);
      const userInfo = await this.userService.findUserById(user.id);
      if (!userInfo) {
        throw new HttpException(
          "해당 유저가 존재하지 않습니다.",
          HttpStatus.NOT_FOUND,
        );
      } else if (userInfo.two_fa === false || user.two_fa_complete === true) {
        new HttpException(
          "OTP 로그인을 할 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      const isValid = await this.authService.loginOtp(userInfo, otp.otp);
      if (isValid) {
        const payload = {
          id: userInfo.id,
          nickname: userInfo.nickname,
          email: userInfo.email,
          two_fa: userInfo.two_fa,
          status: userInfo.status,
          intra_name: userInfo.intra_name,
          two_fa_complete: isValid,
        };

        const token = this.jwtService.sign(payload);
        const expires = new Date(this.jwtService.decode(token)["exp"] * 1000);
        const cookieOptions: CookieOptions = {
          expires,
          httpOnly: false,
          domain: config.get("FE").get("domain"),
        };
        res.cookie("access_token", token, cookieOptions);
      } else {
        throw new HttpException(
          "OTP 코드가 일치하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
