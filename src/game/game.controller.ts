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
  constructor(
    private gameplayerService: GamePlayerService,
    private gameService: GameService,
  ) {}

  @Post("/create")
  async createGameUser(
    @Body() gamePlayersDto: GamePlayersDto,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${GameController.name} ${this.createGameUser.name}`,
      );
      await this.gameplayerService.createGamePlayer(gamePlayersDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post("/create/game")
  async createGame(@Body() gameDto: GameDto): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${GameController.name} ${this.createGame.name}`,
      );
      await this.gameService.createGame(gameDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
