import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Like, Repository } from "typeorm";
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
import { gameConnectedClients } from "./game.gateway";
import { GameService } from "./game.service";

@Injectable()
export class GameChannelService {
  private logger = new Logger(GameChannelService.name);
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    private userService: UserService,
    private redisClient: Redis,
    private gameService: GameService,
  ) {}

  async createGame(
    gameChannelListDto: gameChannelListDto,
  ): Promise<gameChannelListDto | HttpException> {
    try {
      this.logger.debug("gameChannelListDto");
      const gameInfo = await this.redisClient.lrange(
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

      await this.redisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "title",
        newGame.title,
      );

      if (
        gameChannelListDto.password &&
        gameChannelListDto.gameChannelPolicy === GameChannelPolicy.PRIVATE
      ) {
        const hashedPassword = await bcrypt.hash(
          gameChannelListDto.password,
          10,
        );
        await this.redisClient.hset(
          `CH|${gameChannelListDto.title}`,
          "password",
          hashedPassword,
        );
        await this.redisClient.hset(
          `GM|${gameChannelListDto.title}`,
          "password",
          await bcrypt.hash(gameChannelListDto.password, 10),
        );
      }

      await this.redisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "creator",
        createInfo.id,
      );

      await this.redisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "userReady",
        "false",
      );
      await this.redisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "userOnline",
        "false",
      );
      await this.redisClient.hset(
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
      const GameInfo = await this.redisClient.lrange(
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

      const redisInfo = await this.redisClient.hgetall(
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
        } else {
          const userInfo = await this.userService.findUserByNickname(
            gameUserVerifyDto.nickname,
          );

          await this.redisClient.hset(
            `GM|${gameUserVerifyDto.title}`,
            `ACCESS|${userInfo.id}`,
            userInfo.id,
          );
        }
      } else {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "잘못된 요청입니다.",
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
      if (gameConnectedClients.size === 0) {
        await this.deleteAllGameChannel();
        await this.gameService.deleteAllGame();
      }

      const channelsInfo = await this.gameChannelRepository.find({
        where: { game_status: GameStatus.READY, deleted_at: IsNull() },
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

  async doneGame(gameId: number) {
    const gameInfo = await this.gameChannelRepository.findOne({
      where: { id: gameId },
    });
    await this.gameChannelRepository.update(
      { id: gameId },
      { game_status: GameStatus.DONE, deleted_at: new Date() },
    );

    this.redisClient.del(`GM|${gameInfo.title}`);
  }

  async checkId(gameId: string) {
    const gameInfo = await this.gameChannelRepository.findOne({
      where: { id: parseInt(gameId) },
    });

    if (gameInfo) {
      return true;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "존재하지 않는 게임입니다.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteAllGameChannel() {
    if (gameConnectedClients.size === 0) {
      await this.redisClient.keys("GM|*").then((keys) => {
        keys.forEach((key) => {
          this.redisClient.del(key);
        });
      });
      await this.gameChannelRepository.update(
        { deleted_at: IsNull() },
        {
          cur_user: 0,
          game_status: GameStatus.DONE,
          deleted_at: new Date(),
        },
      );
    }
  }

  async findOneGameChannelById(gameId: number) {
    const gameInfo = await this.gameChannelRepository.findOne({
      where: { id: gameId },
    });

    if (gameInfo) {
      return gameInfo;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "존재하지 않는 게임입니다.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAllGameChannelByTitle(gameTitle: string) {
    const gameInfo = await this.gameChannelRepository.find({
      where: { title: gameTitle },
    });

    if (gameInfo) {
      return gameInfo;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "존재하지 않는 게임입니다.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findQuickMatches() {
    const gameInfo = await this.gameChannelRepository.find({
      where: { title: Like(`%Quick Match#%`) },
    });

    if (gameInfo) {
      return gameInfo.length;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "존재하지 않는 게임입니다.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOneGameChannelByTitle(gameTitle: string) {
    const gameInfo = await this.gameChannelRepository.findOne({
      where: {
        title: gameTitle,
        deleted_at: IsNull(),
        game_status: GameStatus.READY,
      },
    });

    if (gameInfo) {
      return gameInfo;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: "존재하지 않는 게임입니다.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

// title
// password
// creator
// user
