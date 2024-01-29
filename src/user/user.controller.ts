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
  userAddFriendRequestDto,
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
import {
  myProfileResponseDto,
  updateUserInfoDto,
  userProfileDto,
} from "./dto/user.profile.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { JWTUserCreationGuard } from "src/auth/jwt/jwtUserCreation.guard";
import { User } from "src/decorator/user.decorator";
import { TwoFAGuard } from "src/auth/twoFA/twoFA.guard";

@Controller("user")
export class UserController {
  private logger = new Logger(UserController.name);
  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private blockService: BlockService,
    private jwtService: JwtService,
    private gamePlayerService: GamePlayerService,
  ) { }

  @Post("/create")
  @UseGuards(JWTUserCreationGuard)
  async createUser(
    @Headers() headers: any,
    @Body(ValidationPipe) userRegisterDataDto: userRegisterDataDto,
  ): Promise<void> {
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
      two_fa_complete: decoded_token["two_fa_complete"],
      language: decoded_token["language"],
    };
    try {
      await this.userService.createUser(userSessionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 친구 추가
  @Post("/friend/add")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async addFriend(
    @Body(ValidationPipe) userAddFriendRequestDto: userAddFriendRequestDto,
    @User() user: userSessionDto,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(`Called ${UserController.name} ${this.addFriend.name}`);
      const friend = await this.userService.findUserByNickname(
        userAddFriendRequestDto.nickname,
      );
      await this.friendService.addFriend(user.id, friend.id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 모든 친구 정보 확인
  @Get("/friend")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async findAllFriend(@User() user: userSessionDto) {
    this.logger.debug(
      `Called ${UserController.name} ${this.findAllFriend.name}`,
    );
    try {
      return await this.friendService.findAllFriend(user.id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자가 특정 한 유저 친구 정보 확인
  @Get("/friend/find/one")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 친구 삭제
  @Post("/friend/remove")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async deleteFriend(
    @Body(ValidationPipe) userAddFriendRequestDto: userAddFriendRequestDto,
    @User() user: userSessionDto,
  ) {
    this.logger.debug(
      `Called ${UserController.name} ${this.deleteFriend.name}`,
    );
    try {
      const friend = await this.userService.findUserByNickname(
        userAddFriendRequestDto.nickname,
      );
      return this.friendService.removeFriend(user.id, friend.id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }

  //특정 유저의 특정 한 유저 차단
  @Post("/block/add")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 모든 차단한 유저 정보 확인
  @Get("/block/find/all")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  findblock(@Req() req: any) {
    this.logger.debug(`Called ${UserController.name} ${this.findblock.name}`);
    try {
      const user_id = req.user_id;
      return this.blockService.findBlockAll(user_id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 친구 정보 확인
  @Get("/block/find/one")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  findBlockById(@Req() req: any) {
    this.logger.debug(
      `Called ${UserController.name} ${this.findBlockById.name}`,
    );
    try {
      return this.blockService.findBlock(req.user_id, req.blocked_user_id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 특정 한 유저 차단 해제
  @Delete("/block/remove")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  removeBlock(@Req() req: any) {
    this.logger.debug(`Called ${UserController.name} ${this.removeBlock.name}`);
    try {
      return this.blockService.removeBlock(req.user_id, req.blocked_user_id);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자 본인 정보 확인
  @Get("/me")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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
        language: userData.language,
      };
      return userInfo;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자 본인 정보 (프로필 페이지) 확인
  @Get("/me/profile")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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

      const Userprofile: myProfileResponseDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        two_fa: UserInfo.two_fa,
        is_friend: false,
        at_friend: null,
        language: UserInfo.language,
        games: UserGameInfo.length,
        wins: UserGameInfo.filter((game) => game.role === "WINNER").length,
        loses: UserGameInfo.filter((game) => game.role === "LOSER").length,
      };
      return Userprofile;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  //사용자의 닉네임, 프로필 사진, 2FA 설정 변경
  @Post("/me/update")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async updateMyInfo(
    @Headers() headers: any,
    @User() user: userSessionDto,
    @Body(ValidationPipe) updateUserInfoDto: updateUserInfoDto,
  ): Promise<void | HttpException> {
    this.logger.debug(
      `Called ${UserController.name} ${this.updateMyInfo.name}`,
    );
    try {
      await this.userService.updateUserProfile(
        user.nickname,
        updateUserInfoDto,
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //특정 유저의 공개 프로필 검색 (닉네임)
  @Get("/info/:nickname")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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
        language: UserInfo.language,
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

  //특정 유저의 공개 프로필 검색 (닉네임)
  @Get("/profile/:nickname")
  @UseGuards(JWTAuthGuard, TwoFAGuard)
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
      const UserFriendInfo = await this.friendService
        .findFriend(user.id, UserInfo.id)
        .catch(() => null);
      const Userprofile: userProfileDto = {
        id: UserInfo.id,
        intra_name: UserInfo.intra_name,
        nickname: UserInfo.nickname,
        avatar: UserInfo.avatar,
        email: UserInfo.email,
        games: UserGameInfo.length,
        language: UserInfo.language,
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
  @UseGuards(JWTAuthGuard, TwoFAGuard)
  async searchUserByNickname(
    @Param("nickname") nickname: string,
  ): Promise<userDto[] | HttpException> {
    try {
      const User = await this.userService.searchUserByNickname(nickname);
      return User;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
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
