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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { GameChannelListDto, GameDto, GamePlayersDto } from "./dto/game.dto";
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
  async createGame(
    @Req() req: any,
    @Res() res: any,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${GameController.name} ${this.createGame.name}`,
      );
      const password = await this.gameService.createGame(req);
      res.redirect("/game/enter", 301, {
        req: req,
        password: password,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post("/enter")
  async enterGame(
    @Body("req") req: any,
    @Body("password") password: string,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.enterGame.name}`);
      await this.gameService.enterGame(req, password);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get("/rooms")
  async getRooms(
    @Req() req: any,
  ): Promise<GameChannelListDto[] | HttpException> {
    try {
      this.logger.debug(`Called ${GameController.name} ${this.getRooms.name}`);
      return await this.gameService.getGameRooms(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
