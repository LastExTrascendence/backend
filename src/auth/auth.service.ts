import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entity/user.entity";
import { UserService } from "src/user/user.service";
import * as Config from "config";
import { authenticator } from "otplib";
import * as qr from "qrcode";
// import { createWriteStream } from "fs";
import { UserStatus } from "src/user/entity/user.enum";
import * as bcrypt from "bcrypt";
import { UserOtpSecret } from "src/user/entity/user.otp.entity";
import * as CryptoJS from "crypto-js";
import { UserOtpService } from "src/user/user.otp.service";
import { RedisService } from "src/commons/redis-client.service";

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    private userService: UserService,
    @InjectRepository(UserOtpSecret)
    private userOtpRepositoty: Repository<UserOtpSecret>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userOtpService: UserOtpService,
    private redisService: RedisService,
  ) {}

  async changeUserStatus(intra_name: string): Promise<boolean> {
    this.logger.debug(
      `Called ${AuthService.name} ${this.changeUserStatus.name}`,
    );
    const user = await this.userService.findUserByIntraname(intra_name);
    if (!user) return false;
    if (user.status === UserStatus.OFFLINE)
      await this.userService.updateUser(user);
    return true;
  }

  public async generateOtp(user: User): Promise<string> {
    try {
      // otplib를 설치한 후, 해당 라이브러리를 통해 시크릿 키 생성

      const secret = authenticator.generateSecret();

      const otpConfig = Config.get("OTP");

      // accountName + issuer + secret 을 활용하여 인증 코드 갱신을 위한 인증 앱 주소 설정
      const otpAuthUrl = authenticator.keyuri(
        user.email,
        otpConfig.TWO_FACTOR_AUTHENTICATION_APP_NAME,
        secret,
      );
      if (!otpAuthUrl) throw new Error("OTP Auth Url is not generated");

      const crpytoSecret = CryptoJS.AES.encrypt(
        secret,
        Config.get("jwt").secret,
      ).toString();

      // User 테이블 내부에 시크릿 키 저장 (UserService에 작성)
      if (await this.redisService.get(`OTP|${user.id}`))
        await this.redisService.del(`OTP|${user.id}`);
      await this.redisService.set(`OTP|${user.id}`, crpytoSecret);

      // const qrCodeBuffer = await qr.toBuffer(otpAuthUrl);
      // const writeStream = createWriteStream(`./qr-codes/${user.id}_qrcode.png`);
      // writeStream.write(qrCodeBuffer);

      // 생성 객체 리턴
      return otpAuthUrl;
    } catch (error) {
      throw error;
    }
  }

  async verifyOtp(user: User, otp: string): Promise<boolean> {
    try {
      // Retrieve the stored secret key from Redis
      const storedSecret = await this.redisService.get(`OTP|${user.id}`);

      //sha256으로 encode된 것을 decode 해주셈

      if (!storedSecret) {
        throw new Error("Secret key not found for the user");
      }

      const decodeSecret = CryptoJS.AES.decrypt(
        storedSecret,
        Config.get("jwt").secret,
      ).toString(CryptoJS.enc.Utf8);
      // Verify the provided OTP against the stored secret
      const isValid = authenticator.verify({
        token: otp,
        secret: decodeSecret,
      });

      return isValid;
    } catch (error) {
      throw error;
    }
  }

  async loginOtp(user: User, otp: string): Promise<boolean> {
    try {
      const storedSecret = await this.userOtpService.getOtpSecret(user);

      const decodeSecret = CryptoJS.AES.decrypt(
        storedSecret.secret,
        Config.get("jwt").secret,
      ).toString(CryptoJS.enc.Utf8);

      if (!decodeSecret) {
        throw new Error("Secret key not found for the user");
      }

      const isValid = authenticator.verify({
        token: otp,
        secret: decodeSecret,
      });

      return isValid;
    } catch (error) {
      throw error;
    }
  }
}
