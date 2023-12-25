import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayers } from "./entity/game.players.entity";
import { Game } from "./entity/game.entity";
import { Status } from "./entity/game.enum";
import { GameDto } from "./dto/game.dto";

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async createGame(gameDto: GameDto): Promise<void> {
    try {
      const { type, mode } = gameDto;
      const newGame = {
        type: type,
        mode: mode,
        status: Status.READY,
        created_at: new Date(),
        minimum_speed: null,
        average_speed: null,
        maximum_speed: null,
        number_of_rounds: null,
        number_of_bounces: null,
        ended_at: null,
      };
      await this.gameRepository.save(newGame);
    } catch (error) {
      throw error;
    }
  }

  async finishGame(game_id: number): Promise<void> {
    try {
      const game = await this.gameRepository.findOne({
        where: { id: game_id },
      });
      if (!game)
        throw new HttpException(
          "게임을 찾을 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      // 게임 통계 저장 부분 추가 필요
      game.status = Status.DONE;
      await this.gameRepository.save(game);
    } catch (error) {
      throw error;
    }
  }
}
