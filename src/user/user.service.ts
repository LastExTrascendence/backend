import {
  Injectable,
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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createUser(
    UserSessionDto: UserSessionDto,
  ): Promise<{ access_token: string }> {
    const { oauth_name, nickname, avatar, email } = UserSessionDto;

    const created_at = new Date();

    const newUser = {
      intra_id: oauth_name,
      nickname: nickname,
      avatar: avatar,
      status: Status.OFFLINE,
      email: email,
      "2fa_status": false,
      created_at: created_at,
      deleted_at: null,
    };

    // const user_db = this.userRepository.create({intra_id, nickname, avatar, status});
    await this.userRepository.save(newUser);
    //await this.updateUser(UserDto);

    const payload = { username: UserSessionDto.nickname };

    return { access_token: await this.jwtService.sign(payload) };
    //jwt Token => cookie =>res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
    //const user = await this.userRepository.findOne({where : {intra_id}});
    //if (!user)
    //{
    //}

    // if (user && (await bcrypt.compare(intra_id, user.intra_id))){
    //     //유저 토큰 생성 (Secret + payload)
    //     const payload = {intra_id};
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

    //const user = this.userRepository.create({intra_id, nickname});
  }

  async updateUser(UserDto: UserDto): Promise<void> {
    UserDto.status = Status.ONLINE;
  }

  async findUserByName(intra_id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { intra_id } });
    //const user = await this.boardRepository.findOne(id);

    //front요청을 해서 정보를 받아서 그 기반으로 유저 생성해서 db담기
    // if (!user){
    //     throw new NotFoundException(`Can't find Board with id ${intra_id}`)
    // }
    return user;
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
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
