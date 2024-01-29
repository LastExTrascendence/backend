import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { userDto, userSessionDto } from "./dto/user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entity/user.entity";
import { In, Like, Repository } from "typeorm";
import { UserStatus } from "./entity/user.enum";
import { updateUserInfoDto } from "./dto/user.profile.dto";
import { UserOtpService } from "./user.otp.service";

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private userOtpService: UserOtpService,
  ) {}

  async createUser(userSessionDto: userSessionDto): Promise<void> {
    this.logger.debug(`Called ${UserService.name} ${this.createUser.name}`);

    const existingNickname = await this.userRepository.findOne({
      where: { nickname: userSessionDto.nickname },
    });
    if (existingNickname)
      throw new HttpException(
        "이미 존재하는 닉네임입니다.\n다른 닉네임을 사용해주세요.",
        HttpStatus.BAD_REQUEST,
      );

    const user = {
      intra_name: userSessionDto.intra_name,
      nickname: userSessionDto.nickname,
      avatar: userSessionDto.avatar,
      language: "en",
      status: UserStatus.OFFLINE,
      email: userSessionDto.email,
      two_fa: false,
      created_at: new Date(),
      deleted_at: null,
    };

    try {
      await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateUser(userDto: userDto): Promise<void> {
    userDto.status = UserStatus.ONLINE;
  }

  async findUserByNickname(nickname: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { nickname } });
    return user;
  }

  async findUserByIntraname(intra_name: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { intra_name } });
    return user;
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user;
  }

  async findUserByIds(ids: number[]): Promise<User[]> {
    const users = await this.userRepository.findBy({
      id: In(ids),
    });
    return users;
  }

  //유저 검색 창에서 유저 검색 기능
  async searchUserByNickname(nickname: string): Promise<User[]> {
    const users = await this.userRepository.find({
      where: {
        nickname: Like(`%${nickname}%`), // Partial matching for the nickname field
      },
      take: 5, // Limit the number of results to 5
    });
    return users;
  }

  async updateUserProfile(
    oldNickname: string,
    updateUserInfoDto: updateUserInfoDto,
  ): Promise<User> {
    const { nickname, avatar, two_fa, language } = updateUserInfoDto;
    if (oldNickname !== nickname) {
      const existingNickname = await this.userRepository.findOne({
        where: { nickname },
      });
      if (existingNickname)
        throw new HttpException(
          "이미 존재하는 닉네임입니다.\n다른 닉네임을 사용해주세요.",
          HttpStatus.BAD_REQUEST,
        );
    }
    const user = await this.userRepository.findOne({
      where: { nickname: oldNickname },
    });
    user.nickname = nickname;
    user.avatar = avatar;
    user.two_fa = two_fa;
    user.language = language ?? "en";
    await this.userRepository.save(user);

    //todo, user.two_fa_complete 이슈 물어보기
    if (two_fa === false) this.userOtpService.resetSecret(user);
    else this.userOtpService.setOtpSecret(user);
    return user;
  }

  async reconnectUser() {
    const users = await this.userRepository.update(
      {
        status: UserStatus.ONLINE,
      },
      { status: UserStatus.OFFLINE },
    );
  }
}
