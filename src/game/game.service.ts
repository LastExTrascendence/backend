import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  GameChannelPolicy,
  GameMode,
  GameType,
  GameStatus,
} from "./enum/game.enum";
import {
  awayInfoDto,
  gameChannelListDto,
  gameDictionaryDto,
  gameInfoDto,
  gameUserVerifyDto,
  homeInfoDto,
} from "./dto/game.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { gameConnectedClients } from "./game.gateway";
import { Game } from "./entity/game.entity";
import { GamePlayerService } from "./game.player.service";
import { Server } from "socket.io";

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
  ) {}

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

  async saveTest(
    gameId: number,
    numberOfRounds: number,
    numberOfBounces: number,
    playTime: string,
  ) {
    try {
      const game = await this.gameRepository.findOne({
        where: {
          id: gameId,
        },
      });
      if (game) {
        this.gameRepository.update(
          {
            id: gameId,
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

  async loopPosition(
    gameInfo: gameInfoDto,
    gameId: number,
    server: Server,
  ): Promise<gameInfoDto> {
    try {
      this.logger.debug(`loopPosition`);

      //  minimumSpeed: number,
      //averageSpeed: number,
      //maximumSpeed: number,

      // Add event listeners for paddle movement

      //socket.socketsJoin(data.gameId.toString());

      const calculatedCoordinates = await this.calculateCoordinates(
        gameId,
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
    gameId: number,
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

    //data: any,
    //ballState: { x: number; y: number; dx: number; dy: number },
    //homeInfo: { y: number; dy: number },
    //awayInfo: { y: number; dy: number },
    //homeInfo.y: number,
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
      (ballX - ballSize / 2 < paddleWidth && // hitting left paddle
        ballY + ballSize / 2 >= homeInfo.y &&
        ballY - ballSize / 2 <= homeInfo.y + paddleHeight) ||
      (ballX + ballSize / 2 > width - paddleWidth && // hitting right paddle
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
    if (ballX - ballSize / 2 < paddleWidth / 2) {
      //const timeOut = setTimeout(async () => {
      ballX = width / 2;
      ballY = height / 2;
      ballDy = -ballDy;

      numberOfRounds++;
      awayInfo.score++;
      server
        .to(gameId.toString())
        .emit("score", [homeInfo.score, awayInfo.score]);
      if (awayInfo.score === 5) {
        // 홈팀 승자로 넣기
        await this.gamePlayerService.saveGamePlayer(
          gameId,
          homeInfo.score,
          awayInfo.score,
        );
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
    } else if (ballX + ballSize / 2 > width - paddleWidth / 2) {
      ballX = width / 2;
      homeInfo.score++;
      ballY = height / 2;
      ballDy = -ballDy;
      numberOfRounds++;
      server
        .to(gameId.toString())
        .emit("score", [homeInfo.score, awayInfo.score]);
      if (homeInfo.score === 5) {
        //away팀 승자로 넣기
        await this.gamePlayerService.saveGamePlayer(
          gameId,
          homeInfo.score,
          awayInfo.score,
        );
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

  //async saveRecord(
  //  gameId: number,
  //  minimumSpeed: number,
  //  averageSpeed: number,
  //  maximumSpeed: number,
  //  numberOfRounds: number,
  //  numberOfBounces: number,
  //  playTime: number,
  //) {
  //  try {
  //    const game = await this.gameRepository.findOne({
  //      where: {
  //        id: gameId,
  //      },
  //    });
  //    if (game) {
  //      this.gameRepository.update(
  //        {
  //          id: gameId,
  //        },
  //        {
  //          minimum_speed: minimumSpeed,
  //          average_speed: averageSpeed,
  //          maximum_speed: maximumSpeed,
  //          number_of_rounds: numberOfRounds,
  //          number_of_bounces: numberOfBounces,
  //          play_time: playTime,
  //          ended_at: new Date(),
  //        },
  //      );
  //    }
  //  } catch (error) {
  //    this.logger.error(error);
  //    throw error;
  //  }
  //}

  async deleteAllGame() {
    try {
      await this.gameRepository.update(
        { ended_at: IsNull() },
        {
          ended_at: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}

// title
// password
// creator
// user
