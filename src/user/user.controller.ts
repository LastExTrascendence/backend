import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  UserBlockDto,
  UserDto,
  UserFriendDto,
  UserInfoDto,
  UserSessionDto,
} from "./dto/user.dto";
import { UserService } from "./user.service";
// import { User } from "./entity/user.entity";
import { FriendService } from "./user.friend.service";
import { UserFriend } from "./entity/user.friend.entity";
import { BlockService } from "./user.block.service";
import { UserBlock } from "./entity/user.block.entity";
import { JwtService } from "@nestjs/jwt";
import { Headers } from "@nestjs/common";
import { GamePlayerService } from "src/game/game.players.service";
import { UserProfileDto } from "./dto/user.profile.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { JWTUserCreationGuard } from "src/auth/jwt/jwtUserCreation.guard";
import { User } from "src/decorator/user.decorator";

@Controller("user")
export class UserController {
  private logger = new Logger(UserController.name);
  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private blockService: BlockService,
    private jwtService: JwtService,
    private gamePlayerService: GamePlayerService,
  ) {}

  //신규 유저 정보 DB 저장
  @Post("/create")
  @UseGuards(JWTUserCreationGuard)
  createUser(
    @Headers() headers: any,
    @Body(ValidationPipe) userDto: UserDto,
  ): Promise<{ access_token: string }> | HttpException {
    this.logger.debug(`Called ${UserController.name} ${this.createUser.name}`);
    const token = headers.authorization.replace("Bearer ", "");
    const decoded_token = this.jwtService.decode(token);
    const userSessionDto: UserSessionDto = {
      ...userDto,
      intra_name: decoded_token["intra_name"],
      email: decoded_token["email"],
    };
    try {
      return this.userService.createUser(userSessionDto);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 친구 추가
  @Post("/friend/add")
  @UseGuards(JWTAuthGuard)
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

  //특정 유저의 모든 친구 정보 확인
  @Get("/friend/find/all")
  @UseGuards(JWTAuthGuard)
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

  //사용자가 특정 한 유저 친구 정보 확인
  @Get("/friend/find/one")
  @UseGuards(JWTAuthGuard)
  findFriendById(@Req() req: UserFriendDto) {
    this.logger.debug(
      `Called ${UserController.name} ${this.findFriendById.name}`,
    );
    try {
      // Call your service method to check if the users are friends
      const areFriends = this.friendService.findFriend(
        req.user_id,
        req.friend_user_id,
      );

      return { areFriends }; // You can modify the response as needed
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 친구 삭제
  @Delete("/friend/remove")
  @UseGuards(JWTAuthGuard)
  deleteFriend(@Req() req: any) {
    this.logger.debug(
      `Called ${UserController.name} ${this.deleteFriend.name}`,
    );
    try {
      return this.friendService.removeFriend(req.user_id, req.friend_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }

  //특정 유저의 특정 한 유저 차단
  @Post("/block/add")
  @UseGuards(JWTAuthGuard)
  addBlock(
    @Body(ValidationPipe) regist: UserBlockDto,
  ): Promise<UserBlock> | HttpException {
    this.logger.debug(`Called ${UserController.name} ${this.addBlock.name}`);
    try {
      return this.blockService.addBlock(regist.user_id, regist.blocked_user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 모든 차단한 유저 정보 확인
  @Get("/block/find/all")
  @UseGuards(JWTAuthGuard)
  findblock(@Req() req: any) {
    this.logger.debug(`Called ${UserController.name} ${this.findblock.name}`);
    try {
      const user_id = req.user_id;
      return this.blockService.findBlockAll(user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 친구 정보 확인
  @Get("/block/find/one")
  @UseGuards(JWTAuthGuard)
  findBlockById(@Req() req: any) {
    this.logger.debug(
      `Called ${UserController.name} ${this.findBlockById.name}`,
    );
    try {
      return this.blockService.findBlock(req.user_id, req.blocked_user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 차단 해제
  @Delete("/block/remove")
  @UseGuards(JWTAuthGuard)
  removeBlock(@Req() req: any) {
    this.logger.debug(`Called ${UserController.name} ${this.removeBlock.name}`);
    try {
      return this.blockService.removeBlock(req.user_id, req.blocked_user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자 본인 정보 확인
  @Get("/me")
  @UseGuards(JWTAuthGuard)
  async getMyInfo(
    @User() user: UserSessionDto,
  ): Promise<UserInfoDto | HttpException> {
    this.logger.debug(`Called ${UserController.name} ${this.getMyInfo.name}`);
    try {
      const userData = await this.userService.findUserById(user.id);
      const userInfo: UserInfoDto = {
        id: userData.id,
        nickname: userData.nickname,
        avatar: userData.avatar,
        status: userData.status,
      };
      return userInfo;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자 본인 정보 (프로필 페이지) 확인
  @Get("/me/profile")
  @UseGuards(JWTAuthGuard)
  async findMe(@Req() req: any): Promise<UserProfileDto | HttpException> {
    this.logger.debug(`Called ${UserController.name} ${this.findMe.name}`);
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
        is_friend: false,
        at_friend: null,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
        loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
      };
      return Userprofile;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자의 닉네임, 프로필 사진, 2FA 설정 변경
  // @Put("/me/update")
  // @UseGuards(JWTAuthGuard)
  // @UseInterceptors(FileInterceptor("file"))
  // updateME(
  //   @Req() req: any,
  //   @UploadedFile() file: Express.Multer.File,
  // ): Promise<User> | HttpException {
  //   try {
  //     this.logger.debug(`Called ${UserController.name} ${this.updateME.name}`);
  //     this.checkNickname(req.user.nickname);
  //     return this.userService.updateUserProfile(req.user, file);
  //   } catch (error) {
  //     return new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //   }
  // }

  //사용자의 특정 유저 프로필 검색
  // @Get("/profile/:id")
  // @UseGuards(JWTAuthGuard)
  // async getprofilebyid(
  //   @Req() req: any,
  // ): Promise<UserProfileDto | HttpException> {
  //   this.logger.debug(
  //     `Called ${UserController.name} ${this.getprofilebyid.name}`,
  //   );
  //   try {
  //     const UserInfo = await this.userService.findUserById(req.user_id);
  //     const UserGameInfo = await this.gamePlayerService.findGamePlayerByUserId(
  //       req.user_id,
  //     );
  //     //첫번째 인자는, 사용자의 id, 두번째 인자는, 찾고자하는 user의 id
  //     const UserFriendInfo = await this.friendService.findFriend(
  //       req.user_id,
  //       req.friend_id,
  //     );

  //     const Userprofile: UserProfileDto = {
  //       id: UserInfo.id,
  //       intra_name: UserInfo.intra_name,
  //       nickname: UserInfo.nickname,
  //       avatar: UserInfo.avatar,
  //       email: UserInfo.email,
  //       games: UserGameInfo.length,
  //       wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
  //       loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
  //       is_friend: UserFriendInfo ? true : false,
  //       at_friend: UserFriendInfo ? UserFriendInfo.created_at : null,
  //     };
  //     return Userprofile;
  //   } catch (e) {
  //     return new HttpException(e.message, HttpStatus.BAD_REQUEST);
  //   }
  // }

  //특정 유저의 공개 프로필 검색 (닉네임)
  @Get("/profile/:nickname")
  @UseGuards(JWTAuthGuard)
  async getProfileByNickname(
    @Param("nickname") nickname: string,
    @User() user: UserSessionDto,
  ): Promise<UserProfileDto | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.getProfileByNickname.name}`,
    );
    try {
      const UserInfo = await this.userService.findUserByNickname(nickname);
      const UserGameInfo = await this.gamePlayerService.findGamePlayerByUserId(
        UserInfo.id,
      );
      const UserFriendInfo = await this.friendService.findFriend(
        user.id,
        UserInfo.id,
      );
      const Userprofile: UserProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
        loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
        is_friend: UserFriendInfo ? true : false,
        at_friend: UserFriendInfo ? UserFriendInfo.created_at : null,
      };
      return Userprofile;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자의 특정유저 검색
  @Get("/search/:nickname")
  @UseGuards(JWTAuthGuard)
  async searchUserByNickname(
    @Param("nickname") nickname: string,
  ): Promise<UserDto[] | HttpException> {
    try {
      const User = await this.userService.searchUserByNickname(nickname);
      return User;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  // 닉네임 정책 : 길이 16, 영어, 숫자, 대쉬, 언더바만 허용
  private checkNickname(nickname: string): void {
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
