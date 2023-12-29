import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
// import { UserRepository } from './user.repository';
import { UserDto, UserSessionDto } from "./dto/user.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entity/user.entity";
import { Like, Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { Status } from "./entity/user.enum";
import { GamePlayers } from "src/game/entity/game.players.entity";
import { UserProfileDto } from "./dto/user.profile.dto";

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createUser(
    UserSessionDto: UserSessionDto,
  ): Promise<{ access_token: string }> {
    const { intra_name, nickname, avatar, email } = UserSessionDto;
    const newUser = {
      intra_name: intra_name,
      nickname: nickname,
      avatar: avatar,
      status: Status.OFFLINE,
      email: email,
      two_fa: false,
      created_at: new Date(),
      deleted_at: null,
    };

    try {
      this.logger.debug(`Called ${UserService.name} ${this.createUser.name}`);
      await this.userRepository.save(newUser);
      const payload = { username: UserSessionDto.nickname };
      return { access_token: await this.jwtService.sign(payload) };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateUser(UserDto: UserDto): Promise<void> {
    UserDto.status = Status.ONLINE;
  }

  async findUserByNickname(nickname: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { nickname } });
    //const user = await this.boardRepository.findOne(id);

    //front요청을 해서 정보를 받아서 그 기반으로 유저 생성해서 db담기
    // if (!user){
    //     throw new NotFoundException(`Can't find Board with id ${intra_name}`)
    // }
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
    userDto: UserDto,
    file: Express.Multer.File,
    //profileUrl: string,
  ): Promise<User> {
    const { id, nickname, avatar, two_fa } = userDto;
    const user = await this.userRepository.findOne({ where: { id } });
    user.nickname = nickname;
    user.avatar = avatar;
    user.two_fa = two_fa;
    let photoData = null;
    if (file) {
      photoData = file.buffer;
    }
    //} else if (profileUrl) {
    //  photoData = profileUrl;
    //}
    //user.avatar = photoData;
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
