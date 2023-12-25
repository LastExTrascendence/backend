import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayers } from "./entity/game.players.entity";
import { GamePlayersDto } from "./dto/game.dto";
import { Role } from "./entity/game.enum";

@Injectable()
export class GamePlayerService {
  constructor(
    @InjectRepository(GamePlayers)
    private gameplayerRepository: Repository<GamePlayers>,
  ) {}

  async createGamePlayer(gamePlayerDto: GamePlayersDto): Promise<void> {
    const { game_id, user_id, score } = gamePlayerDto;
    const newGamePlayer = {
      game_id: game_id,
      user_id: user_id,
      score: score,
      role: Role.LOSER,
    };
    console.log(newGamePlayer);
    if (score === 5) {
      newGamePlayer.role = Role.WINNER;
    } else if (score > 5 || score < 0) {
      throw new HttpException(
        "점수는 5점 이하 0점 이상이어야 합니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      await this.gameplayerRepository.save(newGamePlayer);
    } catch (error) {
      throw error;
    }
  }

  async findGamePlayerByUserId(user_id: number): Promise<GamePlayers[]> {
    try {
      const gameplayer: GamePlayers[] = await this.gameplayerRepository.find({
        where: { user_id: user_id },
      });
      if (!gameplayer)
        throw new HttpException(
          "게임을 찾을 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      return gameplayer;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
