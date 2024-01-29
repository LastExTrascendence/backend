import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayer } from "./entity/game.player.entity";
import { UserService } from "src/user/user.service";
import { gameRecordDto, gameStatsDto } from "./dto/game.dto";
import { Game } from "./entity/game.entity";
import { GameResult, GameType } from "./enum/game.enum";
import { GameChannelService } from "./game.channel.service";
import { RedisService } from "src/commons/redis-client.service";

@Injectable()
export class GamePlayerService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    @Inject(forwardRef(() => UserService))
    private userServie: UserService,
    @Inject(forwardRef(() => GameChannelService))
    private gameChannelService: GameChannelService,
    private redisService: RedisService,
  ) {}

  async findGamesByUserId(user_id: number): Promise<GamePlayer[]> {
    try {
      const gamePlayer = await this.gamePlayerRepository.find({
        where: { user_id: user_id },
      });
      return gamePlayer;
    } catch (error) {
      throw new HttpException(
        "게임 플레이어 조회에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async saveGamePlayer(
    gameId: number,
    homeScore: number,
    awayScore: number,
  ): Promise<void | HttpException> {
    try {
      console.log(`saveGamePlayer ${gameId} ${homeScore} ${awayScore}`);

      const gameInfo =
        await this.gameChannelService.findOneGameChannelById(gameId);

      if (gameInfo.game_type === GameType.SINGLE) {
        return;
      }

      const redisInfo = await this.redisService.hgetall(`GM|${gameInfo.title}`);

      const homeUserInfo = await this.userServie.findUserById(
        parseInt(redisInfo.creator),
      );
      const awayUserInfo = await this.userServie.findUserById(
        parseInt(redisInfo.user),
      );

      if (homeScore === 5) {
        await this.gamePlayerRepository.save({
          user_id: homeUserInfo.id,
          game_id: gameId,
          role: GameResult.WINNER,
          score: homeScore,
        });
        await this.gamePlayerRepository.save({
          user_id: awayUserInfo.id,
          game_id: gameId,
          role: GameResult.LOSER,
          score: awayScore,
        });
      } else if (awayScore === 5) {
        await this.gamePlayerRepository.save({
          user_id: homeUserInfo.id,
          game_id: gameId,
          role: GameResult.LOSER,
          score: homeScore,
        });
        await this.gamePlayerRepository.save({
          user_id: awayUserInfo.id,
          game_id: gameId,
          role: GameResult.WINNER,
          score: awayScore,
        });
      } else {
        throw new HttpException(
          "게임 플레이어 저장에 실패하였습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(
        "게임 플레이어 저장에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getGamePlayerRecord(
    nickname: string,
  ): Promise<gameRecordDto[] | HttpException> {
    try {
      const gamePlayer = await this.userServie.findUserByNickname(nickname);
      const gamePlayerInfo = await this.gamePlayerRepository.find({
        where: { user_id: gamePlayer.id },
      });

      const totalUserStatsInfo = [];

      for (let i = 0; i < gamePlayerInfo.length; i++) {
        const gameInfo = await this.gameRepository.findOne({
          where: { id: gamePlayerInfo[i].game_id },
        });

        const gamePlayerRecord: gameRecordDto = {
          nickname: gamePlayer.nickname,
          gameUserRole: gamePlayerInfo[i].role,
          gameType: gameInfo.game_type,
          gameMode: gameInfo.game_mode,
          date: gameInfo.ended_at,
        };

        totalUserStatsInfo.push(gamePlayerRecord);
      }

      return totalUserStatsInfo;
    } catch (error) {
      throw new HttpException(
        "게임 기록 조회에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async dropOutGamePlayer(
    gameId: number,
    userId: number,
  ): Promise<void | HttpException> {
    try {
      const gameInfo =
        await this.gameChannelService.findOneGameChannelById(gameId);

      if (gameInfo.game_type === GameType.SINGLE) {
        return;
      }

      const redisInfo = await this.redisService.hgetall(`GM|${gameInfo.title}`);

      const homeUserInfo = await this.userServie.findUserById(
        parseInt(redisInfo.creator),
      );
      const awayUserInfo = await this.userServie.findUserById(
        parseInt(redisInfo.user),
      );

      if (homeUserInfo.id === userId) {
        await this.gamePlayerRepository.save({
          user_id: homeUserInfo.id,
          game_id: gameId,
          role: GameResult.LOSER,
          score: 0,
        });
        await this.gamePlayerRepository.save({
          user_id: awayUserInfo.id,
          game_id: gameId,
          role: GameResult.WINNER,
          score: 5,
        });
      } else if (awayUserInfo.id === userId) {
        await this.gamePlayerRepository.save({
          user_id: homeUserInfo.id,
          game_id: gameId,
          role: GameResult.WINNER,
          score: 5,
        });
        await this.gamePlayerRepository.save({
          user_id: awayUserInfo.id,
          game_id: gameId,
          role: GameResult.LOSER,
          score: 0,
        });
      } else {
        throw new HttpException(
          "게임 플레이어 저장에 실패하였습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(
        "게임 플레이어 저장에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Status
  async getGamePlayerStats(
    nickname: string,
  ): Promise<gameStatsDto | HttpException> {
    try {
      //User DB 들고오기
      const gamePlayer = await this.userServie.findUserByNickname(nickname);

      //GamePlayer DB 전부 다 들고오기
      const gamePlayerInfo = await this.gamePlayerRepository.find({
        where: { user_id: gamePlayer.id },
      });

      const totalGameInfo = [];

      for (let i = 0; i < gamePlayerInfo.length; i++) {
        const gameInfo = await this.gameRepository.findOne({
          where: { id: gamePlayerInfo[i].game_id },
        });
        totalGameInfo.push(gameInfo);
      }

      const gamePlayerRecord: gameStatsDto = {
        nickname: nickname,
        //longestGame은 gameInfo.gameTime을 기준으로 내림차순 정렬하여 가장 첫번째 값을 가져온다.
        longestGame: totalGameInfo.sort((a, b) => b.gameTime - a.gameTime)[0],
        //shortestGame은 gameInfo.gameTime을 기준으로 오름차순 정렬하여 가장 첫번째 값을 가져온다.
        shortestGame: totalGameInfo.sort((a, b) => a.gameTime - b.gameTime)[0],
        //averageGame은 gameInfo.playTime 모두 더한 후 gameInfo의 개수로 나눈다.
        averageGameTime:
          totalGameInfo
            .map((gameInfo) => gameInfo.playTime)
            .reduce((a, b) => a + b, 0) / totalGameInfo.length,
        //totalPointScored는 gamePlayerInfo.score 모두 더한다.
        totalPointScored: gamePlayerInfo
          .map((gamePlayerInfo) => gamePlayerInfo.score)
          .reduce((a, b) => a + b, 0),
        //averageScorePerGame은 gamePlayerInfo.score 모두 더한 후 gamePlayerInfo의 개수로 나눈다.
        averageScorePerGame:
          gamePlayerInfo
            .map((gamePlayerInfo) => gamePlayerInfo.score)
            .reduce((a, b) => a + b, 0) / gamePlayerInfo.length,
        //averageScorePerGame은 승리한 경우의 gamePlayerInfo.score 모두 더한 후 승리한 게임의 개수로 나눈다.
        averageScorePerWin:
          gamePlayerInfo
            .filter(
              (gamePlayerInfo) => gamePlayerInfo.role === GameResult.WINNER,
            )
            .map((gamePlayerInfo) => gamePlayerInfo.score)
            .reduce((a, b) => a + b, 0) /
          gamePlayerInfo.filter(
            (gamePlayerInfo) => gamePlayerInfo.role === GameResult.WINNER,
          ).length,
        //winStreaks는 gamePlayerInfo에서 최근 게임을 기준으로 연속적으로 승리한 게임의 개수를 구한다.
        //예를들어 최근부터, win, win, win, lose, win 이라면 winStreaks는 3이 된다.
        winStreaks: gamePlayerInfo
          .filter((gamePlayerInfo) => gamePlayerInfo.role === GameResult.WINNER)
          .reverse()
          .findIndex(
            (gamePlayerInfo) => gamePlayerInfo.role === GameResult.LOSER,
          ),
        //averageSpeed는 gameInfo.averageSpeed 모두 더한 후 gameInfo의 개수로 나눈다.
        averageSpeed:
          totalGameInfo
            .map((gameInfo) => gameInfo.averageSpeed)
            .reduce((a, b) => a + b, 0) / totalGameInfo.length,
        //fatestGame은 gameInfo.averageSpeed을 기준으로 오름차순 정렬하여 가장 첫번째 값을 가져온다.
        fastestGame: totalGameInfo.sort(
          (a, b) => a.averageSpeed - b.averageSpeed,
        )[0],
      };
      // 패배가 없을 경우 -1을 반환하기 때문에 0으로 초기화 시켜줌
      if (gamePlayerRecord.winStreaks === -1) {
        gamePlayerRecord.winStreaks = 0;
      }

      return gamePlayerRecord;
    } catch (error) {
      throw new HttpException(
        "게임 기록 조회에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
