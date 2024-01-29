import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entity/user.entity";
import { In, Like, Repository } from "typeorm";
import { UserOtpSecret } from "./entity/user.otp.entity";
import { RedisService } from "src/commons/redis-client.service";

@Injectable()
export class UserOtpService {
  private logger = new Logger(UserOtpService.name);
  constructor(
    @InjectRepository(UserOtpSecret)
    private userOtpRepositoty: Repository<UserOtpSecret>,
    private redisService: RedisService,
  ) {}

  async resetSecret(user: User): Promise<void> {
    try {
      if (user.id) {
        if (user.two_fa === false)
          await this.userOtpRepositoty.update(
            { user_id: user.id },
            { secret: null, updated_at: new Date() },
          );
      }
    } catch {
      throw new HttpException(
        "OTP 로그인을 할 수 없습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOneUserOtpInfo(user: User): Promise<UserOtpSecret> {
    try {
      const userOtpSecret = await this.userOtpRepositoty.findOne({
        where: { user_id: user.id },
      });

      return userOtpSecret;
    } catch (error) {
      throw error;
    }
  }

  async getOtpSecret(user: User): Promise<UserOtpSecret> {
    try {
      const userOtpSecret = await this.userOtpRepositoty.findOne({
        where: { user_id: user.id },
      });

      if (!userOtpSecret) {
        throw new Error("Secret key not found for the user");
      }

      return userOtpSecret;
    } catch (error) {
      throw error;
    }
  }

  async setOtpSecret(user: User): Promise<void> {
    try {
      const userOtpInfo = await this.findOneUserOtpInfo(user);

      const storedSecret = await this.redisService.get(`OTP|${user.id}`);

      if (userOtpInfo) {
        await this.userOtpRepositoty.update(
          { user_id: user.id },
          { secret: storedSecret, updated_at: new Date() },
        );
        await this.redisService.del(`OTP|${user.id}`);
      } else {
        const newUserOtpSecret = {
          user_id: user.id,
          secret: storedSecret,
          updated_at: new Date(),
        };
        await this.userOtpRepositoty.save(newUserOtpSecret);
        await this.redisService.del(`OTP|${user.id}`);
      }
    } catch (error) {
      throw error;
    }
  }
}
