import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayers } from "./entity/game.players.entity";
import { Game } from "./entity/game.entity";
import { Status } from "./entity/game.enum";
import { GameDto } from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";

//npm i bcrypt @types/bcrypt --save

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    private RedisClient: Redis,
  ) {}

  async createGame(req: any): Promise<void> {
    try {
      const GameInfo = this.RedisClient.lrange(`${req.game_title}`, 0, -1);
      const password = await bcrypt.hash(req.password, 10);

      if (
        (await GameInfo).find((game_title) => game_title === req.game_title)
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (req.game_title.length > 20) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방 제목은 20자 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.RedisClient.hset(
        `${req.game_title}`,
        "game_title",
        req.game_title,
      );
      await this.RedisClient.hset(`${req.game_title}`, "password", password);
      await this.RedisClient.hset(
        `${req.game_title}`,
        "room_type",
        req.room_type.toString(),
      );
      await this.RedisClient.hset(
        `${req.game_title}`,
        "mode",
        req.mode.toString(),
      );
      await this.RedisClient.hset(
        `${req.game_title}`,
        "creator",
        req.status.toString(),
      );
      await this.RedisClient.hset(
        `${req.game_title}`,
        "type",
        req.type.toString(),
      );
      await this.RedisClient.hset(
        `${req.game_title}`,
        "created_at",
        new Date().toString(),
      );
    } catch (error) {
      throw error;
    }
  }

  async enterGame(
    game_title: string,
    password: string,
    req: any,
  ): Promise<void> {
    try {
      const roomInfo = await this.RedisClient.hgetall(game_title);
      if (!roomInfo) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하지 않는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (roomInfo.password !== password) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "비밀번호가 틀렸습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (roomInfo.room_type === "private") {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "비공개 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (roomInfo.room_type === "public") {
        await this.RedisClient.rpush(game_title, req.user.nickname);
      }
    } catch (error) {
      throw error;
    }
  }

  async getRooms(req: any): Promise<Record<string, string>[] | HttpException> {
    try {
      const rooms = await this.RedisClient.keys("*");
      const roomInfo = await Promise.all(
        rooms.map(async (room) => {
          const roomInfo = await this.RedisClient.hgetall(room);
          return roomInfo;
        }),
      );
      return roomInfo;
    } catch (error) {
      throw error;
    }
  }
}
