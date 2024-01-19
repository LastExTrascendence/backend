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
import { Response } from "express";
import { AuthService } from "./auth.service";
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { JWTSignGuard } from "./jwt/jwtSign.guard";
import * as config from "config";
import { User } from "src/decorator/user.decorator";
import { userOtpDto, userSessionDto } from "src/user/dto/user.dto";
import { FortyTwoAuthGuard } from "./fortytwo/fortytwo.guard";
import { JWTAuthGuard } from "./jwt/jwtAuth.guard";

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
    @User() user: userSessionDto,
  ) {
    this.logger.debug(
      `Called ${AuthController.name} ${this.loginCallback.name}`,
    );
    console.log("userSessionDto after JWTSignGuard: ", user);
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
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/generate")
  @UseGuards(JWTAuthGuard)
  async generateOtp(
    @Res({ passthrough: true }) res: Response,
    @User() user: userSessionDto,
  ) {
    this.logger.debug(`Called ${AuthController.name} ${this.generateOtp.name}`);
    try {
      const userInfo = await this.userService.findUserById(user.id);
      if (!userInfo) {
        return new HttpException(
          "해당 유저가 존재하지 않습니다.",
          HttpStatus.NOT_FOUND,
        );
      } else if (userInfo.two_fa === false) {
        return new HttpException(
          "2FA 기능이 활성화 되어있지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
      const otp = await this.authService.generateOtp(userInfo);
      return res.send(otp);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/verify")
  @UseGuards(JWTAuthGuard)
  async verifyOtp(
    @Body() otp: any,
    @Res({ passthrough: true }) res: any,
    @User() user: userSessionDto,
  ) {
    this.logger.debug(`Called ${AuthController.name} ${this.verifyOtp.name}`);
    console.log("otp: ", otp);
    console.log("otp.otp ", otp.otp);
    try {
      // Assuming you have a 'User' entity
      const userInfo = await this.userService.findUserById(user.id);

      if (!userInfo) {
        return new HttpException(
          "해당 유저가 존재하지 않습니다.",
          HttpStatus.NOT_FOUND,
        );
      } else if (userInfo.two_fa === false) {
        return new HttpException(
          "2FA 기능이 활성화 되어있지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      const isValid = await this.authService.verifyOtp(userInfo, otp.otp);
      if (isValid) {
        const payload: userSessionDto = {
          id: userInfo.id,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          email: userInfo.email,
          two_fa: userInfo.two_fa,
          status: userInfo.status,
          intra_name: userInfo.intra_name,
          two_fa_complete: isValid,
        };
        const newToken = this.jwtService.sign(payload);
        res.cookie("access_token", newToken);
        const url = `http://${config.get("FE").get("domain")}:${config
          .get("FE")
          .get("port")}`;
        return res.redirect(url);
      } else {
        return new HttpException(
          "OTP 코드가 일치하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
