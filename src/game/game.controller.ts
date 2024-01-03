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
import { GameDto, GamePlayersDto } from "./dto/game.dto";
import { GamePlayerService } from "./game.players.service";
import { GameService } from "./game.service";

@Controller("game")
export class GameController {
  private logger = new Logger(GameController.name);
  constructor(private gameService: GameService) {}

  //게임 새로운 방 생성
  //게임 방 조회

  //게임 방 입장

  @Post("/create")
  async createGame(@Req() req: any): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${GameController.name} ${this.createGame.name}`,
      );
      await this.gameService.createGame(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post("/enter")
  async enterGame(
    @Query("game_title") game_title: string,
    @Query("password") password: string,
    @Req() req: any,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.enterGame.name}`);
      await this.gameService.enterGame(game_title, password, req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get("/rooms")
  async getRooms(
    @Req() req: any,
  ): Promise<Record<string, string>[] | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.getRooms.name}`);
      return await this.gameService.getRooms(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
