import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entity/user.entity";
import { UserService } from "src/user/user.service";
import * as Config from "config";
import { authenticator } from "otplib";
import { Redis } from "ioredis";
import * as qr from "qrcode";
// import { createWriteStream } from "fs";
import { UserStatus } from "src/user/entity/user.enum";

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    private userService: UserService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private redisService: Redis,
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

      // User 테이블 내부에 시크릿 키 저장 (UserService에 작성)
      await this.redisService.set(`OTP|${user.id}`, secret);

      // const qrCodeBuffer = await qr.toBuffer(otpAuthUrl);
      // const writeStream = createWriteStream(`./qr-codes/${user.id}_qrcode.png`);
      // writeStream.write(qrCodeBuffer);

      // 생성 객체 리턴
      return otpAuthUrl;
    } catch (error) {
      throw error;
    }
  }

  public async verifyOtp(user: User, otp: string): Promise<boolean> {
    try {
      // Retrieve the stored secret key from Redis
      const storedSecret = await this.redisService.get(`OTP|${user.id}`);

      if (!storedSecret) {
        throw new Error("Secret key not found for the user");
      }

      // Verify the provided OTP against the stored secret
      const isValid = authenticator.verify({
        token: otp,
        secret: storedSecret,
      });

      return isValid;
    } catch (error) {
      throw error;
    }
  }
}
