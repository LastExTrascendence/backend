import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entity/user.entity";
import { UserService } from "./user.service";

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly userService: UserService,
  ) {}

  async findAvatarByIntraId(intra_id: string): Promise<string> {
    try {
      const user: User = await this.userService.findUserByName(intra_id);
      if (!user.avatar)
        throw new HttpException(
          "유저를 찾을 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      return user.avatar;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //  npm install @types/multer --save

  async updateAvatar(
    intra_id: string,
    profileUrl: string,
    file: Express.Multer.File,
  ): Promise<User> {
    try {
      let photoData = null;
      if (file) {
        photoData = file.buffer;
      } else {
        throw new HttpException(
          "파일이 존재하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      const findUser = await this.userService.findUserByName(intra_id);

      if (!findUser)
        throw new HttpException(
          "유저를 찾을 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      else {
        findUser.avatar = photoData;
        return findUser;
      }
      //await this.userRepository.delete(this.userService.findUser(intra_id));

      //await this.userRepository.save(findUser);

      ////delete avatar.photoData;
      //return findUser;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

/*
	file: {
		fieldname: 'file',
		originalname: 'asdf.png',
		encoding: '7bit',
		mimetype: 'image/png',
		buffer: <Buffer 89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 03 63 00 00 01 ad 08 06 00 00 00 9b 4c ac e4 00 00 00 09 70 48 59 73 00 00 0b 13 00 00 0b 13 01 ... 619325 more bytes>,
		size: 619375
	}
*/
