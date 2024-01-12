import { Injectable, Logger } from "@nestjs/common";
import { UserDto, UserSessionDto } from "./dto/user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entity/user.entity";
import { Like, Repository } from "typeorm";
import { UserStatus } from "./entity/user.enum";
import { UpdateUserInfoDto } from "./dto/user.profile.dto";

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async createUser(UserSessionDto: UserSessionDto): Promise<void> {
    this.logger.debug(`Called ${UserService.name} ${this.createUser.name}`);
    const user = {
      intra_name: UserSessionDto.intra_name,
      nickname: UserSessionDto.nickname,
      avatar: UserSessionDto.avatar,
      status: UserStatus.OFFLINE,
      email: UserSessionDto.email,
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

  async updateUser(UserDto: UserDto): Promise<void> {
    UserDto.status = UserStatus.ONLINE;
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
    updateUserInfoDto: UpdateUserInfoDto,
  ): Promise<User> {
    const { nickname, avatar, two_fa } = updateUserInfoDto;
    const user = await this.userRepository.findOne({
      where: { nickname: oldNickname },
    });
    user.nickname = nickname;
    user.avatar = avatar;
    user.two_fa = two_fa;
    await this.userRepository.save(user);
    return user;
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
