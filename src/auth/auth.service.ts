import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entity/user.entity";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "src/user/user.service";
import * as Config from "config";
import { authenticator } from "otplib";
import { Redis } from "ioredis";
import { toFileStream } from "qrcode";
import { UserSessionDto } from "src/user/dto/user.dto";

@Injectable()
export class AuthService {
  private jwtConfig = Config.get("jwt");
  private logger = new Logger(AuthService.name);
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private redisService: Redis,
  ) {}

  async login(user: any): Promise<{
    access_token: string;
    avatar: string;
    two_fa: boolean;
    username: string;
  }> {
    this.logger.debug(`Called ${AuthService.name} ${this.login.name}`);
    const nickname = user.nickname;
    const findUser = await this.userService.findUserByNickname(nickname);
    if (!findUser) {
      return null;
    } else {
      //백엔드에 finduser, update 요청하기
      //findUser.userservice.updateuser()
      const status = findUser.status;
      if (status === "OFFLINE") {
        // this.userService.updateUser();
        await this.userService.updateUser(findUser);
        console.log("사용자는 오프라인 상태입니다.");
      }

      //intra, email jwt token

      const payload = {
        two_fa: findUser["two_fa"],
      };
      const ret = {
        username: findUser.intra_name,
        access_token: this.jwtService.sign(payload),
        avatar: findUser.avatar,
        two_fa: findUser["two_fa"],
      };
      return ret;
    }
  }

  public async generateOtp(user: User): Promise<string> {
    // otplib를 설치한 후, 해당 라이브러리를 통해 시크릿 키 생성
    const secret = authenticator.generateSecret();

    console.log(secret);

    const otpConfig = Config.get("OTP");

    console.log(otpConfig.TWO_FACTOR_AUTHENTICATION_APP_NAME);

    // accountName + issuer + secret 을 활용하여 인증 코드 갱신을 위한 인증 앱 주소 설정
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      otpConfig.TWO_FACTOR_AUTHENTICATION_APP_NAME,
      secret,
    );

    // User 테이블 내부에 시크릿 키 저장 (UserService에 작성)
    await this.redisService.set(`OTP|${user.id}`, secret);

    // 생성 객체 리턴
    return otpAuthUrl;
  }

  // qrcode의 toFileStream()을 사용해 QR 이미지를 클라이언트에게 응답
  // 이때, Express의 Response 객체를 받아옴으로써 클라이언트에게 응답할 수 있다.
  public async pipeQrCode(stream: Response, otpAuthUrl: string): Promise<void> {
    return toFileStream(stream, otpAuthUrl);
  }

  //isTwoFactorAuthCodeValid(twoFactorAuthCode: string, secret: string) {
  //  return authenticator.verify({
  //    token: twoFactorAuthCode,
  //    secret: secret,
  //  });
  //}
}
