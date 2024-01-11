import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  GameChannelListDto,
  GameRecordDto,
  GameUserVerifyDto,
} from "./dto/game.dto";
import { GameService } from "./game.service";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { GamePlayerService } from "./game.players.service";
import Redis from "ioredis";
import { Socket } from "socket.io";
import { UserService } from "src/user/user.service";

@Controller("game")
@UseGuards(JWTAuthGuard)
export class GameController {
  private logger = new Logger(GameController.name);
  constructor(
    private gameService: GameService,
    private gamePlayerSerivce: GamePlayerService,
    private redisClient: Redis,

  ) {}

  //게임 방 조회
  @Get("/")
  async getGameRooms(
    @Req() req: any,
  ): Promise<GameChannelListDto[] | HttpException> {
    this.logger.debug(
      `Called ${GameController.name} ${this.getGameRooms.name}`,
    );
    try {
      return await this.gameService.getGames(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 새로운 방 생성
  @Post("/create")
  async createGame(
    @Body(ValidationPipe) gameChannelListDto: GameChannelListDto,
  ): Promise<GameChannelListDto | HttpException> {
    this.logger.debug(`Called ${GameController.name} ${this.createGame.name}`);
    try {
      return await this.gameService.createGame(gameChannelListDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 방 입장
  @Post("/enter")
  async enterGame(
    @Body() gameUserVerifyDto: GameUserVerifyDto,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.enterGame.name}`);
      await this.gameService.enterGame(gameUserVerifyDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  
  //game enterQuickMatching test Url
//   @Post("/test")
//   async test(
//     @Body() data : any
//   ) : Promise<any> {
//     try {
//       const { userId } = data;
    
//     //1. Redis에 클라이언트 저장
//     this.redisClient.rpush("QS", userId);
//     // this.redisClient.lpop("QS");

//     //2. gameQickMathing(Map)에 클라이언트, socket 저장
//     this.gameQickMathing.set(data.userId, null);

//     //3. 앞에 두 놈 매칭 잡아주기
//     if (this.gameQickMathing.size >= 2) {
      
//       const firstUserId =  parseInt(await this.redisClient.lpop("QS"))
//       this.gameQickMathing.delete(firstUserId)
//       const secondUserId = parseInt(await this.redisClient.lpop("QS"))
//       this.gameQickMathing.delete(secondUserId)

//       const TotalUserInfo = [];

//       const firstUserInfo = await this.userService.findUserById(firstUserId)
//       const secondUserInfo = await this.userService.findUserById(secondUserId)

//       //첫 번째 친구 info 넣어주기
//       const UserInfo = {
//         id: firstUserInfo.id,
//         nickname: firstUserInfo.nickname,
//         avatar: firstUserInfo.avatar,
//       };
//       TotalUserInfo.push(UserInfo);

//       //두 번째 친구 넣어주기
//       const UserInfo2 = {
//         id: secondUserInfo.id,
//         nickname: secondUserInfo.nickname,
//         avatar: secondUserInfo.avatar,
//       };
//       TotalUserInfo.push(UserInfo2);

//       return TotalUserInfo
//       // this.server.emit("userList", TotalUserInfo);
//     } 
//     else
//     {
//       return "대기중"
//     }
//   }
//   catch (error) {
//       this.logger.error(error);
//       throw error;
//   }
// }
  
  @Get("/record/:nickname")
  async getRecord(
    @Param("nickname") nickname: string,
  ): Promise<GameRecordDto | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.getRecord.name}`);
      return await this.gamePlayerSerivce.getGamePlayerRecord(nickname);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
