import { Injectable, Logger } from "@nestjs/common";
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
    const user = {
      intra_name: userSessionDto.intra_name,
      nickname: userSessionDto.nickname,
      avatar: userSessionDto.avatar,
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
    const { nickname, avatar, two_fa } = updateUserInfoDto;
    const user = await this.userRepository.findOne({
      where: { nickname: oldNickname },
    });
    user.nickname = nickname;
    user.avatar = avatar;
    user.two_fa = two_fa;
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

  //  async updateAvatar(
  //    nickname: string,
  //    profileUrl: string,
  //    file: Express.Multer.File,
  //  ): Promise<User> {
  //    try {
  //      let photoData = null;
  //      if (file) {
  //        photoData = file.buffer;
  //      } else {
  //        throw new HttpException(
  //          "파일이 존재하지 않습니다.",
  //          HttpStatus.BAD_REQUEST,
  //        );
  //      }

  //      const findUser = await this.userService.findUserByNickname(nickname);

  //      if (!findUser)
  //        throw new HttpException(
  //          "유저를 찾을 수 없습니다.",
  //          HttpStatus.BAD_REQUEST,
  //        );
  //      else {
  //        findUser.avatar = photoData;
  //        return findUser;
  //      }
  //      //await this.userRepository.delete(this.userService.findUser(intra_name));

  //      //await this.userRepository.save(findUser);

  //      ////delete avatar.photoData;
  //      //return findUser;
  //    } catch (e) {
  //      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
  //    }
  //  }
}
