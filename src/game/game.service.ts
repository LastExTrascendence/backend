import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import {
  GameChannelPolicy,
  GameMode,
  GameType,
  GameStatus,
  GameResult,
} from "./enum/game.enum";
import {
  awayInfoDto,
  gameChannelListDto,
  gameDictionaryDto,
  gameInfoDto,
  gameUserVerifyDto,
  homeInfoDto,
} from "./dto/game.dto";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { gameConnectedClients } from "./game.gateway";
import { Game } from "./entity/game.entity";
import { GamePlayerService } from "./game.player.service";
import { Server } from "socket.io";
import { gameDictionary } from "./game.gateway";
import { GameChannelService } from "./game.channel.service";
import { GamePlayer } from "./entity/game.player.entity";
import { IsDate } from "class-validator";
import { RedisService } from "src/commons/redis-client.service";

@Injectable()
export class GameService {
  //awayInfo.y: number,
  //width: number,
  //height: number,
  //ballSize: number,
  //paddleHeight: number,
  //paddleWidth: number,
  //numberOfBounces: number,
  //numberOfRounds: number,
  //homeScore: number,
  //awayScore: number,
  //socket: Socket,
  private logger = new Logger(GameService.name);
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<Game>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @Inject(forwardRef(() => GamePlayerService))
    private gamePlayerService: GamePlayerService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private redisService: RedisService,
    @Inject(forwardRef(() => GameChannelService))
    private gameChannelService: GameChannelService,
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
          game_type: game.game_type,
          game_mode: game.game_mode,
          game_status: GameStatus.INGAME,
          minimum_speed: null,
          average_speed: null,
          maximum_speed: null,
          number_of_rounds: null,
          number_of_bounces: null,
          play_time: null,
          created_at: new Date(),
          ended_at: null,
        };
        await this.gameRepository.save(gameInfo);
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async saveStat(
    channelId: number,
    numberOfRounds: number,
    numberOfBounces: number,
    playTime: string,
  ) {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          channel_id: channelId,
          ended_at: IsNull(),
        },
      });
      if (game) {
        this.gameRepository.update(
          {
            channel_id: channelId,
            ended_at: IsNull(),
          },
          {
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

  async isGameDone(channelId: number): Promise<boolean> {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          channel_id: channelId,
          ended_at: IsNull(),
        },
      });
      if (game) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async dropOutGame(channelId: number) {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          channel_id: channelId,
          game_status: GameStatus.INGAME,
          ended_at: IsNull(),
        },
      });
      if (!game) return;
      else if (game.game_type !== GameType.SINGLE) {
        this.gameRepository.update(
          {
            channel_id: channelId,
            ended_at: IsNull(),
          },
          {
            game_status: GameStatus.DONE,
            ended_at: new Date(),
          },
        );
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async loopPosition(
    gameInfo: gameInfoDto,
    channelId: number,
    server: Server,
    intervalId: NodeJS.Timeout,
  ): Promise<gameInfoDto | void> {
    try {
      this.logger.debug(`loopPosition`);

      //  minimumSpeed: number,
      //averageSpeed: number,
      //maximumSpeed: number,

      // Add event listeners for paddle movement

      //socket.socketsJoin(data.gameId.toString());

      const calculatedCoordinates = await this.calculateCoordinates(
        channelId,
        gameInfo.ballX,
        gameInfo.ballY,
        gameInfo.ballDx,
        gameInfo.ballDy,
        gameInfo.awayInfo,
        gameInfo.homeInfo,
        gameInfo.width,
        gameInfo.height,
        gameInfo.ballSize,
        gameInfo.paddleHeight,
        gameInfo.paddleWidth,
        gameInfo.numberOfBounces,
        gameInfo.numberOfRounds,
        server,
        intervalId,
      );

      gameInfo.ballX = calculatedCoordinates.ball.x;
      gameInfo.ballY = calculatedCoordinates.ball.y;
      gameInfo.ballDx = calculatedCoordinates.ball.dx;
      gameInfo.ballDy = calculatedCoordinates.ball.dy;
      gameInfo.homeInfo.y = calculatedCoordinates.homePaddle.y;
      gameInfo.homeInfo.dy = calculatedCoordinates.homePaddle.dy;
      gameInfo.homeInfo.score = calculatedCoordinates.homeScore;
      gameInfo.awayInfo.y = calculatedCoordinates.awayPaddle.y;
      gameInfo.awayInfo.dy = calculatedCoordinates.awayPaddle.dy;
      gameInfo.awayInfo.score = calculatedCoordinates.awayScore;
      gameInfo.numberOfBounces = calculatedCoordinates.numberOfBounces;
      gameInfo.numberOfRounds = calculatedCoordinates.numberOfRounds;

      //server.to(gameId.toString()).emit("gameInfo", gameInfo);

      gameInfo.cnt++;
      return gameInfo;
      //return {
      //ball: calculatedCoordinates.ball,
      //awayPaddle: calculatedCoordinates.awayPaddle,
      //homePaddle: calculatedCoordinates.homePaddle,
      //numberOfBounces: calculatedCoordinates.numberOfBounces,
      //numberOfRounds: calculatedCoordinates.numberOfRounds,
      //homeScore: calculatedCoordinates.homeScore,
      //awayScore: calculatedCoordinates.awayScore,
      //}
    } catch (error) {
      console.error(error);
    }
  }

  async calculateCoordinates(
    channelId: number,
    ballX: number,
    ballY: number,
    ballDx: number,
    ballDy: number,
    awayInfo: awayInfoDto,
    homeInfo: homeInfoDto,
    width: number,
    height: number,
    ballSize: number,
    paddleHeight: number,
    paddleWidth: number,
    numberOfBounces: number,
    numberOfRounds: number,
    server: Server,
    intervalId: NodeJS.Timeout,
  ): Promise<{
    ball: { x: number; y: number; dx: number; dy: number };
    homePaddle: { x: number; y: number; dy: number };
    awayPaddle: { x: number; y: number; dy: number };
    numberOfBounces: number;
    numberOfRounds: number;
    homeScore: number;
    awayScore: number;
  }> {
    if (homeInfo.y < 0) {
      homeInfo.y = 0;
    }
    if (homeInfo.y + paddleHeight > height) {
      homeInfo.y = height - paddleHeight;
    }
    if (awayInfo.y < 0) {
      awayInfo.y = 0;
    }
    if (awayInfo.y + paddleHeight > height) {
      awayInfo.y = height - paddleHeight;
    }
    // Update ball position based on current direction
    ballX += ballDx;
    ballY += ballDy;

    // Reflect ball when hitting top or bottom
    if (ballY - ballSize / 2 < 0 || ballY + ballSize / 2 > height) {
      numberOfBounces++;
      ballDy = -ballDy;
    }

    // Reflect the ball when hitting the paddles
    if (
      (ballX - ballSize / 2 < paddleWidth + 5 && // hitting left paddle
        ballY + ballSize / 2 >= homeInfo.y &&
        ballY - ballSize / 2 <= homeInfo.y + paddleHeight) ||
      (ballX + ballSize / 2 > width - paddleWidth - 5 && // hitting right paddle
        ballY + ballSize / 2 >= awayInfo.y &&
        ballY - ballSize / 2 <= awayInfo.y + paddleHeight)
    ) {
      numberOfBounces++;
      ballDx = -ballDx;
    }
    homeInfo.y += homeInfo.dy;
    awayInfo.y += awayInfo.dy;
    // Update paddle positions based on current direction
    //homeInfo.y += GameComponent.paddleSpeed; // Assuming you have a variable for the paddle speed
    //awayInfo.y += GameComponent.paddleSpeed; // Assuming you have a variable for the paddle speed

    // Ensure the paddles stay within the vertical bounds

    // Check if the ball passes the paddles (you may need to adjust this logic)
    if (ballX < paddleWidth + 5) {
      //const timeOut = setTimeout(async () => {
      ballX = width / 2;
      ballY = height / 2;
      ballDy = -ballDy;
      numberOfRounds++;
      awayInfo.score++;
      if (awayInfo.score <= 5) {
        server
          .to(channelId.toString())
          .emit("score", [homeInfo.score, awayInfo.score]);
      } else awayInfo.score = 5;
      if (awayInfo.score === 5) {
        clearInterval(intervalId);
        // 홈팀 승자로 넣기
        (await this.gamePlayerService.saveGamePlayer(
          channelId,
          homeInfo.score,
          awayInfo.score,
        ), { once: true });
      }
    } else if (ballX > width - paddleWidth - 5) {
      ballX = width / 2;
      ballY = height / 2;
      ballDy = -ballDy;
      numberOfRounds++;
      homeInfo.score++;
      if (homeInfo.score <= 5) {
        server
          .to(channelId.toString())
          .emit("score", [homeInfo.score, awayInfo.score]);
      } else homeInfo.score = 5;
      if (homeInfo.score === 5) {
        clearInterval(intervalId);
        //away팀 승자로 넣기
        (await this.gamePlayerService.saveGamePlayer(
          channelId,
          homeInfo.score,
          awayInfo.score,
        ), { once: true });
      }
    }

    return {
      ball: { x: ballX, y: ballY, dx: ballDx, dy: ballDy },
      homePaddle: { x: 5, y: homeInfo.y, dy: homeInfo.dy },
      awayPaddle: {
        x: width - paddleWidth - 5,
        y: awayInfo.y,
        dy: awayInfo.dy,
      },
      numberOfBounces: numberOfBounces,
      numberOfRounds: numberOfRounds,
      homeScore: homeInfo.score,
      awayScore: awayInfo.score,
    };
  }

  async transferData(
    returnData: any,
    cnt: number,
    currentCnt: number,
    creatorSocketId: string,
    server: Server,
  ) {
    if (cnt <= currentCnt) return;
    currentCnt = cnt;
    server.to(creatorSocketId).emit("loopGameData", returnData);
  }

  async findOneByChannelId(channelId: number): Promise<Game> {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          channel_id: channelId,
          ended_at: IsNull(),
        },
      });
      return game;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async timeOutGame(
    title: string,
    channelId: string,
    startTime: Date,
    server: Server,
  ) {
    try {
      if (
        (
          await this.gameChannelService.findOneGameChannelById(
            parseInt(channelId),
          )
        ).game_type === GameType.SINGLE
      ) {
        const redisInfo = await this.redisService.hgetall(`GM|${title}`);
        const result = {
          winUserNick: "",
          loseUserNick: "",
          playTime: this.showPlayTime(startTime),
          homeScore: gameDictionary.get(parseInt(channelId)).gameInfo.homeInfo
            .score,
          awayScore: gameDictionary.get(parseInt(channelId)).gameInfo.awayInfo
            .score,
        };
        if (
          gameDictionary.get(parseInt(channelId)).gameInfo.homeInfo.score >=
          gameDictionary.get(parseInt(channelId)).gameInfo.awayInfo.score
        ) {
          result.winUserNick = "HOME";
          result.loseUserNick = "AWAY";
        } else {
          result.winUserNick = "HOME";
          result.loseUserNick = "AWAY";
        }
        server.to(channelId.toString()).emit("gameEnd", result);
      } else {
        const gameInfo = await this.gameRepository.findOne({
          where: { channel_id: parseInt(channelId), ended_at: IsNull() },
        });
        await this.saveStat(
          gameInfo.id,
          gameDictionary.get(parseInt(channelId)).gameInfo.numberOfRounds,
          gameDictionary.get(parseInt(channelId)).gameInfo.numberOfBounces,
          this.showPlayTime(startTime),
        );
        const redisInfo = await this.redisService.hgetall(`GM|${title}`);
        const result = {
          winUserNick: "",
          loseUserNick: "",
          playTime: this.showPlayTime(startTime),
          homeScore: gameDictionary.get(parseInt(channelId)).gameInfo.homeInfo
            .score,
          awayScore: gameDictionary.get(parseInt(channelId)).gameInfo.awayInfo
            .score,
        };

        const creatorInfo = await this.userService.findUserById(
          parseInt(redisInfo.creator),
        );
        const userInfo = await this.userService.findUserById(
          parseInt(redisInfo.user),
        );
        if (
          gameDictionary.get(parseInt(channelId)).gameInfo.homeInfo.score >=
          gameDictionary.get(parseInt(channelId)).gameInfo.awayInfo.score
        ) {
          result.winUserNick = creatorInfo.nickname;
          result.loseUserNick = userInfo.nickname;
        } else {
          result.winUserNick = userInfo.nickname;
          result.loseUserNick = creatorInfo.nickname;
        }

        if (redisInfo.creatorOnline === "false") {
          result.homeScore = 0;
          result.awayScore = 5;
        }

        server.to(channelId.toString()).emit("gameEnd", result);
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async disconnectGame(
    title: string,
    channelId: number,
    startTime: Date,
    server: Server,
  ) {
    try {

      if (!gameDictionary.get(channelId)) {
        return;
      }
      const gameInfo = gameDictionary.get(channelId).gameInfo;


      await this.saveStat(
        channelId,
        gameInfo.numberOfRounds,
        gameInfo.numberOfBounces,
        this.showPlayTime(startTime),
      );
      const redisInfo = await this.redisService.hgetall(`GM|${title}`);

      if (!redisInfo) return;

      const result = {
        winUserNick: "",
        loseUserNick: "",
        playTime: this.showPlayTime(startTime),
        homeScore: 5,
        awayScore: 0,
      };

      const creatorInfo = await this.userService.findUserById(
        parseInt(redisInfo.creator),
      );
      const userInfo = await this.userService.findUserById(
        parseInt(redisInfo.user),
      );

      if (!creatorInfo || !userInfo) {
        return;
      }

      if (redisInfo.creatorOnline === "false") {
        result.homeScore = 0;
        result.awayScore = 5;
      }

      if (result.homeScore >= result.awayScore) {
        result.winUserNick = creatorInfo.nickname;
        result.loseUserNick = userInfo.nickname;
      } else {
        result.winUserNick = userInfo.nickname;
        result.loseUserNick = creatorInfo.nickname;
      }

      server.to(channelId.toString()).emit("gameEnd", result);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async finishGame(
    title: string,
    channelId: string,
    startTime: Date,
    server: Server,
  ) {
    try {
      if (!gameDictionary.get(parseInt(channelId)))
        return;
      const gameInfo = gameDictionary.get(parseInt(channelId)).gameInfo;
      if (
        (
          await this.gameChannelService.findOneGameChannelById(
            parseInt(channelId),
          )
        ).game_type === GameType.SINGLE
      ) {
        const redisInfo = await this.redisService.hgetall(`GM|${title}`);
        const result = {
          winUserNick: "",
          loseUserNick: "",
          playTime: this.showPlayTime(startTime),
          homeScore: gameInfo.homeInfo
            .score,
          awayScore: gameInfo.awayInfo
            .score,
        };

        if (
          gameInfo.homeInfo.score === 5
        ) {
          result.winUserNick = "HOME";
          result.loseUserNick = "AWAY";
        } else {
          result.winUserNick = "AWAY";
          result.loseUserNick = "HOME";
        }
        server.to(channelId.toString()).emit("gameEnd", result);
      } else {
        await this.saveStat(
          parseInt(channelId),
          gameInfo.numberOfRounds,
          gameInfo.numberOfBounces,
          this.showPlayTime(startTime),
        );
        const redisInfo = await this.redisService.hgetall(`GM|${title}`);
        const result = {
          winUserNick: "",
          loseUserNick: "",
          playTime: this.showPlayTime(startTime),
          homeScore: gameInfo.homeInfo
            .score,
          awayScore: gameInfo.awayInfo
            .score,
        };
        const creatorInfo = await this.userService.findUserById(
          parseInt(redisInfo.creator),
        );
        const userInfo = await this.userService.findUserById(
          parseInt(redisInfo.user),
        );

        if (
          gameInfo.homeInfo.score === 5
        ) {
          result.winUserNick = creatorInfo.nickname;
          result.loseUserNick = userInfo.nickname;
        } else {
          result.winUserNick = userInfo.nickname;
          result.loseUserNick = creatorInfo.nickname;
        }
        server.to(channelId.toString()).emit("gameEnd", result);
      }
      await this.gameRepository.update(
        {
          channel_id: parseInt(channelId),
        },
        {
          game_status: GameStatus.DONE,
          ended_at: new Date(),
        },
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getStartTime(gameId: number) {
    const gameInfo = await this.gameRepository.findOne({
      where: { channel_id: gameId, ended_at: IsNull() },
    });

    if (gameInfo) return gameInfo.created_at;
    else return new Date();
  }

  async deleteAllGame() {
    try {
      await this.gameRepository.update(
        { ended_at: IsNull() },
        {
          ended_at: new Date(),
        },
      );
      await this.gameRepository.update(
        {
          game_status: GameStatus.INGAME,
        },
        {
          ended_at: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  showPlayTime(startTime: Date) {
    const afterTime = new Date();

    const cal = (afterTime.getTime() - startTime.getTime()) / 1000;

    const minute = cal / 60;
    const second = cal % 60;

    let formattedDate = null;

    if (second < 10) formattedDate = minute.toFixed() + ":0" + second.toFixed();
    else formattedDate = minute.toFixed() + ":" + second.toFixed();

    return formattedDate;
  }

  async doneGame(channelId: number) {
    try {
      await this.gameRepository.update(
        { channel_id: channelId, ended_at: IsNull() },
        {
          ended_at: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  calculateAverageTimes(totalGameInfo: Game[]) {
    let TotalTime = 0;
    for (let i = 0; i < totalGameInfo.length; i++) {
      const playTime = totalGameInfo[i].play_time.split(":");
      const minute = parseInt(playTime[0]);
      const second = parseInt(playTime[1]);
      const totalSecond = minute * 60 + second;
      TotalTime += totalSecond;
    }

    let averageTime = TotalTime / totalGameInfo.length;
    let averageMinute = Math.floor(averageTime / 60).toFixed(0);
    let averageSecond = Math.floor(averageTime % 60).toFixed(0);
    if (averageSecond.length === 1) averageSecond = "0" + averageSecond;
    let averageTimeFormat =
      "0" + averageMinute.toString() + ":" + averageSecond.toString();
    return averageTimeFormat;
  }

  calculateLongestGame(totalGameInfo: Game[]) {
    let longestGame = 0;
    for (let i = 0; i < totalGameInfo.length; i++) {
      const playTime = totalGameInfo[i].play_time.split(":");
      const minute = parseInt(playTime[0]);
      const second = parseInt(playTime[1]);
      const time = minute * 60 + second;
      if (time > longestGame) {
        longestGame = time;
      }
    }
    let longestMinute = Math.floor(longestGame / 60).toFixed(0);
    let longestSecond = Math.floor(longestGame % 60).toFixed(0);
    if (longestSecond.length === 1) longestSecond = "0" + longestSecond;
    let longestTimeFormat =
      "0" + longestMinute.toString() + ":" + longestSecond.toString();
    return longestTimeFormat;
  }

  calculateShortestGame(totalGameInfo: Game[]) {
    let shortestGame = 400;
    for (let i = 0; i < totalGameInfo.length; i++) {
      const playTime = totalGameInfo[i].play_time.split(":");
      const minute = parseInt(playTime[0]);
      const second = parseInt(playTime[1]);
      const time = minute * 60 + second;
      if (time < shortestGame) {
        shortestGame = time;
      }
    }
    let shortestMinute = Math.floor(shortestGame / 60).toFixed(0);
    let shortestSecond = Math.floor(shortestGame % 60).toFixed(0);
    if (shortestSecond.length === 1) shortestSecond = "0" + shortestSecond;
    let shortestTimeFormat =
      "0" + shortestMinute.toString() + ":" + shortestSecond.toString();
    return shortestTimeFormat;
  }

  calculateTotalPointScored(gamePlayerInfo: GamePlayer[]) {
    let totalPointScored = 0;
    for (let i = 0; i < gamePlayerInfo.length; i++) {
      totalPointScored += gamePlayerInfo[i].score;
    }
    return totalPointScored.toString();
  }

  calculateAverageScorePerGame(gamePlayerInfo: GamePlayer[]) {
    let averageScorePerGame = 0;
    for (let i = 0; i < gamePlayerInfo.length; i++) {
      averageScorePerGame += gamePlayerInfo[i].score;
    }
    averageScorePerGame /= gamePlayerInfo.length;
    return averageScorePerGame.toFixed(1);
  }

  calculateAverageScorePerWin(gamePlayerInfo: GamePlayer[]) {
    let averageScorePerWin = 0;
    let totalWin = 0;
    for (let i = 0; i < gamePlayerInfo.length; i++) {
      if (gamePlayerInfo[i].role === GameResult.WINNER) {
        totalWin++;
      }
    }
    for (let i = 0; i < gamePlayerInfo.length; i++) {
      averageScorePerWin += gamePlayerInfo[i].score;
    }
    averageScorePerWin /= totalWin;
    return averageScorePerWin.toFixed(1);
  }
}

// title
// password
// creator
// user
