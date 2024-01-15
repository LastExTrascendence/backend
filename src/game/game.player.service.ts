import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GamePlayer } from "./entity/game.player.entity";
import { UserService } from "src/user/user.service";
import { gameRecordDto } from "./dto/game.dto";
import { Game } from "./entity/game.entity";
import { format } from "date-fns";
import { GameUserRole } from "./enum/game.enum";

@Injectable()
export class GamePlayerService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    private userServie: UserService,
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

  async getGamePlayerRecord(
    _nickname: string,
  ): Promise<gameRecordDto | HttpException> {
    try {
      const gamePlayer = await this.userServie.findUserByNickname(_nickname);

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

      const gamePlayerRecord: gameRecordDto = {
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
                gamePlayerInfo.game_user_role === GameUserRole.WINNER,
            )
            .map((gamePlayerInfo) => gamePlayerInfo.score)
            .reduce((a, b) => a + b, 0) /
          gamePlayerInfo.filter(
            (gamePlayerInfo) =>
              gamePlayerInfo.game_user_role === GameUserRole.WINNER,
          ).length,
        //winStreaks는 gamePlayerInfo에서 최근 게임을 기준으로 연속적으로 승리한 게임의 개수를 구한다.
        //예를들어 최근부터, win, win, win, lose, win 이라면 winStreaks는 3이 된다.
        winStreaks: gamePlayerInfo
          .filter(
            (gamePlayerInfo) =>
              gamePlayerInfo.game_user_role === GameUserRole.WINNER,
          )
          .reverse()
          .findIndex(
            (gamePlayerInfo) =>
              gamePlayerInfo.game_user_role === GameUserRole.LOSER,
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
