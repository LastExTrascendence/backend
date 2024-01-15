import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { GameChannelPolicy, GameStatus } from "./enum/game.enum";
import { gameChannelListDto, gameUserVerifyDto } from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";
import { connectedClients } from "./game.gateway";
import { GameChannel } from "./entity/game.channel.entity";

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    private userService: UserService,
    private redisClient: Redis,
  ) {}

  async createGame(
    gameChannelListDto: gameChannelListDto,
  ): Promise<gameChannelListDto | HttpException> {
    try {
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
        gameChannelListDto.title,
      );

      if (gameChannelListDto.password) {
        await this.redisClient.hset(
          `GM|${gameChannelListDto.title}`,
          "password",
          await bcrypt.hash(gameChannelListDto.password, 10),
        );
      }

      const retGameInfo: gameChannelListDto = {
        id: newGameInfo.id,
        title: newGame.title,
        channelPolicy: newGame.game_channel_policy,
        password: null,
        creatorId: newGame.creator_id,
        gameType: gameChannelListDto.gameType,
        gameMode: gameChannelListDto.gameMode,
        gameStatus: GameStatus.READY,
        curUser: 0,
        maxUser: 2,
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

      const gamePassword = await this.redisClient.hget(
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
        const userInfo = await this.userService.findUserByNickname(
          gameUserVerifyDto.nickname,
        );

        this.redisClient.rpush(
          `GM|${gameUserVerifyDto.title}`,
          `ACCESS|${userInfo.id}`,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getGames(req: any): Promise<gameChannelListDto[] | HttpException> {
    try {
      const channelsInfo = await this.gameChannelRepository.find();
      if (channelsInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (connectedClients.size === 0) {
        //const gamesInfo = await this.gameRoomsRepository.find();
        // 소켓에 아무도 없을 시 games deleteAt 어떻게 할건지 논의 필요
        //for (let i = 0; i < channelUserInfo.length; i++) {
        //  this.gameRepository.update(
        //    { id: channelUserInfo[i].id },
        //    { deletedAt: new Date() },
        //  );
        //  channelUserInfo[i].deletedAt = new Date();
        //}
        for (let i = 0; i < channelsInfo.length; i++) {
          this.gameChannelRepository.update(
            { id: channelsInfo[i].id, deleted_at: IsNull() },
            { cur_user: 0, deleted_at: new Date() },
          );
        }

        for (let i = 0; i < channelsInfo.length; i++) {
          this.redisClient.del(`GM|*`);
        }
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
          gameType: channelsInfo[i].game_type,
          gameMode: channelsInfo[i].game_mode,
          gameStatus: channelsInfo[i].game_status,
        };

        totalChannels.push(channel);
      }

      return totalChannels;
    } catch (error) {
      throw error;
    }
  }
}
