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
  GameStatsDto,
  GameUserVerifyDto,
} from "./dto/game.dto";
import { GameService } from "./game.service";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { GamePlayerService } from "./game.players.service";

@Controller("game")
@UseGuards(JWTAuthGuard)
export class GameController {
  private logger = new Logger(GameController.name);
  constructor(
    private gameService: GameService,
    private gamePlayerSerivce: GamePlayerService,
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

  @Get("/record/:nickname")
  async getRecordByNickname(
    @Param("nickname") nickname: string,
  ): Promise<GameRecordDto[] | HttpException> {
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
  ): Promise<void | GameStatsDto | HttpException> {
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
}
