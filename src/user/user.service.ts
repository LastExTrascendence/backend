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
import { Repository } from "typeorm";
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
    // const user_db = this.userRepository.create({intra_name, nickname, avatar, status});
    //await this.updateUser(UserDto);

    //jwt Token => cookie =>res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
    //const user = await this.userRepository.findOne({where : {intra_name}});
    //if (!user)
    //{
    //}

    // if (user && (await bcrypt.compare(intra_name, user.intra_name))){
    //     //유저 토큰 생성 (Secret + payload)
    //     const payload = {intra_name};
    //     const accessToken = await this.jwtService.sign(payload);

    //     return {accessToken : accessToken};
    // }
    // else {
    //     throw new UnauthorizedException('login failed');
    // }
    //     return {accessToken : accessToken};
    // }
    // else {
    //     throw new UnauthorizedException('login failed');
    // }

    //const user = this.userRepository.create({intra_name, nickname});
  }

  async updateUser(UserDto: UserDto): Promise<void> {
    UserDto.status = Status.ONLINE;
  }

  async findUserByName(intra_name: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { intra_name } });
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

  async updateUserProfile(userDto: UserDto): Promise<User> {
    const { id, nickname, avatar } = userDto;
    const user = await this.userRepository.findOne({ where: { id } });
    user.nickname = nickname;
    user.avatar = avatar;
    await this.userRepository.save(user);
    return user;
  }

  // async signIn(authCredentialDto: AuthCredentialsDto): Promise<{accessToken: string}> {
  //     const {username, password} = authCredentialDto;
  //     //console.log('username', username);
  //     //console.log('password', password);
  //     const user = await this.userRepository.findOne({where : {username}});
  //     //console.log('find user', user);

  //     if (user && (await bcrypt.compare(password, user.password))){
  //         //유저 토큰 생성 (Secret + payload)
  //         const payload = {username};
  //         const accessToken = await this.jwtService.sign(payload);

  //         return {accessToken : accessToken};
  //     }
  //     else {
  //         throw new UnauthorizedException('login failed');
  //     }
  // }
  //         return {accessToken : accessToken};
  //     }
  //     else {
  //         throw new UnauthorizedException('login failed');
  //     }
  // }
}
