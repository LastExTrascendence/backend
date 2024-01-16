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

@Injectable()
export class GameService {
  private logger = new Logger(GameService.name);
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    private userService: UserService,
    private RedisClient: Redis,
  ) {}

  async createGame(
    gameChannelListDto: gameChannelListDto,
  ): Promise<gameChannelListDto | HttpException> {
    try {
      this.logger.debug(gameChannelListDto);
      const gameInfo = await this.RedisClient.lrange(
        `GM|${gameChannelListDto.title}`,
        0,
        -1,
      );
      if (gameInfo.length !== 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (gameChannelListDto.title.length > 20) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방 제목은 20자 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const createInfo = await this.userService.findUserById(
        gameChannelListDto.creatorId,
      );

      const newGame = {
        creator_id: createInfo.id,
        creator_avatar: createInfo.avatar,
        title: gameChannelListDto.title,
        game_channel_policy: GameChannelPolicy.PUBLIC,
        game_type: gameChannelListDto.gameType,
        game_mode: gameChannelListDto.gameMode,
        game_status: GameStatus.READY,
        cur_user: 0,
        max_user: 2,
        created_at: new Date(),
        deleted_at: null,
      };
      if (gameChannelListDto.password) {
        newGame.game_channel_policy = GameChannelPolicy.PRIVATE;
      }

      await this.gameChannelRepository.save(newGame);

      const newGameInfo = await this.gameChannelRepository.findOne({
        where: { title: newGame.title },
      });

      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "title",
        newGame.title,
      );

      if (gameChannelListDto.password) {
        await this.RedisClient.hset(
          `GM|${gameChannelListDto.title}`,
          "password",
          await bcrypt.hash(gameChannelListDto.password, 10),
        );
      }

      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "creator",
        createInfo.id,
      );

      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "userReady",
        "false",
      );
      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "userOnline",
        "false",
      );
      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "creatorOnline",
        "false",
      );

      const retGameInfo = {
        id: newGameInfo.id,
        title: newGame.title,
        gameChannelPolicy: newGame.game_channel_policy,
        password: null,
        creatorId: newGame.creator_id,
        curUser: 0,
        maxUser: 2,
        gameType: gameChannelListDto.gameType,
        gameMode: gameChannelListDto.gameMode,
        gameStatus: GameStatus.READY,
      };

      return retGameInfo;
    } catch (error) {
      throw error;
    }
  }

  async enterGame(
    gameUserVerifyDto: gameUserVerifyDto,
  ): Promise<void | HttpException> {
    try {
      const GameInfo = await this.RedisClient.lrange(
        `GM|${gameUserVerifyDto.title}`,
        0,
        -1,
      );
      if (GameInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방이 존재하지 않습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const redisInfo = await this.RedisClient.hgetall(
        `GM|${gameUserVerifyDto.title}`,
      );

      if (gameUserVerifyDto.password) {
        const isMatch = await bcrypt.compare(
          gameUserVerifyDto.password,
          redisInfo.password,
        );
        if (!isMatch) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "비밀번호가 일치하지 않습니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "잘못된 접근입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getGames(req: any): Promise<gameChannelListDto[] | HttpException> {
    try {
      console.log(connectedClients, connectedClients.size);
      if (connectedClients.size === 0) {
        await this.RedisClient.del("GM|*");
        await this.gameChannelRepository.update(
          {},
          {
            cur_user: 0,
            deleted_at: new Date(),
          },
        );
      }

      const channelsInfo = await this.gameChannelRepository.find({
        where: { deleted_at: IsNull() },
      });
      if (channelsInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const totalChannels = [];

      for (let i = 0; i < channelsInfo.length; i++) {
        const channel = {
          id: channelsInfo[i].id,
          title: channelsInfo[i].title,
          channelPolicy: channelsInfo[i].game_channel_policy,
          creator: {
            nickname: (
              await this.userService.findUserById(channelsInfo[i].creator_id)
            ).nickname,
            avatar: channelsInfo[i].creator_avatar,
          },
          cur_user: 0,
          max_user: 2,
          gameType: channelsInfo[i].game_type,
          gameMode: channelsInfo[i].game_mode,
          gameStatus: channelsInfo[i].game_status,
        };

        totalChannels.push(channel);
      }
      // console.log(totalChannels);
      return totalChannels;
    } catch (error) {
      throw error;
    }
  }
}

// title
// password
// creator
// user
