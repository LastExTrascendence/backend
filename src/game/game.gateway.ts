import {
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  OnModuleInit,
  UseGuards,
  forwardRef,
} from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Repository, IsNull } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import {
  GameUserRole,
  GameStatus,
  GameChannelPolicy,
  GameTeam,
  GameComponent,
  GameType,
  GameMode,
} from "./enum/game.enum";
import { GamePlayer } from "./entity/game.player.entity";
import { format, set, sub } from "date-fns";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { GamePlayerService } from "./game.player.service";
import { GameService } from "./game.service";
import { Mutex } from "async-mutex";
import { GameChannelService } from "./game.channel.service";
import {
  awayInfoDto,
  gameConnectDto,
  gameDictionaryDto,
  gameInfoDto,
  homeInfoDto,
} from "./dto/game.dto";
import { RedisService } from "src/commons/redis-client.service";

export const gameConnectedClients: Map<number, gameConnectDto> = new Map();

export const gameDictionary: Map<number, gameDictionaryDto> = new Map();

export const gameThreadCheck = [];

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
    private redisClient: RedisService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    @Inject(forwardRef(() => GamePlayerService))
    private gamePlayerService: GamePlayerService,
    @Inject(forwardRef(() => GameService))
    private gameService: GameService,
    @Inject(forwardRef(() => GameChannelService))
    private gameChannelService: GameChannelService,
  ) { }

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

  //userId
  async handleDisconnect(socket: Socket) {
    this.logger.debug(`Socket Disconnected`);
    const keysOfPerson = Object.keys(gameConnectedClients);

    // Find the key where the socket matches
    const socketKey = Array.from(gameConnectedClients.keys()).find(
      (key) => gameConnectedClients.get(key).socket === socket,
    );

    this.logger.debug(`socketKey ${socketKey}`);

    if (socketKey != undefined) {
      const { title, gameId } = gameConnectedClients.get(socketKey);
      //this.leaveGame({ gameId: gameId, userId: socketKey }, socket);
      const redisInfo = await this.redisClient.hgetall(`GM|${title}`);
      if (redisInfo) {
        if (
          redisInfo.creatorOnline === "false" &&
          redisInfo.userOnline === "false"
        ) {
          await this.redisClient.del(`GM|${title}`);
        }
        const channelInfo = await this.gameChannelRepository.findOne({
          where: { id: gameId },
        });
        if (channelInfo.game_status === GameStatus.READY) {
          if (parseInt(redisInfo.creator) === socketKey) {
            await this.redisClient.hset(
              `GM|${title}`,
              "creatorOnline",
              "false",
            );
          } else if (parseInt(redisInfo.user) === socketKey) {
            await this.redisClient.hset(`GM|${title}`, "userOnline", "false");
            await this.redisClient.hset(`GM|${title}`, "user", null);
            await this.redisClient.hset(`GM|${title}`, "userReady", "false");
          }
        } else if (channelInfo.game_status === GameStatus.INGAME) {
          if (channelInfo.game_type === GameType.SINGLE) {
            await this.redisClient.hset(`GM|${title}`, "creatorOnline", "false");
            this.gameService.doneGame(gameId);
            gameConnectedClients.delete(socketKey);
            return;
          }
          if (parseInt(redisInfo.creator) === socketKey) {
            await this.redisClient.hset(
              `GM|${title}`,
              "creatorOnline",
              "false",
            );
          } else if (parseInt(redisInfo.user) === socketKey) {
            await this.redisClient.hset(`GM|${title}`, "userOnline", "false");
            await this.redisClient.hset(`GM|${title}`, "userReady", "false");
          }

          const startTime = await this.gameService.getStartTime(gameId);
          await this.gameService.disconnectGame(
            title,
            gameId,
            startTime,
            this.server,
          );

          await this.gameService.dropOutGame(gameId);
          if (parseInt(redisInfo.creator) === socketKey) {
            await this.gamePlayerService.dropOutGamePlayer(
              gameId,
              parseInt(redisInfo.creator),
            );
            setTimeout(async () => {
              gameDictionary.get(gameId).awayUserSocket.disconnect(true);
            }, 1000 * 3);
          } else if (parseInt(redisInfo.user) === socketKey) {
            await this.gamePlayerService.dropOutGamePlayer(
              gameId,
              parseInt(redisInfo.user),
            );
            await this.redisClient.hset(`GM|${title}`, "user", null);
          }
        }
        await this.updateCurUser(channelInfo.title, channelInfo.id);
        await this.sendUserList(title, gameId, socket);
        gameConnectedClients.delete(socketKey);
      }
    }
  }

  //READY
  //refresh : handleDisconnect => redis 온라인 상태 변경 후 유저리스트 전송
  //방장인 경우
  //유저인 경우

  //URL : leaveGame => handleDisconnect
  //방장만 있는 경우
  //방장 + 유저에서 유저가 나간경우
  //방장 + 유저에서 방장이 나간경우

  //INGAME
  //NORMAL : finishGame => socket.disconnect (2인게임으로 확인 필요함)
  //refresh : handleDisconnect => socket.disconnect
  //URL : leaveGame => handleDisconnect => socket.disconnect

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

      let gameChannelInfo = await this.gameChannelRepository.findOne({
        where: {
          title: title,
          deleted_at: IsNull(),
          game_status: GameStatus.READY,
        },
      });

      let redisInfo = await this.redisClient.hgetall(`GM|${title}`);
      if (!userId || !title) {
        socket.disconnect(true);
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "입력값이 없습니다",
          },
          HttpStatus.NOT_FOUND,
        );
      } else if (!gameChannelInfo) {
        socket.disconnect(true);
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "존재하지 않는 방입니다.",
          },
          HttpStatus.NOT_FOUND,
        );
      } else if (gameChannelInfo.game_status !== GameStatus.READY) {
        socket.disconnect(true);
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: "게임이 시작되었습니다.",
          },
          HttpStatus.NOT_FOUND,
        );
      }

      //해당 유저가 다른 채널에 있다면 다른 채널의 소켓 통신을 끊어버림

      if (gameConnectedClients.has(parseInt(userId))) {
        const exgameInfo = gameConnectedClients.get(parseInt(userId));

        const exRedisInfo = await this.redisClient.hgetall(
          `GM|${exgameInfo.title}`,
        );

        if (exRedisInfo) {
          if (parseInt(exRedisInfo.creator) === parseInt(userId)) {
            await this.redisClient.hset(
              `GM|${exgameInfo.title}`,
              "creatorOnline",
              "false",
            );
          } else if (parseInt(exRedisInfo.user) === parseInt(userId)) {
            await this.redisClient.hset(
              `GM|${exgameInfo.title}`,
              "userOnline",
              "false",
            );
            await this.redisClient.hset(`GM|${exgameInfo.title}`, "user", null);
          }

          await this.updateCurUser(exgameInfo.title, exgameInfo.gameId);
        }
        exgameInfo.socket.disconnect(true);
        gameConnectedClients.delete(parseInt(userId));

        gameChannelInfo = await this.gameChannelRepository.findOne({
          where: {
            title: title,
            deleted_at: IsNull(),
            game_status: GameStatus.READY,
          },
        });
      }

      await socket.join(gameChannelInfo.id.toString());
      gameConnectedClients.set(parseInt(userId), {
        socket: socket,
        gameId: gameChannelInfo.id,
        title: title,
      });

      //입장불가
      //1. 방이 존재하지 않을 경우
      //2. 비밀번호 입력자가 아닌 경우
      //3. 방의 인원이 2명을 초과한 경우

      const banUserList = redisInfo[`ban|${userId}`];

      if (gameChannelInfo.game_channel_policy === GameChannelPolicy.PRIVATE) {
        const isPasswordCorrect = await this.redisClient.hgetall(
          `GM|${gameChannelInfo.title}`,
        );

        //isPasswordCorrect 중에 ACCESS로 시작하는 value값만 가져온다.
        const passwordValidate = isPasswordCorrect
          ? Object.keys(isPasswordCorrect).filter((key) =>
            key.startsWith("ACCESS"),
          )
          : null;
        //ACCESS 대상이 아닌경우
        if (!passwordValidate) {
          const targetClient = gameConnectedClients.get(userId);
          targetClient.socket.disconnect(true);
          socket.leave(gameChannelInfo.id.toString());
          gameConnectedClients.delete(data.userId);
          return;
        }
      }
      if (gameChannelInfo.cur_user === gameChannelInfo.max_user) {
        console.log("here");
        const targetClient = gameConnectedClients.get(userId);
        targetClient.socket.disconnect(true);
        socket.leave(gameChannelInfo.id.toString());
        gameConnectedClients.delete(data.userId);
        return;
      }
      if (banUserList) {
        const targetClient = gameConnectedClients.get(userId);
        targetClient.socket.disconnect(true);
        socket.leave(gameChannelInfo.id.toString());
        gameConnectedClients.delete(data.userId);
        return;
      }

      //방에 들어와 있는 인원에 대한 정보를 저장한다
      const creatorId = await this.gameChannelRepository.findOne({
        where: { id: gameChannelInfo.id },
      });

      if (creatorId.creator_id === parseInt(userId)) {
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

      await this.sendRoomInfo(title, gameChannelInfo.id, socket);
    } catch (error) {
      console.log(error);
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
        where: { title: data.title, deleted_at: IsNull() },
      });

      const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);

      if (
        redisInfo.mute !== "null" &&
        parseInt(redisInfo.muteUser) === data.sender
      ) {
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

  //MyId : number
  //   //gameId : number
  //title : string
  @SubscribeMessage("pressStart")
  async StartGame(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`pressStart`);
    const startInfo = await this.redisClient.hgetall(`GM|${data.title}`);
    const gameChannelInfo =
      await this.gameChannelService.findOneGameChannelById(
        parseInt(data.gameId),
      );

    if (
      (data.myId === parseInt(startInfo.creator) &&
        startInfo.userReady === "true" &&
        startInfo.creatorOnline === "true") ||
      gameChannelInfo.game_type === GameType.SINGLE
    ) {
      await this.gameChannelRepository.update(
        { id: parseInt(data.gameId) },
        { game_status: GameStatus.INGAME },
      );
      await this.gameService.saveGame(data.gameId);
      this.logger.debug(`gameStart`);
      const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);

      const channelInfo = await this.gameChannelRepository.findOne({
        where: { id: parseInt(data.gameId), deleted_at: IsNull() },
      });

      if (gameDictionary.has(channelInfo.id)) {
        gameDictionary.delete(channelInfo.id);
      }
      const homeInfo: homeInfoDto = {
        y: Math.floor(
          GameComponent.height / 2 - GameComponent.paddleHeight / 2,
        ),
        dy: 0, // Initial speed in the y direction
        score: 0,
      };

      const awayInfo: awayInfoDto = {
        y: Math.floor(
          GameComponent.height / 2 - GameComponent.paddleHeight / 2,
        ),
        dy: 0, // Initial speed in the y direction
        score: 0,
      };

      const gameInfo: gameInfoDto = {
        ballX: GameComponent.width / 2,
        ballY: GameComponent.height / 2,
        ballDx: -3,
        ballDy: -3,
        ballSize: GameComponent.ballSize,
        width: GameComponent.width,
        height: GameComponent.height,
        map: GameComponent.map.normal,
        paddleWidth: GameComponent.paddleWidth,
        paddleHeight: GameComponent.paddleHeight,
        numberOfRounds: 0,
        numberOfBounces: 0,
        awayInfo: awayInfo,
        homeInfo: homeInfo,
        cnt: 0,
        currentCnt: 0,
      };

      if (
        channelInfo.game_mode === GameMode.SPEED ||
        channelInfo.game_type === GameType.SINGLE
      ) {
        gameInfo.ballDx = -5;
        gameInfo.ballDy = -5;
      }

      if (
        channelInfo.game_mode === GameMode.SPEED ||
        channelInfo.game_type === GameType.SINGLE
      ) {
        gameInfo.ballDx = -5;
        gameInfo.ballDy = -5;
      }

      if (
        channelInfo.game_type === GameType.SINGLE ||
        gameChannelInfo.game_mode === GameMode.SPEED
      ) {
        gameInfo.ballDx = -5;
        gameInfo.ballDy = -5;
      }
      const creatorSocket = gameConnectedClients.get(
        parseInt(redisInfo.creator),
      ).socket;

      let userSocket = null;

      if (channelInfo.game_type === GameType.SINGLE) {
        userSocket = null;
      } else {
        userSocket = gameConnectedClients.get(parseInt(redisInfo.user)).socket;
      }

      const gameTotalInfo: gameDictionaryDto = {
        gameInfo: gameInfo,
        gameLoop: async (
          gameInfo: gameInfoDto,
          Number: number,
          server: Server,
          intervalId: NodeJS.Timeout,
        ) => {
          return await this.gameService.loopPosition(
            gameInfo,
            Number,
            server,
            intervalId,
          );
        },
        homeUserSocket: creatorSocket,
        awayUserSocket: userSocket,
        server: this.server,
      };

      gameDictionary.set(channelInfo.id, gameTotalInfo);

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
      this.logger.verbose("readyOff");
      this.server.to(data.gameId.toString()).emit("readyOff");
    } else if (
      data.myId === parseInt(readyInfo.user) &&
      readyInfo.userReady == "false"
    ) {
      await this.redisClient.hset(`GM|${data.title}`, "userReady", "true");
      this.logger.verbose("readyOn");
      this.server.to(data.gameId.toString()).emit("readyOn");
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
        where: { title: title, deleted_at: IsNull() },
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
    } catch (error) {
      console.log(error);
      throw error;
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
        where: { title: title, deleted_at: IsNull() },
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
      targetClient.socket.disconnect(true);
      gameConnectedClients.delete(kickUser.id);
      await this.redisClient.hset(`GM|${title}`, "user", null);
      await this.redisClient.hset(`GM|${title}`, "userOnline", "false");

      this.updateCurUser(channelInfo.title, channelInfo.id);
      this.sendUserList(title, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  //gameId : number
  //userId : number
  @SubscribeMessage("leaveGame")
  async leaveGame(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    try {
      //async leaveGame(data: any, socket: Socket) {
      this.logger.debug(`leaveGame${data.gameId}, ${data.userId}`);
      console.log("leaveGame");

      let creatorId = null;
      let creatorInfo = null;
      let userId = null;
      let userInfo = null;
      const channelInfo = await this.gameChannelRepository.findOne({
        where: { id: data.gameId },
      });
      const redisInfo = await this.redisClient.hgetall(
        `GM|${channelInfo.title}`,
      );

      if (!data.gameId || !data.userId || !channelInfo || !redisInfo) {
        return;
      }

      if (redisInfo.creatorOnline === "true") {
        creatorId = parseInt(redisInfo.creator);
        creatorInfo = await this.userService.findUserById(creatorId);
      }

      if (redisInfo.userOnline === "true" && redisInfo.user) {
        userId = parseInt(redisInfo.user);
        userInfo = await this.userService.findUserById(userId);
      }

      //게임 준비 상태에서 연결이 끊긴 경우
      const gameId = parseInt(data.gameId);
      const leaveId = parseInt(data.userId);

      if (channelInfo.game_status === GameStatus.READY) {
        if (creatorId === leaveId) {
          //방장이 나간경우
          this.logger.debug("leaveGame CREATOR on READY");
          if (userId) {
            const targetClient = gameConnectedClients.get(userId);
            targetClient.socket.disconnect(true);
            gameConnectedClients.delete(userId);
          }
          await this.gameChannelRepository.update(
            { id: gameId },
            { deleted_at: new Date(), game_status: GameStatus.DONE },
          );
          await this.redisClient.del(`GM|${channelInfo.title}`);
          const targetClient = gameConnectedClients.get(leaveId);
          gameConnectedClients.delete(leaveId);
          targetClient.socket.disconnect(true);
        } else if (userId === leaveId) {
          //유저가 나간 경우
          this.logger.debug("leaveGame User on READY");
          //await this.redisClient.hset(`GM|${channelInfo.title}`, "user", null);
          //await this.redisClient.hset(
          //  `GM|${channelInfo.title}`,
          //  "userOnline",
          //  "false",
          //);
          //const targetClient = gameConnectedClients.get(leaveId);
          //targetClient.socket.disconnect(true);
          //gameConnectedClients.delete(leaveId);
          //await this.updateCurUser(channelInfo.title, channelInfo.id);
          //await this.sendUserList(channelInfo.title, channelInfo.id, socket);
        }
        //}
        //else if (channelInfo.game_status === GameStatus.INGAME) {
        //  //게임중에 연결이 끊긴 경우
        //  if (channelInfo.game_type === GameType.SINGLE) {
        //    await this.redisClient.del(`GM|${channelInfo.title}`);
        //    await this.gameChannelService.doneGame(parseInt(data.gameId));
        //    return;
        //  }
        //  const gameInfo = await this.gameService.findOneByChannelId(
        //    channelInfo.id,
        //  );
        //  await this.gamePlayerService.dropOutGamePlayer(gameId, leaveId);
        //  await this.gameService.dropOutGame(data.gameId);
        //  if (creatorId === leaveId) {
        //    //방장이 나간경우
        //    this.logger.debug("leaveGame CREATOR on INGAME");

        //    const result = {
        //      winUserNick: userInfo.nickname,
        //      loseUserNick: creatorInfo.nickname,
        //      playTime: showPlayTime(gameInfo.created_at),
        //      homeScore: 0,
        //      awayScore: 5,
        //    };
        //    this.server.to(data.gameId.toString()).emit("gameEnd", result);

        //    setTimeout(async () => {
        //      await this.gameChannelService.doneGame(parseInt(data.gameId));
        //      const targetClient = gameConnectedClients.get(userId);
        //      gameConnectedClients.delete(userId);
        //      await this.redisClient.del(`GM|${channelInfo.title}`);
        //      targetClient.socket.disconnect(true);
        //    }, 3);
        //  } else if (userId === leaveId) {
        //    this.logger.debug("leaveGame User on INGAME");
        //    //유저가 나간 경우

        //    const result = {
        //      winUserNick: creatorInfo.nickname,
        //      loseUserNick: userInfo.nickname,
        //      playTime: showPlayTime(gameInfo.created_at),
        //      homeScore: 5,
        //      awayScore: 0,
        //    };
        //    this.server.to(data.gameId.toString()).emit("gameEnd", result);

        //    this.gameChannelRepository.update(
        //      { id: channelInfo.id },
        //      { game_status: GameStatus.READY },
        //    );
        //  }
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
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
        where: { title: title, deleted_at: IsNull() },
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
      targetClient.socket.disconnect(true);
      gameConnectedClients.delete(banUser.id);
      await this.redisClient.hset(`GM|${title}`, "user", null);
      await this.redisClient.hset(`GM|${title}`, "userOnline", "false");
      await this.redisClient.hset(
        `GM|${title}`,
        `ban|${banUser.id}`,
        banUser.id,
      );

      this.updateCurUser(channelInfo.title, channelInfo.id);
      this.sendUserList(title, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  //return
  //width: number;
  //height: number;
  //map: string;
  //paddleWidth: number;
  //paddleHeight: number;
  //ballSize: number;

  //title
  //gameId
  @SubscribeMessage("play")
  async gameInfo(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);

    const channelInfo = await this.gameChannelRepository.findOne({
      where: { title: redisInfo.title, deleted_at: IsNull() },
    });

    const gameTotalInfo = gameDictionary.get(channelInfo.id);

    this.logger.debug(`play ${gameDictionary.size}`);

    if (!gameTotalInfo) {
      return;
    }

    const gameComponentInfo = {
      width: gameTotalInfo.gameInfo.width,
      height: gameTotalInfo.gameInfo.height,
      map: gameTotalInfo.gameInfo.map,
      paddleWidth: gameTotalInfo.gameInfo.paddleWidth,
      paddleHeight: gameTotalInfo.gameInfo.paddleHeight,
      ballSize: gameTotalInfo.gameInfo.ballSize,
    };

    this.server.to(channelInfo.id.toString()).emit("play", gameComponentInfo);
  }

  //gameId
  //team
  //key
  @SubscribeMessage("keyDownHOME")
  async keyDownCREATOR(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.debug(`KeyDownHOME ${data.gameId} ${data.key}`);
    const gameTotalInfo = gameDictionary.get(parseInt(data.gameId));

    if (data.key === "ArrowUp") {
      gameDictionary.get(parseInt(data.gameId)).gameInfo.homeInfo.dy = -10;
    } else if (data.key === "ArrowDown") {
      gameDictionary.get(parseInt(data.gameId)).gameInfo.homeInfo.dy = 10;
    }
    gameDictionary.get(parseInt(data.gameId)).gameInfo.homeInfo.y +=
      gameDictionary.get(parseInt(data.gameId)).gameInfo.homeInfo.dy;
  }

  @SubscribeMessage("keyDownAWAY")
  async keyDownUSER(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.debug(`KeyDownAWAY ${data.gameId} ${data.key}`);
    const gameTotalInfo = gameDictionary.get(parseInt(data.gameId));

    if (data.key === "ArrowUp") {
      gameDictionary.get(parseInt(data.gameId)).gameInfo.awayInfo.dy = -10;
    } else if (data.key === "ArrowDown") {
      gameDictionary.get(parseInt(data.gameId)).gameInfo.awayInfo.dy = 10;
    }

    gameDictionary.get(parseInt(data.gameId)).gameInfo.awayInfo.y +=
      gameDictionary.get(parseInt(data.gameId)).gameInfo.awayInfo.dy;
  }

  //gameId
  //team
  //key
  @SubscribeMessage("keyUpHOME")
  async keyUpHOME(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`keyUpHOME ${data.gameId} ${data.key}`);
    gameDictionary.get(parseInt(data.gameId)).gameInfo.homeInfo.dy = 0;
  }

  @SubscribeMessage("keyUpAWAY")
  async keyUpAWAY(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(`keyUpAWAY ${data.gameId} ${data.key} ${data.myRole}`);

    gameDictionary.get(parseInt(data.gameId)).gameInfo.awayInfo.dy = 0;
  }

  @SubscribeMessage("loopPosition")
  async loopLogic(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.logger.debug(
      `loopLogic, ${data.gameId} ${data.title}, ${data.myRole}`,
    );
    const { gameId } = data;

    const gameChannelInfo =
      await this.gameChannelService.findOneGameChannelById(gameId);

    const checkGameDone = await this.gameService.isGameDone(gameChannelInfo.id);

    if (checkGameDone === true) return;
    const gameTotalInfo = gameDictionary.get(parseInt(gameId));

    //console.log("gameTotalInfo", gameTotalInfo);

    //if (gameChannelInfo.game_status !== GameStatus.INGAME) {
    //  console.log("check here", gameDictionary.size);
    //  return;
    //}

    //console.log("gameTotalInfo", gameTotalInfo);

    const mutex = new Mutex();

    const startTime = await this.gameService.getStartTime(parseInt(gameId));

    //if (
    //  (await this.gameService.isGameDone(gameChannelInfo.id)) === true ||
    //  gameDictionary.get(parseInt(gameId)).gameInfo.homeInfo.score !== 0 ||
    //  gameDictionary.get(parseInt(gameId)).gameInfo.awayInfo.score !== 0
    //) {
    //  gameDictionary.delete(parseInt(gameId));
    //  return;
    //}

    try {
      const intervalId = setInterval(async () => {
        await mutex.acquire();
        //await gameTotalInfo.gameLoop.bind(gameTotalInfo)(gameTotalInfo, gameId);
        const loopInfo = await gameDictionary
          .get(parseInt(gameId))
          .gameLoop.bind(gameDictionary.get(parseInt(gameId)))(
            gameDictionary.get(parseInt(gameId)).gameInfo,
            parseInt(gameId),
            gameDictionary.get(parseInt(gameId)).server,
            intervalId,
          );

        //console.log("loopInfo", loopInfo);

        gameDictionary.get(parseInt(gameId)).gameInfo = loopInfo;

        if ((await this.gameService.isGameDone(gameChannelInfo.id)) === true) {
          clearInterval(intervalId);
          mutex.release();
          return;
        } else if (
          //5점 바꾸기
          gameDictionary.get(parseInt(gameId)).gameInfo.homeInfo.score === 5 ||
          gameDictionary.get(parseInt(gameId)).gameInfo.awayInfo.score === 5
        ) {
          (await this.gameService.finishGame(
            data.title,
            data.gameId,
            startTime,
            this.server,
          ), { once: true });
          mutex.release();
          return;
        } else if (timeOut(startTime)) {
          clearInterval(intervalId);
          (await this.gameService.timeOutGame(
            data.title,
            data.gameId,
            startTime,
            this.server,
          ), { once: true });
          mutex.release();
          return;
        } else if (
          gameChannelInfo.game_type != GameType.SINGLE &&
          ((await this.redisClient.hgetall(`GM|${data.title}`))
            .creatorOnline === "false" ||
            (await this.redisClient.hgetall(`GM|${data.title}`)).userOnline ===
            "false")
        ) {
          clearInterval(intervalId);
          mutex.release();
          return;
        } else if (
          gameChannelInfo.game_type === GameType.SINGLE &&
          (await this.redisClient.hgetall(`GM|${data.title}`)).creatorOnline ===
          "false"
        ) {
          clearInterval(intervalId);
          mutex.release();
        }

        if (
          gameDictionary.get(parseInt(gameId)).gameInfo.cnt >
          gameDictionary.get(parseInt(gameId)).gameInfo.currentCnt
        ) {
          gameDictionary.get(parseInt(gameId)).gameInfo.currentCnt =
            gameDictionary.get(parseInt(gameId)).gameInfo.cnt;
          const returnData = {
            x: gameDictionary.get(parseInt(gameId)).gameInfo.ballX,
            y: gameDictionary.get(parseInt(gameId)).gameInfo.ballY,
            l: gameDictionary.get(parseInt(gameId)).gameInfo.homeInfo.y,
            r: gameDictionary.get(parseInt(gameId)).gameInfo.awayInfo.y,
          };
          this.server.to(gameId).emit("loopGameData", returnData);
        }
        //this.server.to(data.gameId.toString()).emit("loopGameData", returnData);
        mutex.release();
      }, 1000 / 60);
      socket.on("gameFinish", async (data) => {
        clearInterval(intervalId);
        mutex.release();
        this.logger.debug(`gameFinish`);
        (await this.gameChannelRepository.update(
          { id: parseInt(data.gameId) },
          { game_status: GameStatus.READY },
        ), { once: true });
        (await this.gameService.doneGame(parseInt(data.gameId)), { once: true });
      });

      socket.on("disconnect", async () => {
        try {
          this.logger.debug(`disconnect games `);
          clearInterval(intervalId);
          mutex.release();
          const gameChannelInfo =
            await this.gameChannelService.findOneGameChannelById(gameId);
          const redisInfo = await this.redisClient.hgetall(`GM|${data.title}`);

          if (!gameChannelInfo || !redisInfo) return;

          const gameInfo = await this.gameService.findOneByChannelId(
            gameChannelInfo.id,
          );

          if (!gameInfo) return;

          if (gameChannelInfo.game_type === GameType.SINGLE) {
            this.gameService.doneGame(parseInt(data.gameId));
            return;
          } else if (
            redisInfo.creatorOnline === "false" &&
            redisInfo.userOnline === "false"
          ) {
            await this.redisClient.del(`GM|${data.title}`);
          } else if (
            redisInfo.creatorOnline === "false" ||
            redisInfo.userOnline === "false"
          ) {
            (await this.gameService.disconnectGame(
              data.title,
              data.gameId,
              startTime,
              this.server,
            ), { once: true });
            (await this.gamePlayerService.dropOutGamePlayer(
              gameChannelInfo.id,
              parseInt(data.userId),
            ), { once: true });
            (await this.gameService.dropOutGame(gameChannelInfo.id), { once: true });
          } else if (
            gameChannelInfo.game_status === GameStatus.INGAME &&
            gameInfo.game_status === GameStatus.INGAME
          ) {
            (await this.gameService.dropOutGame(gameChannelInfo.id), { once: true });
          }
        } catch (error) {
          console.log(error);
          throw error;
        }
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
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

  async sendRoomInfo(title: string, channelId: number, socket: Socket) {
    this.logger.debug(`sendRoomInfo`);
    const channelInfo = await this.gameChannelRepository.findOne({
      where: { id: channelId, deleted_at: IsNull() },
    });

    const roomInfo = {
      mode: channelInfo.game_mode,
      type: channelInfo.game_type,
    };

    this.server.to(channelId.toString()).emit("gameInfo", roomInfo);
  }
}
// 좌표 계산 로직을 수행하는 함수

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

function formattedPlayTime(playTime: Date) {
  const formattedPlayTime = format(playTime, "mm:ss a");
  return formattedPlayTime;
}

function showPlayTime(startTime: Date) {
  const afterTime = new Date();

  const cal = (afterTime.getTime() - startTime.getTime()) / 1000;

  const minute = cal / 60;
  const second = cal % 60;

  let formattedDate = null;

  if (second < 10) formattedDate = minute.toFixed() + ":0" + second.toFixed();
  else formattedDate = minute.toFixed() + ":" + second.toFixed();

  return formattedDate;
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
