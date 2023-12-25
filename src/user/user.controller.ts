import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import {
  UserBlockDto,
  UserDto,
  UserFriendDto,
  UserSessionDto,
} from "./dto/user.dto";
import { UserService } from "./user.service";
import { User } from "./entity/user.entity";
import { JWTAuthGuard, loginAuthGuard } from "src/auth/auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { AvatarService } from "./user.avatar.service";
import { FriendService } from "./user.friend.service";
import { UserFriend } from "./entity/user.friend.entity";
import { BlockService } from "./user.block.service";
import { UserBlock } from "./entity/user.block.entity";
import { JwtService } from "@nestjs/jwt";
import { Headers } from "@nestjs/common";

@Controller("user")
export class UserController {
  private logger = new Logger(UserController.name);
  constructor(
    private userService: UserService,
    private avatarservice: AvatarService,
    private friendService: FriendService,
    private blockService: BlockService,
    private jwtService: JwtService,
  ) {}

  @Post("/create")
  // @UseGuards(loginAuthGuard)
  createUser(
    @Headers() headers: any,
    @Body(ValidationPipe) userDto: UserDto,
  ): Promise<{ access_token: string }> {
    const token = headers.authorization.replace("Bearer ", "");
    const decoded_token = this.jwtService.decode(token);
    const userSessionDto: UserSessionDto = {
      ...userDto,
      intra_name: decoded_token["intra_name"],
      email: decoded_token["email"],
    };
    try {
      this.logger.debug(
        `Called ${UserController.name} ${this.createUser.name}`,
      );
      return this.userService.createUser(userSessionDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Put("/avatar/update")
  @UseGuards(JWTAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  updateAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> | HttpException {
    try {
      return this.avatarservice.updateAvatar(req.user.intra_name, null, file);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // @Get('/:id')
  // getBoardById(@Param('id') id:number) : Promise<Board> {
  //     return this.boardsService.getBoardById(id);
  // }
  @Get("/:IntraId")
  findUser(@Param("IntraId") userDto: UserDto): Promise<User> {
    return this.userService.findUserByName(userDto.nickname);
  }

  @Post("/friend/add")
  addfollow(
    @Body(ValidationPipe) regist: UserFriendDto,
  ): Promise<UserFriend> | HttpException {
    try {
      return this.friendService.addfollowing(
        regist.user_id,
        regist.friend_user_id,
      );
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/friend/find")
  findfollow(@Req() req: UserFriendDto) {
    try {
      return this.friendService.findFollwing(req.user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete("/friend/remove")
  unfollow(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      return this.friendService.unfollowing(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("/block/add")
  addblock(
    @Body(ValidationPipe) regist: UserBlockDto,
  ): Promise<UserBlock> | HttpException {
    try {
      return this.blockService.addBlock(regist.user_id, regist.blocked_user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/block/find")
  findblock(@Req() req: UserFriendDto) {
    try {
      const user_id = req.user_id;
      return this.blockService.findBlock(user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete("/block/remove")
  removeblock(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      return this.blockService.removeBlock(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/me")
  @UseGuards(JWTAuthGuard)
  findme(@Req() req: any): Promise<User> | HttpException {
    try {
      return this.userService.findUserById(req.user.id);
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("/me/update")
  updateMe(
    @Body(ValidationPipe) userDto: UserDto,
  ): Promise<User> | HttpException {
    try {
      this.checkNickname(userDto.nickname);
      return this.userService.updateUserProfile(userDto);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  private checkNickname(nickname: string): void {
    // 닉네임 정책 : 길이 16, 영어, 숫자, 대쉬, 언더바만 허용
    try {
      if (nickname.length > 16 && nickname.length < 1) {
        throw new HttpException(
          "닉네임은 16글자 이하여야 합니다.",
          HttpStatus.BAD_REQUEST,
        );
      } else if (!/^[a-zA-Z0-9-_]*$/.test(nickname)) {
        throw new HttpException(
          "닉네임은 영어, 숫자, 대쉬, 언더바만 허용됩니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw error;
    }
  }
}
