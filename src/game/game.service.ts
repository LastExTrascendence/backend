import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayers } from "./entity/game.players.entity";
import { Game } from "./entity/game.entity";
import { ChannelPolicy, GameMode, GameType, Status } from "./entity/game.enum";
import { GameChannelListDto, GameDto, UserInfoDto } from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";

//npm i bcrypt @types/bcrypt --save

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private RedisClient: Redis,
  ) {}

  async createGame(req: any): Promise<void> {
    try {
      const GameInfo = this.RedisClient.lrange(`Game: ${req.title}`, 0, -1);
      const password = await bcrypt.hash(req.password, 10);

      if ((await GameInfo).find((title) => title === req.title)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (req.title.length > 20) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방 제목은 20자 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.RedisClient.hset(`Game: ${req.title}`, "title", req.title);
      await this.RedisClient.hset(`Game: ${req.title}`, "password", password);
      await this.RedisClient.hset(
        `${req.title}`,
        "ChannelPolicy",
        req.ChannelPolicy.toString(),
      );
      await this.RedisClient.hset(
        `Game: ${req.title}`,
        "mode",
        req.mode.toString(),
      );
      await this.RedisClient.hset(
        `Game: ${req.title}`,
        "creator",
        req.nickname.toString(),
      );
      await this.RedisClient.hset(
        `Game: ${req.title}`,
        "GameType",
        req.gametype,
      );
      await this.RedisClient.hset(
        `Game: ${req.title}`,
        "GameMode",
        req.gamemode,
      );
    } catch (error) {
      throw error;
    }
  }

  async enterGame(
    req: any,
    password: string,
  ): Promise<string[] | HttpException> {
    try {
      const GameInfo = await this.RedisClient.lrange(
        `Game: ${req.title}`,
        0,
        -1,
      );
      if (GameInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하지 않는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const checkIds = GameInfo.filter((value) =>
        /^user nickname: \d+$/.test(value),
      );
      if (password && req.ChannelPolicy === ChannelPolicy.PRIVATE) {
        const isMatch = await bcrypt.compare(password, (await GameInfo)[1]);
        if (!isMatch) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "비밀번호가 일치하지 않습니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      for (let i = 0; i < (await checkIds).length; i++) {
        if ((await GameInfo)[i] === req.user.nickname) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "이미 존재하는 방입니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      await this.RedisClient.rpush(
        `Game: ${req.title}`,
        `user nickname: ${req.nickname}`,
      );
      return GameInfo;
    } catch (error) {
      throw error;
    }
  }

  async getGameRooms(req: any): Promise<GameChannelListDto[] | HttpException> {
    try {
      const keys = await this.RedisClient.keys("Game:");

      const filteredKeys = keys.filter((key) => key.startsWith("Game:"));

      if (filteredKeys.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const channels: GameChannelListDto[] = [];

      for (let i = 0; i < keys.length; i++) {
        const game = await this.RedisClient.hgetall(filteredKeys[i]);

        //get game list
        const users: UserInfoDto = {
          nickname: game.nickname,
          avatar: game.avatar,
        };

        const channelinfo: GameChannelListDto = {
          title: game.title,
          channelPolicy: game.channelPolicy as ChannelPolicy,
          password: game.password,
          creator: users,
          gameType: game.GameType as GameType,
          gameMode: game.GameMode as GameMode,
        };

        channels.push(channelinfo);
      }
      return channels;
    } catch (error) {
      throw error;
    }
  }
}
