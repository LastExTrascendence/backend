import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { gamePlayers } from "./entity/game.players.entity";
import { UserService } from "src/user/user.service";
import { GameRecordDto, GameStatsDto } from "./dto/game.dto";
import { games } from "./entity/game.entity";
import { format } from "date-fns";
import { GameUserRole } from "./enum/game.enum";

@Injectable()
export class GamePlayerService {
  constructor(
    @InjectRepository(games)
    private gameRepository: Repository<games>,
    @InjectRepository(gamePlayers)
    private gamePlayerRepository: Repository<gamePlayers>,
    private userServie: UserService,
  ) {}

  async findGamesByUserId(_userId: number): Promise<gamePlayers[]> {
    try {
      const gamePlayer = await this.gamePlayerRepository.find({
        where: { userId: _userId },
      });
      return gamePlayer;
    } catch (error) {
      throw new HttpException(
        "게임 플레이어 조회에 실패하였습니다.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Record
  async getGamePlayerRecord(
    _nickname: string,
  ): Promise<GameRecordDto[] | HttpException> {
    try {
      const gamePlayer = await this.userServie.findUserByNickname(_nickname);
      const gamePlayerInfo = await this.gamePlayerRepository.find({
        where: { userId: gamePlayer.id },
      });

      const totalUserStatsInfo = [];

      for (let i = 0; i < gamePlayerInfo.length; i++) {
        
        const gameInfo = await this.gameRepository.findOne({
          where: { id: gamePlayerInfo[i].gameId },
        });

        const gamePlayerRecord: GameRecordDto = {
          nickname: gamePlayer.nickname,
          gameUserRole: gamePlayerInfo[i].gameUserRole,
          gameType: gameInfo.gameType,
          gameMode: gameInfo.gameMode,
          gameUserLastdate: gameInfo.endedAt
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

  //Status
  async getGamePlayerStats(
    _nickname: string,
  ): Promise<GameStatsDto | HttpException> {
    try {
      //User DB 들고오기
      const gamePlayer = await this.userServie.findUserByNickname(_nickname);

      //GamePlayer DB 전부 다 들고오기
      const gamePlayerInfo = await this.gamePlayerRepository.find({
        where: { userId: gamePlayer.id },
      });

      const totalGameInfo = [];

      for (let i = 0; i < gamePlayerInfo.length; i++) {
        const gameInfo = await this.gameRepository.findOne({
          where: { id: gamePlayerInfo[i].gameId },
        });
        totalGameInfo.push(gameInfo);
      }

      const gamePlayerRecord: GameStatsDto = {
        nickname: _nickname,
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
              (gamePlayerInfo) =>
                gamePlayerInfo.gameUserRole === GameUserRole.WINNER,
            )
            .map((gamePlayerInfo) => gamePlayerInfo.score)
            .reduce((a, b) => a + b, 0) /
          gamePlayerInfo.filter(
            (gamePlayerInfo) =>
              gamePlayerInfo.gameUserRole === GameUserRole.WINNER,
          ).length,
        //winStreaks는 gamePlayerInfo에서 최근 게임을 기준으로 연속적으로 승리한 게임의 개수를 구한다.
        //예를들어 최근부터, win, win, win, lose, win 이라면 winStreaks는 3이 된다.
        winStreaks: gamePlayerInfo
          .filter(
            (gamePlayerInfo) =>
              gamePlayerInfo.gameUserRole === GameUserRole.WINNER,
          )
          .reverse()
          .findIndex(
            (gamePlayerInfo) =>
              gamePlayerInfo.gameUserRole === GameUserRole.LOSER,
          ),
        //averageSpeed는 gameInfo.averageSpeed 모두 더한 후 gameInfo의 개수로 나눈다.
        averageSpeed:
          totalGameInfo
            .map((gameInfo) => gameInfo.averageSpeed)
            .reduce((a, b) => a + b, 0) / totalGameInfo.length,
        //fatestGame은 gameInfo.averageSpeed을 기준으로 오름차순 정렬하여 가장 첫번째 값을 가져온다.
        fatestGame: totalGameInfo.sort(
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
