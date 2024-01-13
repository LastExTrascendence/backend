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
  Put,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  userBlockDto,
  userDto,
  userFriendDto,
  userInfoDto,
  userRegisterDataDto,
  userSessionDto,
} from "./dto/user.dto";
import { UserService } from "./user.service";
// import { User } from "./entity/user.entity";
import { FriendService } from "./user.friend.service";
import { UserFriend } from "./entity/user.friend.entity";
import { BlockService } from "./user.block.service";
import { UserBlock } from "./entity/user.block.entity";
import { JwtService } from "@nestjs/jwt";
import { Headers } from "@nestjs/common";
import { GamePlayerService } from "src/game/game.player.service";
import { updateUserInfoDto, userProfileDto } from "./dto/user.profile.dto";
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

  @Post("/create")
  @UseGuards(JWTUserCreationGuard)
  createUser(
    @Headers() headers: any,
    @Body(ValidationPipe) userRegisterDataDto: userRegisterDataDto,
  ): Promise<void> | HttpException {
    this.logger.debug(`Called ${UserController.name} ${this.createUser.name}`);
    const token = headers.authorization.replace("Bearer ", "");
    const decoded_token = this.jwtService.decode(token);
    const userSessionDto: userSessionDto = {
      ...userRegisterDataDto,
      id: 0,
      status: decoded_token["status"],
      two_fa: decoded_token["two_fa"],
      intra_name: decoded_token["intra_name"],
      email: decoded_token["email"],
    };
    try {
      this.userService.createUser(userSessionDto);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 친구 추가
  @Post("/friend/add")
  @UseGuards(JWTAuthGuard)
  addFriend(
    @Body(ValidationPipe) regist: userFriendDto,
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
  findAllFriend(@Req() req: any) {
    try {
      console.log(req);
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
  findFriendById(@Req() req: any) {
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
    @Body(ValidationPipe) userBlockDto: userBlockDto,
  ): Promise<UserBlock> | HttpException {
    this.logger.debug(`Called ${UserController.name} ${this.addBlock.name}`);
    try {
      return this.blockService.addBlock(
        userBlockDto.user_id,
        userBlockDto.blocked_user_id,
      );
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
    @User() user: userSessionDto,
  ): Promise<userInfoDto | HttpException> {
    this.logger.debug(`Called ${UserController.name} ${this.getMyInfo.name}`);
    try {
      const userData = await this.userService.findUserById(user.id);
      const userInfo: userInfoDto = {
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
  async getMyProfileInfo(
    @Req() req: any,
  ): Promise<userProfileDto | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.getMyProfileInfo.name}`,
    );
    try {
      const UserInfo = await this.userService.findUserById(req.user.id);
      const UserGameInfo = await this.gamePlayerService.findGamesByUserId(
        req.user.id,
      );

      const Userprofile: userProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        is_friend: false,
        at_friend: null,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.game_user_role === "WINNER")
          .length,
        loses: UserGameInfo.filter((game) => game.game_user_role === "LOSER")
          .length,
      };
      return Userprofile;
    } catch (e) {
      return new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자의 닉네임, 프로필 사진, 2FA 설정 변경
  @Put("/me/update")
  @UseGuards(JWTAuthGuard)
  async updateMyInfo(
    @User() user: userSessionDto,
    @Body(ValidationPipe) updateUserInfoDto: updateUserInfoDto,
  ): Promise<void | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.updateMyInfo.name}`,
    );
    try {
      this.userService.updateUserProfile(user.nickname, updateUserInfoDto);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자의 특정 유저 프로필 검색
  // @Get("/profile/:id")
  // @UseGuards(JWTAuthGuard)
  // async getprofilebyid(
  //   @Req() req: any,
  // ): Promise<userProfileDto | HttpException> {
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

  //     const Userprofile: userProfileDto = {
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
  @Get("/info/:nickname")
  @UseGuards(JWTAuthGuard)
  async getInfoByNickname(
    @Param("nickname") nickname: string,
    @User() user: userSessionDto,
  ): Promise<userProfileDto | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.getInfoByNickname.name}`,
    );
    try {
      const UserInfo = await this.userService.findUserByNickname(nickname);
      const UserGameInfo = await this.gamePlayerService.findGamesByUserId(
        UserInfo.id,
      );
      const UserFriendInfo = await this.friendService.findFriend(
        user.id,
        UserInfo.id,
      );
      const Userprofile: userProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.game_user_role === "WINNER")
          .length,
        loses: UserGameInfo.filter((game) => game.game_user_role === "LOSER")
          .length,
        is_friend: UserFriendInfo ? true : false,
        at_friend: UserFriendInfo ? UserFriendInfo.created_at : null,
      };
      return Userprofile;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 공개 프로필 검색 (닉네임)
  @Get("/profile/:nickname")
  @UseGuards(JWTAuthGuard)
  async getProfileByNickname(
    @Param("nickname") nickname: string,
    @User() user: userSessionDto,
  ): Promise<userProfileDto | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.getProfileByNickname.name}`,
    );
    try {
      const UserInfo = await this.userService.findUserByNickname(nickname);
      const UserGameInfo = await this.gamePlayerService.findGamesByUserId(
        UserInfo.id,
      );
      const UserFriendInfo =
        user.id === UserInfo.id
          ? null
          : await this.friendService.findFriend(user.id, UserInfo.id);
      const Userprofile: userProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.game_user_role === "WINNER")
          .length,
        loses: UserGameInfo.filter((game) => game.game_user_role === "LOSER")
          .length,
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
  ): Promise<userDto[] | HttpException> {
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
