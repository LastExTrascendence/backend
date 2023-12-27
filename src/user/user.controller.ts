import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
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
  forwardRef,
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
import { GamePlayerService } from "src/game/game.players.service";
import { UserProfileDto } from "./dto/user.profile.dto";

@Controller("user")
export class UserController {
  private logger = new Logger(UserController.name);
  constructor(
    private userService: UserService,
    private avatarservice: AvatarService,
    private friendService: FriendService,
    private blockService: BlockService,
    private jwtService: JwtService,
    private gamePlayerService: GamePlayerService,
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

  @Post("/friend/add")
  addFriend(
    @Body(ValidationPipe) regist: UserFriendDto,
  ): Promise<UserFriend> | HttpException {
    try {
      this.logger.debug(`Called ${UserController.name} ${this.addFriend.name}`);
      return this.friendService.addFriend(
        regist.user_id,
        regist.friend_user_id,
      );
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/friend/find/all")
  findAllFriend(@Req() req: UserFriendDto) {
    try {
      this.logger.debug(
        `Called ${UserController.name} ${this.findAllFriend.name}`,
      );
      return this.friendService.findAllFriend(req.user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/friend/find/:id")
  findFriendById(@Param("id", ParseIntPipe) id: number) {
    try {
      this.logger.debug(
        `Called ${UserController.name} ${this.findFriendById.name}`,
      );
      return this.friendService.findFriend(id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete("/friend/remove")
  deleteFriend(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      this.logger.debug(
        `Called ${UserController.name} ${this.deleteFriend.name}`,
      );
      return this.friendService.removeFriend(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("/block/add")
  addBlock(
    @Body(ValidationPipe) regist: UserBlockDto,
  ): Promise<UserBlock> | HttpException {
    try {
      this.logger.debug(`Called ${UserController.name} ${this.addBlock.name}`);
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
  removeBlock(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      this.logger.debug(
        `Called ${UserController.name} ${this.removeBlock.name}`,
      );
      return this.blockService.removeBlock(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/me")
  @UseGuards(JWTAuthGuard)
  async findMe(@Req() req: any): Promise<UserProfileDto | HttpException> {
    try {
      const UserInfo = await this.userService.findUserById(req.user.id);
      const UserGameInfo = await this.gamePlayerService.findGamePlayerByUserId(
        req.user.id,
      );

      const Userprofile: UserProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        two_fa: UserInfo.two_fa,
        status: UserInfo.status,
        is_friend: false,
        at_friend: null,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
        loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
      };
      this.logger.debug(`Called ${UserController.name} ${this.findMe.name}`);
      return Userprofile;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put("/me/update")
  updateME(@Req() req: any): Promise<User> | HttpException {
    try {
      this.checkNickname(req.user.nickname);
      return this.userService.updateUserProfile(req.user);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/profile/:id")
  async getprofilebyid(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<UserProfileDto | HttpException> {
    try {
      const UserInfo = await this.userService.findUserById(id);
      const UserGameInfo =
        await this.gamePlayerService.findGamePlayerByUserId(id);
      const UserFriendInfo = await this.friendService.findFriend(id);

      //유저 본인 인지, 친구인지, 차단인지 확인

      const Userprofile: UserProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        two_fa: UserInfo.two_fa,
        status: UserInfo.status,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
        loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
        is_friend: UserFriendInfo ? true : false,
        at_friend: UserFriendInfo ? UserFriendInfo.created_at : null,
      };
      this.logger.debug(
        `Called ${UserController.name} ${this.getprofilebyid.name}`,
      );
      return Userprofile;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
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
      this.logger.debug(
        `Called ${UserController.name} ${this.checkNickname.name}`,
      );
    } catch (error) {
      throw error;
    }
  }
}
