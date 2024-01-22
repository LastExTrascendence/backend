import {
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
  UseGuards,
} from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SaveOptions, RemoveOptions, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Game } from "./entity/game.entity";
import { Redis } from "ioredis";
import {
  GameUserRole,
  GameStatus,
  GameChannelPolicy,
  GameTeam,
  GameComponent,
} from "./enum/game.enum";
import { GamePlayer } from "./entity/game.player.entity";
import { format } from "date-fns";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { GamePlayerService } from "./game.player.service";
import { GameService } from "./game.service";
import { Mutex } from "async-mutex";

export const gameConnectedClients: Map<number, Socket> = new Map();

@WebSocketGateway(85, {
  namespace: "game",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class GameGateWay {
  private logger = new Logger("GameGateWay");
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    private redisClient: Redis,
    private userService: UserService,
    private gamePlayerService: GamePlayerService,
    private gameService: GameService,
  ) {}

  @WebSocketServer()
  server: Server;

  private disconnectTimeouts = new Map<number, NodeJS.Timeout>();

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }
  handleConnection(socket: Socket) {
    this.logger.debug(`Socket Connected`);
  }

  //title :string
  //userId : number

  //minimum_speed: number;
  //average_speed: number;
  //maximum_speed: number;
  //number_of_rounds: number;
  //number_of_bounces: number;
  async handleDisconnect(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.debug(`Socket Disconnected`);
  }

  //입장 불가 조건
  //방의 인원이 2명을 초과한 경우
  //비밀번호가 틀린 경우
  //유저 먼저 들어온 경우

  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.verbose(`Game enter ${data.userId}, ${data.title}`);
      const { userId, title } = data;

      const gameChannelInfo = await this.gameChannelRepository.findOne({
        where: {
          title: title,
          deleted_at: null,
          game_status: GameStatus.READY,
        },
      });

      if (!userId || !title) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "입력값이 없습니다",
          },
          HttpStatus.NOT_FOUND,
        );
      } else if (!gameChannelInfo) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "존재하지 않는 방입니다.",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.debug(`Socket enter Connected ${data.userId}, ${data.title}`);

      const redisInfo = await this.redisClient.hgetall(`GM|${title}`);

      //해당 유저가 다른 채널에 있다면 다른 채널의 소켓 통신을 끊어버림

      if (gameConnectedClients.has(userId)) {
        const targetClient = gameConnectedClients.get(userId);
        targetClient.disconnect(true);
        gameConnectedClients.delete(data.userId);
      }

      await socket.join(gameChannelInfo.id.toString());
      gameConnectedClients.set(userId, socket);
      //입장불가
      //1. 방이 존재하지 않을 경우
      //2. 비밀번호 입력자가 아닌 경우
      //3. 방의 인원이 2명을 초과한 경우

      const banUserList = redisInfo[`ban|${userId}`];

      if (gameChannelInfo.game_channel_policy === GameChannelPolicy.PRIVATE) {
        const isPasswordCorrect = await this.redisClient.hgetall(
          `GM|${gameChannelInfo.title}`,
        );

        const accessUser = "ACCESS" + userId;

        //isPasswordCorrect 중에 ACCESS로 시작하는 value값만 가져온다.
        const passwordValidate = isPasswordCorrect[accessUser];

        //ACCESS 대상이 아닌경우
        if (!passwordValidate) {
          const targetClient = gameConnectedClients.get(userId);
          targetClient.disconnect(true);
          socket.leave(gameChannelInfo.id.toString());
          gameConnectedClients.delete(data.userId);
          return;
        }
      } else if (gameChannelInfo.cur_user === gameChannelInfo.max_user) {
        const targetClient = gameConnectedClients.get(userId);
        targetClient.disconnect(true);
        socket.leave(gameChannelInfo.id.toString());
        gameConnectedClients.delete(data.userId);
        return;
      } else if (banUserList) {
        const targetClient = gameConnectedClients.get(userId);
        targetClient.disconnect(true);
        socket.leave(gameChannelInfo.id.toString());
        gameConnectedClients.delete(data.userId);
        return;
      }

      //방에 들어와 있는 인원에 대한 정보를 저장한다
      const creatorId = await this.gameChannelRepository.findOne({
        where: { title: title },
      });

      if (creatorId.creator_id === userId) {
        await this.redisClient.hset(`GM|${title}`, "creatorOnline", "true");
      } else {
        await this.redisClient.hset(`GM|${title}`, "user", userId);
        await this.redisClient.hset(`GM|${title}`, "userOnline", "true");
      }

      //3. 방장이 없는데, 유저가 들어온 경우

      //if (
      //  redisInfo.creatorOnline === "false" &&
      //  redisInfo.userOnline === "true"
      //) {
      //  const targetClient = gameConnectedClients.get(userId);
      //  targetClient.disconnect(true);
      //  socket.leave(gameChannelInfo.id.toString());
      //  gameConnectedClients.delete(data.userId);
      //  await this.redisClient.hset(`GM|${title}`, "user", null);
      //  await this.redisClient.hset(`GM|${title}`, "userOnline", "false");
      //  return;
      //}

      await this.sendUserList(title, gameChannelInfo.id, socket);

      //current_user 수 확인
      await this.updateCurUser(title, gameChannelInfo.id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  //  //time : 시간
  //  //title : string 요청
  //  //sender : number
  //  //content : string
  @SubscribeMessage("msgToServer")
  async sendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.verbose(`msgToServer`, data);
      const senderInfo = await this.userService.findUserById(data.sender);

      const gameInfo = await this.gameChannelRepository.findOne({
        where: { title: data.title },
      });

      const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);

      if (redisInfo.mute !== "null" && redisInfo.muteUser === data.sender) {
        if (isMoreThan30SecondsAgo(redisInfo.mute)) {
          await this.redisClient.hset(`GM|${data.title}`, "mute", "null");
          this.server.to(gameInfo.id.toString()).emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: data.content,
          });
        } else {
          this.server.to(gameInfo.id.toString()).emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: "뮤트 상태입니다.",
          });
        }
      } else {
        this.server.to(gameInfo.id.toString()).emit("msgToClient", {
          time: showTime(data.time),
          sender: senderInfo.nickname,
          content: data.content,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  //userId : number
  //   //gameId : number
  //title : string
  @SubscribeMessage("pressStart")
  async StartGame(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`pressStart`);
    const startInfo = await this.redisClient.hgetall(`GM|${data.title}`);

    if (
      data.myId === parseInt(startInfo.creator) &&
      //startInfo.userReady === "true" &&
      startInfo.creatorOnline === "true"
    ) {
      await this.gameChannelRepository.update(
        { title: data.title },
        { game_status: GameStatus.INGAME },
      );
      await this.gameService.saveGame(data.gameId);
      this.logger.debug(`gameStart`);
      this.server.to(data.gameId.toString()).emit("gameStart");
    }
  }

  //  //userId : number
  //  //gameId : number
  //  //title : string
  @SubscribeMessage("pressReady")
  async ReadyGame(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`ReadyGame`);
    const readyInfo = await this.redisClient.hgetall(`GM|${data.title}`);

    if (
      data.myId === parseInt(readyInfo.user) &&
      readyInfo.userReady == "true"
    ) {
      await this.redisClient.hset(`GM|${data.title}`, "userReady", "false");
      console.log("readyOff");
      this.server.to(socket.id).emit("readyOff");
    } else if (
      data.myId === parseInt(readyInfo.user) &&
      readyInfo.userReady == "false"
    ) {
      await this.redisClient.hset(`GM|${data.title}`, "userReady", "true");
      console.log("readyOn");
      this.server.to(socket.id).emit("readyOn");
    }
  }

  @SubscribeMessage("muteUser")
  async muteSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.debug(
        `muteUser`,
        `${data.title}, ${data.userId}, ${data.muteNick}`,
      );
      const { userId, title, muteNick } = data;

      const channelInfo = await this.gameChannelRepository.findOne({
        where: { title: title },
      });

      const muteUser = await this.userService.findUserByNickname(muteNick);

      const redisInfo = await this.redisClient.hgetall(`GM|${title}`);

      if (
        redisInfo.creatorOnline === "false" ||
        redisInfo.userOnline === "false"
      ) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (userId != channelInfo.creator_id) {
        throw new Error("방장이 아닙니다.");
      }

      await this.redisClient.hset(
        `GM|${title}`,
        "mute",
        new Date().toISOString(),
      );

      await this.redisClient.hset(
        `GM|${title}`,
        `muteUser`,
        muteUser.id.toString(),
      );

      console.log("redisInfo", await this.redisClient.hgetall(`GM|${title}`));
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("kickUser")
  async kickSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.debug(`kickUser`, data);
      const { userId, title, kickNick } = data;

      const channelInfo = await this.gameChannelRepository.findOne({
        where: { title: title },
      });

      const redisInfo = await this.redisClient.hgetall(`GM|${title}`);

      const kickUser = await this.userService.findUserByNickname(kickNick);

      if (
        redisInfo.creatorOnline === "false" ||
        redisInfo.userOnline === "false"
      ) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (userId != channelInfo.creator_id) {
        throw new Error("방장이 아닙니다.");
      }

      const targetClient = gameConnectedClients.get(kickUser.id);
      targetClient.disconnect(true);
      gameConnectedClients.delete(kickUser.id);
      await this.redisClient.hset(`GM|${title}`, "user", null);
      await this.redisClient.hset(`GM|${title}`, "userOnline", "false");

      console.log("redisInfo", await this.redisClient.hgetall(`GM|${title}`));

      this.updateCurUser(channelInfo.title, channelInfo.id);
      this.sendUserList(title, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  //title :string
  //userId : number
  @SubscribeMessage("leaveGame")
  async leaveGame(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const channelInfo = await this.gameChannelRepository.findOne({
      where: { title: data.title },
    });

    if (channelInfo.game_status === GameStatus.READY) {
      const info = await this.redisClient.hgetall(`GM|${data.title}`);
      //게임 준비 상태에서 연결이 끊긴 경우
      const creatorId = parseInt(info.creator);
      const userId = parseInt(info.user);

      if (creatorId === data.userId) {
        //방장이 나간경우
        if (userId) {
          const targetClient = gameConnectedClients.get(userId);
          targetClient.disconnect(true);
          gameConnectedClients.delete(userId);
        }
        await this.gameChannelRepository.update(
          { title: data.title },
          { deleted_at: new Date() },
        );
        await this.redisClient.del(`GM|${data.title}`);
      } else if (userId === data.userId) {
        //유저가 나간 경우
        await this.redisClient.hset(`GM|${data.title}`, "user", null);
        await this.redisClient.hset(`GM|${data.title}`, "userOnline", "false");
        const targetClient = gameConnectedClients.get(userId);
        targetClient.disconnect(true);
        gameConnectedClients.delete(userId);
        this.updateCurUser(data.title, channelInfo.id);
        this.sendUserList(data.title, channelInfo.id, socket);
      }
    }
    // 게임중에 연결이 끊긴 경우
    //} else if (channelInfo.game_status === GameStatus.INGAME) {
    //  await timeOut(data);
    //} else if (channelInfo.game_status === GameStatus.DONE) {
    //  if (await this.redisClient.keys(`GM|${data.title}`))
    //    await this.redisClient.del(`GM|${data.title}`);
    //}
  }

  @SubscribeMessage("banUser")
  async banSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.debug(`banUser`, data);
      const { userId, title, banNick } = data;

      const channelInfo = await this.gameChannelRepository.findOne({
        where: { title: title },
      });

      const redisInfo = await this.redisClient.hgetall(`GM|${title}`);

      const banUser = await this.userService.findUserByNickname(banNick);

      if (
        redisInfo.creatorOnline === "false" ||
        redisInfo.userOnline === "false"
      ) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (userId != channelInfo.creator_id) {
        throw new Error("방장이 아닙니다.");
      }

      const targetClient = gameConnectedClients.get(banUser.id);
      targetClient.disconnect(true);
      gameConnectedClients.delete(banUser.id);
      await this.redisClient.hset(`GM|${title}`, "user", null);
      await this.redisClient.hset(`GM|${title}`, "userOnline", "false");
      await this.redisClient.hset(
        `GM|${title}`,
        `ban|${banUser.id}`,
        banUser.id,
      );

      console.log("redisInfo", await this.redisClient.hgetall(`GM|${title}`));

      this.updateCurUser(channelInfo.title, channelInfo.id);
      this.sendUserList(title, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  //return
  //width: number;
  //height: number;
  //map: string;
  //paddleWidth: number;
  //paddleHeight: number;
  //ballSize: number;
  @SubscribeMessage("play")
  async gameInfo(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`play`);
    const gameInfo = await this.redisClient.hgetall(`GM|${data.title}`);

    const gameComponentInfo = {
      width: GameComponent.width,
      height: GameComponent.height,
      map: GameComponent.map.normal,
      paddleWidth: GameComponent.paddleWidth,
      paddleHeight: GameComponent.paddleHeight,
      ballSize: GameComponent.ballSize,
    };
    this.server.to(gameInfo.id).emit("play", gameComponentInfo);
  }

  //@SubscribeMessage("keyDown")
  //async keyDown(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
  //  // 전역에서 arrow up 이나 down이 key Down 되었을 때 flag를 세워줘야함

  //  // below loop에서 해당 flag가 켜지면 수행되어야하는 로직
  //  if (data.team === GameTeam.HOME) {
  //    if (data.key === "ArrowUp") {
  //      homePaddleState.dy = -10;
  //    } else if (data.key === "ArrowDown") {
  //      homePaddleState.dy = 10;
  //    }
  //    return {
  //      homePaddle: homePaddleState.dy,
  //      awayPaddle: awayPaddleState.dy,
  //    };
  //    // homePaddleState.y += homePaddleState.dy;
  //  } else if (data.team === GameTeam.AWAY) {
  //    if (data.key === "ArrowUp") {
  //      awayPaddleState.dy = -10;
  //    } else if (data.key === "ArrowDown") {
  //      awayPaddleState.dy = 10;
  //    }
  //    // awayPaddleState.y += awayPaddleState.dy;
  //  }
  //  //this.logger.debug(`KeyDown`);
  //}

  //@SubscribeMessage("keyUp")
  //async keyUp(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
  //  //this.logger.debug(`KeyUp`);
  //  // 전역에서 arrow up 이나 down이 key Up 되었을 때 flag를 세워줘야함(끄거나)
  //  // below loop에서 해당 flag가 켜지면 수행되어야하는 로직
  //  if (data.team === GameTeam.HOME) {
  //    homePaddleState.dy = 0;
  //  } else if (data.team === GameTeam.AWAY) {
  //    awayPaddleState.dy = 0;
  //  }
  //}

  @SubscribeMessage("loopPosition")
  async loopPosition(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.debug(`loopPosition`);
      const ballState = {
        // x: Math.floor(GameComponent.width - GameComponent.ballSize),
        // y: Math.floor(GameComponent.height - GameComponent.ballSize),
        //x: GameComponent.width - GameComponent.ballSize,
        //y: GameComponent.height - GameComponent.ballSize,
        x: GameComponent.width / 2,
        y: GameComponent.height / 2,
        dx: -6, // Initial speed in the x direction
        dy: -6, // Initial speed in the y direction
      };

      const homePaddleState = {
        y: Math.floor(
          GameComponent.height / 2 - GameComponent.paddleHeight / 2,
        ),
        dy: 0, // Initial speed in the y direction
      };
      const awayPaddleState = {
        y: Math.floor(
          GameComponent.height / 2 - GameComponent.paddleHeight / 2,
        ),
        dy: 0, // Initial speed in the y direction
      };

      let currentCnt = 0;
      let numberOfRounds = 0;
      let numberOfBounces = 0;
      let homeScore = 0;
      let awayScore = 0;

      const startTime = new Date();

      //  minimumSpeed: number,
      //averageSpeed: number,
      //maximumSpeed: number,

      // Add event listeners for paddle movement

      //socket.socketsJoin(data.gameId.toString());
      const mutex = new Mutex();
      let cnt = 0;
      const intervalId = setInterval(async () => {
        mutex.acquire();

        const calculatedCoordinates = await this.calculateCoordinates(
          data,
          ballState,
          homePaddleState,
          awayPaddleState,
          homePaddleState.y,
          awayPaddleState.y,
          GameComponent.width,
          GameComponent.height,
          GameComponent.ballSize,
          GameComponent.paddleHeight,
          GameComponent.paddleWidth,
          numberOfBounces,
          numberOfRounds,
          homeScore,
          awayScore,
          socket,
        );

        homePaddleState.y = calculatedCoordinates.homePaddle.y;
        awayPaddleState.y = calculatedCoordinates.awayPaddle.y;
        homePaddleState.dy = calculatedCoordinates.homePaddle.dy;
        awayPaddleState.dy = calculatedCoordinates.awayPaddle.dy;
        numberOfBounces = calculatedCoordinates.numberOfBounces;
        numberOfRounds = calculatedCoordinates.numberOfRounds;
        homeScore = calculatedCoordinates.homeScore;
        awayScore = calculatedCoordinates.awayScore;

        //if (homeScore === 5 || awayScore === 5) {
        //  const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);
        //  const result = {
        //    winUserNick: "",
        //    loseUserNick: "",
        //    playTime: this.checkPlayTIme(startTime),
        //    homeScore: homeScore,
        //    awayScore: awayScore,
        //  };
        //  const creatorInfo = await this.userService.findUserById(
        //    parseInt(redisInfo.creator),
        //  );
        //  const userInfo = await this.userService.findUserById(
        //    parseInt(redisInfo.user),
        //  );
        //  if (homeScore === 5) {
        //    result.winUserNick = creatorInfo.nickname;
        //    result.loseUserNick = userInfo.nickname;
        //  } else {
        //    result.winUserNick = userInfo.nickname;
        //    result.loseUserNick = creatorInfo.nickname;
        //  }
        //  this.server.to(data.gameId.toString()).emit("gameEnd", result);
        //  mutex.release();
        //  clearInterval(intervalId);
        //  return;
        //} else if (timeOut(startTime)) {
        //  const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);
        //  const result = {
        //    winUserNick: "",
        //    loseUserNick: "",
        //    playTime: this.checkPlayTIme(startTime),
        //    homeScore: homeScore,
        //    awayScore: awayScore,
        //  };

        //  const creatorInfo = await this.userService.findUserById(
        //    parseInt(redisInfo.creator),
        //  );
        //  const userInfo = await this.userService.findUserById(
        //    parseInt(redisInfo.user),
        //  );
        //  if (homeScore >= awayScore) {
        //    result.winUserNick = creatorInfo.nickname;
        //    result.loseUserNick = userInfo.nickname;
        //  } else {
        //    result.winUserNick = userInfo.nickname;
        //    result.loseUserNick = creatorInfo.nickname;
        //  }
        //  this.server.to(data.gameId.toString()).emit("gameEnd", result);
        //  mutex.release();
        //  clearInterval(intervalId);
        //  return;
        //}

        const returnData = {
          x: calculatedCoordinates.ball.x,
          y: calculatedCoordinates.ball.y,
          l: calculatedCoordinates.homePaddle.y,
          r: calculatedCoordinates.awayPaddle.y,
        };

        //this.logger.debug(
        //  `loopPosition ${data.gameId}, ${returnData.x}, ${returnData.y}, ${returnData.l}, ${returnData.r}`,
        //);

        ++cnt;
        //console.log(cnt);
        //this.server.to(data.gameId.toString()).emit("loopGameData", returnData);
        this.transferData(returnData, cnt, data, socket, currentCnt);
        mutex.release();
      }, 1000 / 60);

      socket.on("disconnect", () => {
        const playTime = this.checkPlayTIme(startTime);
        clearInterval(intervalId);
      });

      socket.on("keyDown", (data) => {
        if (data.team === GameTeam.HOME)
          homePaddleState.dy = this.keyPress(data, socket);
        else if (data.team === GameTeam.AWAY)
          awayPaddleState.dy = this.keyPress(data, socket);
      });
      socket.on("keyUp", (data) => {
        if (data.team === GameTeam.HOME)
          homePaddleState.dy = this.keyrelease(data, socket);
        else if (data.team === GameTeam.AWAY)
          awayPaddleState.dy = this.keyrelease(data, socket);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async transferData(
    returnData: any,
    cnt: number,
    gameData: any,
    socket: Socket,
    currentCnt: number,
  ) {
    if (cnt <= currentCnt) return;
    currentCnt = cnt;
    this.server.to(gameData.gameId.toString()).emit("loopGameData", returnData);
  }

  async sendUserList(title: string, channelId: number, socket: Socket) {
    this.logger.debug(`sendUserList`);
    const TotalUserInfo = [];
    const redisInfo = await this.redisClient.hgetall(`GM|${title}`);

    if (redisInfo.creatorOnline === "true") {
      const creatorInfo = await this.userService.findUserById(
        parseInt(redisInfo.creator),
      );

      const CreatorInfo = {
        id: creatorInfo.id,
        nickname: creatorInfo.nickname,
        avatar: creatorInfo.avatar,
        role: GameUserRole.CREATOR,
      };
      TotalUserInfo.push(CreatorInfo);
    }

    if (redisInfo.userOnline === "true" && redisInfo.user) {
      {
        const userInfo = await this.userService.findUserById(
          parseInt(redisInfo.user),
        );
        const UserInfo = {
          id: userInfo.id,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          role: GameUserRole.USER,
        };
        TotalUserInfo.push(UserInfo);
      }
    }

    this.server.to(channelId.toString()).emit("userList", TotalUserInfo);
  }

  async updateCurUser(title: string, channelId: number) {
    this.logger.debug(`updateCurUser`);
    const redisInfo = await this.redisClient.hgetall(`GM|${title}`);
    let cur_user = 0;
    if (redisInfo.creatorOnline === "true") {
      cur_user++;
    }
    if (redisInfo.userOnline === "true") {
      cur_user++;
    }
    await this.gameChannelRepository.update(
      { id: channelId },
      { cur_user: cur_user },
    );
  }

  async calculateCoordinates(
    data: any,
    ballState: { x: number; y: number; dx: number; dy: number },
    homePaddleState: { y: number; dy: number },
    awayPaddleState: { y: number; dy: number },
    homePaddlePos: number,
    awayPaddlePos: number,
    width: number,
    height: number,
    ballSize: number,
    paddleHeight: number,
    paddleWidth: number,
    numberOfBounces: number,
    numberOfRounds: number,
    homeScore: number,
    awayScore: number,
    socket: Socket,
  ): Promise<{
    ball: { x: number; y: number };
    homePaddle: { x: number; y: number; dy: number };
    awayPaddle: { x: number; y: number; dy: number };
    numberOfBounces: number;
    numberOfRounds: number;
    homeScore: number;
    awayScore: number;
  }> {
    if (homePaddlePos < 0) {
      homePaddlePos = 0;
    } else if (homePaddlePos + paddleHeight > height) {
      homePaddlePos = height - paddleHeight;
    }

    if (awayPaddlePos < 0) {
      awayPaddlePos = 0;
    } else if (awayPaddlePos + paddleHeight > height) {
      awayPaddlePos = height - paddleHeight;
    }

    homePaddleState.y += homePaddleState.dy;
    awayPaddleState.y += awayPaddleState.dy;
    if (homePaddleState.y < 0) {
      homePaddleState.y = 0;
    }
    if (homePaddleState.y + paddleHeight > height) {
      homePaddleState.y = height - paddleHeight;
    }
    // Update ball position based on current direction
    ballState.x += ballState.dx;
    ballState.y += ballState.dy;

    // Reflect ball when hitting top or bottom
    if (ballState.y - ballSize / 2 < 0 || ballState.y + ballSize / 2 > height) {
      numberOfBounces++;
      ballState.dy = -ballState.dy;
    }

    // Reflect the ball when hitting the paddles
    if (
      (ballState.x - ballSize / 2 < paddleWidth && // hitting left paddle
        ballState.y + ballSize / 2 >= homePaddlePos &&
        ballState.y - ballSize / 2 <= homePaddlePos + paddleHeight) ||
      (ballState.x + ballSize / 2 > width - paddleWidth && // hitting right paddle
        ballState.y + ballSize / 2 >= awayPaddlePos &&
        ballState.y - ballSize / 2 <= awayPaddlePos + paddleHeight)
    ) {
      numberOfBounces++;
      ballState.dx = -ballState.dx;
    }
    homePaddlePos += homePaddleState.dy;
    awayPaddlePos += awayPaddleState.dy;
    // Update paddle positions based on current direction
    //homePaddlePos += GameComponent.paddleSpeed; // Assuming you have a variable for the paddle speed
    //awayPaddlePos += GameComponent.paddleSpeed; // Assuming you have a variable for the paddle speed

    // Ensure the paddles stay within the vertical bounds

    // Check if the ball passes the paddles (you may need to adjust this logic)
    if (ballState.x - ballSize / 2 < paddleWidth / 2) {
      //const timeOut = setTimeout(async () => {
      ballState.x = width / 2;
      ballState.y = height / 2;
      ballState.dy = -ballState.dy;

      numberOfRounds++;
      awayScore++;
      this.server
        .to(data.gameId.toString())
        .emit("score", [homeScore, awayScore]);
      //if (homeScore === 5) {
      //  // 홈팀 승자로 넣기
      //  await this.gamePlayerService.saveGamePlayer(
      //    data.gameId,
      //    data.homeId,
      //    homeScore,
      //  );
      //  await this.gamePlayerService.saveGamePlayer(
      //    data.gameId,
      //    data.awayId,
      //    awayScore,
      //  );
      //  //await this.gameService.saveRecord(
      //  //  data.gameId,
      //  //  numberOfRounds,
      //  //  numberOfBounces,
      //  //);
      //  return;
      //}
    } else if (ballState.x + ballSize / 2 > width - paddleWidth / 2) {
      ballState.x = width / 2;
      homeScore++;
      ballState.y = height / 2;
      ballState.dy = -ballState.dy;
      numberOfRounds++;
      this.server
        .to(data.gameId.toString())
        .emit("score", [homeScore, awayScore]);
      //if (awayScore === 5) {
      //  //away팀 승자로 넣기
      //  await this.gamePlayerService.saveGamePlayer(
      //    data.gameId,
      //    data.homeId,
      //    homeScore,
      //  );
      //  await this.gamePlayerService.saveGamePlayer(
      //    data.gameId,
      //    data.awayId,
      //    awayScore,
      //  );
      //  //await this.gameService.saveRecord(
      //  //  data.gameId,
      //  //  numberOfRounds,
      //  //  numberOfBounces,
      //  //);
      //  return;
      //}
    }

    return {
      ball: { x: ballState.x, y: ballState.y },
      homePaddle: { x: 0, y: homePaddlePos, dy: homePaddleState.dy },
      awayPaddle: {
        x: width - paddleWidth,
        y: awayPaddlePos,
        dy: awayPaddleState.dy,
      },
      numberOfBounces,
      numberOfRounds,
      homeScore,
      awayScore,
    };
  }

  async checkPlayTIme(playTime: Date) {
    const endTime = new Date();
    const diffTime = endTime.getTime() - playTime.getTime();
    const playTimeFormat = showPlayTime(diffTime);
    return playTimeFormat;
  }

  keyPress(data: any, socket: Socket): number {
    let homePaddleStateDy = 0;
    let awayPaddleStateDy = 0;
    if (data.team === GameTeam.HOME) {
      if (data.key === "ArrowUp") {
        homePaddleStateDy = -10;
      } else if (data.key === "ArrowDown") {
        homePaddleStateDy = 10;
      }
      return homePaddleStateDy;
      // homePaddleState.y += homePaddleState.dy;
    } else if (data.team === GameTeam.AWAY) {
      if (data.key === "ArrowUp") {
        awayPaddleStateDy = -10;
      } else if (data.key === "ArrowDown") {
        awayPaddleStateDy = 10;
      }
      return awayPaddleStateDy;
      // awayPaddleState.y += awayPaddleState.dy;
    }
  }

  keyrelease(data: any, socket: Socket): number {
    // 전역에서 arrow up 이나 down이 key Up 되었을 때 flag를 세워줘야함(끄거나)
    // below loop에서 해당 flag가 켜지면 수행되어야하는 로직
    let homePaddleStateDy = 0;
    let awayPaddleStateDy = 0;
    if (data.team === GameTeam.HOME) {
      homePaddleStateDy = 0;
      return homePaddleStateDy;
    } else if (data.team === GameTeam.AWAY) {
      awayPaddleStateDy = 0;
      return awayPaddleStateDy;
    }
  }
}
// 좌표 계산 로직을 수행하는 함수

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

function showPlayTime(diffTime: number) {
  const playTime = Math.floor(diffTime / 1000);
  const formattedPlayTime = format(playTime, "mm:ss");
  return formattedPlayTime;
}

function isMoreThan30SecondsAgo(targetTime: string): boolean {
  const currentTime = new Date();

  //string to date
  const beforeTime = new Date(targetTime);
  const timeDifferenceInSeconds =
    (currentTime.getTime() - beforeTime.getTime()) / 1000;

  return timeDifferenceInSeconds > 30;
}

function timeOut(startTime: Date): boolean {
  //5분이 지나면 게임이 종료되고, 게임 기록이 저장된다.
  //startTime과 현재 시각을 비교해서 5분이 지났는지 확인한다.
  // 5분이 지났으면 true를 반환하고, 아니라면 false를 반환한다

  const currentTime = new Date();
  const diffTime = currentTime.getTime() - startTime.getTime();
  const diffTimeInSeconds = diffTime / 1000;
  return diffTimeInSeconds > 300;
}

// Set a timeout for 3 minutes

//  // Save the timeout ID for the user
//  this.disconnectTimeouts.set(data.userId, timeoutId);
