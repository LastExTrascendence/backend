import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  GameChannelPolicy,
  GameMode,
  GameType,
  GameStatus,
} from "./enum/game.enum";
import { gameChannelListDto, gameUserVerifyDto } from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { connectedClients } from "./game.gateway";
import { Game } from "./entity/game.entity";

@Injectable()
export class GameService {
  recordGame(gameId: any, numberOfRounds: number, numberOfBounces: number) {
    throw new Error("Method not implemented.");
  }
  private logger = new Logger(GameService.name);
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<Game>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    private userService: UserService,
    private redisClient: Redis,
  ) { }

  async saveGame(channelId: number) {
    try {
      const game = await this.gameChannelRepository.findOne({
        where: {
          id: channelId,
        },
      });
      if (game) {
        const gameInfo = {
          channel_id: channelId,
          game_mode: game.game_mode,
          minimum_speed: null,
          average_speed: null,
          maximum_speed: null,
          number_of_rounds: null,
          number_of_bounces: null,
          play_time: null,
          created_at: new Date(),
          ended_at: null,
        };
        await this.gameChannelRepository.save(game);
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async saveRecord(
    gameId: number,
    minimumSpeed: number,
    averageSpeed: number,
    maximumSpeed: number,
    numberOfRounds: number,
    numberOfBounces: number,
    playTime: number,
  ) {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          id: gameId,
        },
      });
      if (game) {
        this.gameRepository.update(
          {
            id: gameId,
          },
          {
            minimum_speed: minimumSpeed,
            average_speed: averageSpeed,
            maximum_speed: maximumSpeed,
            number_of_rounds: numberOfRounds,
            number_of_bounces: numberOfBounces,
            play_time: playTime,
            ended_at: new Date(),
          },
        );
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}

// title
// password
// creator
// user
