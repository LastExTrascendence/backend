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
import { UserOtpDto, UserSessionDto } from "src/user/dto/user.dto";
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

  @Post("/otp/generate")
  //@UseGuards(JWTSignGuard)
  async generateOtp(
    @Body(ValidationPipe) user: UserOtpDto,
    @Res({ passthrough: true }) res: any,
  ) {
    this.logger.debug(`Called ${AuthController.name} ${this.generateOtp.name}`);
    try {
      const userInfo = await this.userService.findUserById(user.userId);
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
      res.json({ otp });
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/otp/verify")
  async verifyOtp(
    @Body() user: UserOtpDto,
    @Res({ passthrough: true }) res: any,
  ): Promise<void> {
    try {
      // Assuming you have a 'User' entity
      const userInfo = await this.userService.findUserById(user.userId);

      if (!user) {
        throw new Error("User not found");
      } else if (userInfo.two_fa === false) {
        throw new Error("2FA 기능이 활성화 되어있지 않습니다.");
      }

      const isValid = await this.authService.verifyOtp(userInfo, user.otp);
      if (isValid) {
        res.status(HttpStatus.OK).json({ message: "OTP is valid" });
      } else {
        res.status(HttpStatus.UNAUTHORIZED).json({ error: "Invalid OTP" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
