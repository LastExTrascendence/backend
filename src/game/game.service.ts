import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { games } from "./entity/game.entity";
import {
  GameChannelPolicy,
  GameMode,
  GameType,
  GameStatus,
} from "./enum/game.enum";
import { GameChannelListDto, GameUserVerifyDto } from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(games)
    private gameRepository: Repository<games>,
    private userService: UserService,
    private RedisClient: Redis,
  ) {}

  async createGame(
    gameChannelListDto: GameChannelListDto,
  ): Promise<GameChannelListDto | HttpException> {
    try {
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
        title: gameChannelListDto.title,
        channelPolicy: GameChannelPolicy.PUBLIC,
        creatorId: createInfo.id,
        creatorAvatar: createInfo.avatar,
        gameType: gameChannelListDto.gameType,
        gameMode: gameChannelListDto.gameMode,
        status: GameStatus.READY,
        createdAt: new Date(),
      };
      if (gameChannelListDto.password) {
        newGame.channelPolicy = GameChannelPolicy.PRIVATE;
      }

      await this.gameRepository.save(newGame);

      const newGameInfo = await this.gameRepository.findOne({
        where: { title: newGame.title },
      });

      await this.RedisClient.hset(
        `GM|${gameChannelListDto.title}`,
        "title",
        gameChannelListDto.title,
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
        "curUser",
        0,
      );

      const retGameInfo = {
        id: newGameInfo.id,
        title: newGame.title,
        channelPolicy: newGame.channelPolicy,
        password: null,
        creatorId: newGame.creatorId,
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
    gameUserVerifyDto: GameUserVerifyDto,
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

      const gamePassword = await this.RedisClient.hget(
        `GM|${gameUserVerifyDto.title}`,
        "password",
      );

      if (gameUserVerifyDto.password) {
        const isMatch = await bcrypt.compare(
          gameUserVerifyDto.password,
          gamePassword,
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

      const userInfo = await this.userService.findUserByNickname(
        gameUserVerifyDto.nickname,
      );

      this.RedisClient.rpush(
        `GM|${gameUserVerifyDto.title}`,
        `ACCESS|${userInfo.id}`,
      );
    } catch (error) {
      throw error;
    }
  }

  async getGames(): Promise<GameChannelListDto[] | HttpException> {
    try {
      const channelsInfo = await this.gameRepository.find();
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
          channelPolicy: channelsInfo[i].gameChannelPolicy,
          creator: {
            nickname: (
              await this.userService.findUserById(channelsInfo[i].creatorId)
            ).nickname,
            avatar: channelsInfo[i].creatorAvatar,
          },
          gameType: channelsInfo[i].gameType,
          gameMode: channelsInfo[i].gameMode,
          gameStatus: channelsInfo[i].gameStatus,
        };

        totalChannels.push(channel);
      }

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
