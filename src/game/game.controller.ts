import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  gameChannelListDto,
  gameRecordDto,
  gameStatsDto,
  gameUserVerifyDto,
} from "./dto/game.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { GamePlayerService } from "./game.player.service";
import { GameChannelService } from "./game.channel.service";
import { TwoFAGuard } from "src/auth/twoFA/twoFA.guard";

@Controller("game")
@UseGuards(JWTAuthGuard, TwoFAGuard)
export class GameController {
  private logger = new Logger(GameController.name);
  constructor(
    private gameChannelService: GameChannelService,
    private gamePlayerSerivce: GamePlayerService,
  ) {}

  //게임 방 조회
  @Get("/")
  async getGameRooms(
    @Req() req: any,
  ): Promise<gameChannelListDto[] | HttpException> {
    this.logger.debug(
      `Called ${GameController.name} ${this.getGameRooms.name}`,
    );
    try {
      return await this.gameChannelService.getGames(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 새로운 방 생성
  @Post("/create")
  async createGame(
    @Body(ValidationPipe) gameChannelListDto: gameChannelListDto,
  ): Promise<gameChannelListDto | HttpException> {
    this.logger.debug(`Called ${GameController.name} ${this.createGame.name}`);
    try {
      return await this.gameChannelService.createGame(gameChannelListDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 방 입장
  @Post("/enter")
  async enterGame(
    @Body() gameUserVerifyDto: gameUserVerifyDto,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.enterGame.name}`);
      await this.gameChannelService.enterGame(gameUserVerifyDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get("/record/:nickname")
  async getRecordByNickname(
    @Param("nickname") nickname: string,
  ): Promise<gameRecordDto[] | HttpException> {
    try {
      this.logger.debug(
        `Called ${GameController.name} ${this.getRecordByNickname.name}`,
      );
      return await this.gamePlayerSerivce.getGamePlayerRecord(nickname);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get("/stats/:nickname")
  async getStatsByNickname(
    @Param("nickname") nickname: string,
  ): Promise<void | gameStatsDto | HttpException> {
    this.logger.debug(
      `Called ${GameController.name} ${this.getStatsByNickname.name}`,
    );
    try {
      // return await this.gamePlayerSerivce.getGamePlayerStats(nickname);
      return await this.gamePlayerSerivce.getGamePlayerStats(nickname);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //@Get("/:id")
  //async checkId(
  //  @Param("id") id: string,
  //): Promise<boolean | HttpException> {
  //  try {
  //    this.logger.debug(`Called checkId${GameController.name} ${this.checkId.name}`);
  //    return await this.gameChannelService.checkId(id);
  //  } catch (error) {
  //    throw new HttpException(error, 400);
  //  }
  //}
}
