import { Logger, OnModuleInit, UseGuards } from "@nestjs/common";
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
import { GameUserRole, GameStatus, GameChannelPolicy } from "./enum/game.enum";
import { GamePlayer } from "./entity/game.player.entity";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { format } from "date-fns";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";

export const connectedClients: Map<number, Socket> = new Map();

@WebSocketGateway(85, {
  namespace: "game",
  cors: true,
})
@UseGuards(JWTAuthGuard)
export class GameGateWay {
  private logger = new Logger(GameGateWay.name);
  constructor(
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(GamePlayer)
    private gamePlayerRepository: Repository<GamePlayer>,
    private redisClient: Redis,
    private userService: UserService,
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
    //  const channelInfo = await this.gameRepository.findOne({
    //    where: { title: data.title },
    //  });

    //  if (channelInfo.gameStatus === GameStatus.READY) {
    //    //게임 준비 상태에서 연결이 끊긴 경우
    //    const creatorId = await this.redisClient.hget(
    //      `GM|${data.title}`,
    //      "cretor",
    //    );
    //    const userId = await this.redisClient.hget(`GM|${data.title}`, "user");

    //    if (creatorId === data.userId) {
    //      //방장이 나간경우
    //      if (userId) {
    //        const targetClient = connectedClients.get(parseInt(userId));
    //        targetClient.disconnect(true);
    //      }
    //      await this.gameRepository.update(
    //        { title: data.title },
    //        { endedAt: new Date() },
    //      );
    //      await this.redisClient.del(`GM|${data.title}`);
    //    } else if (userId === data.userId) {
    //      //유저가 나간 경우
    //      await this.redisClient.hincrby(`GM|${data.title}`, "curUser", -1);
    //      await this.redisClient.hset(`GM|${data.title}`, "user", null);
    //    }
    //    // 게임중에 연결이 끊긴 경우
    //  } else if (channelInfo.gameStatus === GameStatus.INGAME) {
    //    await timeOut(data);
    //  } else if (channelInfo.gameStatus === GameStatus.DONE) {
    //    if (await this.redisClient.keys(`GM|${data.title}`))
    //      await this.redisClient.del(`GM|${data.title}`);
    //  }
  }

  async handleReconnect(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.debug(`Socket Reconnected`);
    //  const channelInfo = await this.gameRepository.findOne({
    //    where: { title: data.title },
    //  });
    //  if (channelInfo.gameStatus === GameStatus.INGAME) {
    //    // Check if there's a pending timeout for the user
    //    const timeoutId = this.disconnectTimeouts.get(data.userId);
    //    if (timeoutId) {
    //      // Cancel the previous timeout
    //      clearTimeout(timeoutId);
    //      // Clean up resources, if necessary
    //      this.disconnectTimeouts.delete(data.userId);
    //      // Proceed with the game as normal
    //      this.server.emit("msgToClient", "The game is continuing.");
    //    }
    //  }
    // Handle other cases or do nothing if not in-game
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
    const { userId, title } = data;

    //해당 유저가 다른 채널에 있다면 다른 채널의 소켓 통신을 끊어버림
    if (connectedClients.has(userId)) {
      const targetClient = connectedClients.get(userId);
      targetClient.disconnect(true);
      connectedClients.delete(data.userId);
    }

    const gameChannelInfo = await this.gameChannelRepository.findOne({
      where: { title: title },
    });

    socket.join(gameChannelInfo.id.toString());
    connectedClients.set(userId, socket);

    //입장불가
    //1. 비밀번호 입력자가 아닌 경우
    //2. 방의 인원이 2명을 초과한 경우
    if (gameChannelInfo.game_channel_policy === GameChannelPolicy.PRIVATE) {
      const isPasswordCorrect = await this.redisClient.lrange(
        `GM|${gameChannelInfo.title}`,
        0,
        -1,
      );

      //isPasswordCorrect 중에 ACCESS로 시작하는 value값만 가져온다.
      const filter = isPasswordCorrect.filter((value) =>
        value.startsWith("ACCESS|"),
      );

      //ACCESS 대상이 아닌경우
      if (!filter) {
        const targetClient = connectedClients.get(userId);
        targetClient.disconnect(true);
        socket.leave(gameChannelInfo.id.toString());
        connectedClients.delete(data.userId);
        return;
      }
    } else if (gameChannelInfo.cur_user === gameChannelInfo.max_user) {
      const targetClient = connectedClients.get(userId);
      targetClient.disconnect(true);
      socket.leave(gameChannelInfo.id.toString());
      connectedClients.delete(data.userId);
      return;
    }

    //방에 들어와 있는 인원에 대한 정보를 저장한다
    const creatorId = await this.redisClient.hget(`GM|${title}`, "creator");

    if (parseInt(creatorId) === userId) {
      await this.redisClient.hset(`GM|${title}`, "create", 1);
      await this.redisClient.hset(`GM|${title}`, "createOnline", "true");
    } else {
      await this.redisClient.hset(`GM|${title}`, "user", userId);
      await this.redisClient.hset(`GM|${title}`, "userReady", "false");
      await this.redisClient.hset(`GM|${title}`, "userOnline", "true");
    }

    this.sendUserList(parseInt(creatorId), title);

    //current_user 수 확인
    this.updateCurUser(title, gameChannelInfo.id);

    socket.join(gameChannelInfo.id.toString());
    connectedClients.set(userId, socket);
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
      const senderInfo = await this.userService.findUserById(data.sender);

      const gameInfo = await this.gameChannelRepository.findOne({
        where: { title: data.title },
      });

      this.server.to(gameInfo.id.toString()).emit("msgToClient", {
        time: showTime(data.time),
        sender: senderInfo.nickname,
        content: data.content,
      });
    } catch (error) {
      console.log(error);
    }
  }

  //userId : number
  //title : string
  @SubscribeMessage("pressStart")
  async StartGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    if (
      data.userId ===
        (await this.redisClient.hget(`GM|${data.title}`, "creator")) &&
      (await this.redisClient.hget(`GM|${data.title}`, "userReady")) === "true"
    ) {
      this.server.emit("msgToClient", "게임을 시작합니다.");
      await this.redisClient.hset(`GM|${data.title}`, "", "INGAME");
    }
  }

  //  //userId : number
  //  //title : string
  @SubscribeMessage("pressReady")
  async ReadyGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    if (
      data.userId ===
        (await this.redisClient.hget(`GM|${data.title}`, "user")) &&
      (await this.redisClient.hget(`GM|${data.title}`, "userReady")) === "true"
    ) {
      await this.redisClient.hset(`GM|${data.title}`, "userReady", "false");
    } else if (
      data.userId ===
        (await this.redisClient.hget(`GM|${data.title}`, "user")) &&
      (await this.redisClient.hget(`GM|${data.title}`, "userReady")) === "false"
    ) {
      await this.redisClient.hset(`GM|${data.title}`, "userReady", "true");
    }
  }

  //title :string
  //userId : number
  @SubscribeMessage("leaveChannel")
  async leaveChannel(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const channelInfo = await this.gameChannelRepository.findOne({
      where: { title: data.title },
    });

    if (channelInfo.game_status === GameStatus.READY) {
      //게임 준비 상태에서 연결이 끊긴 경우
      const creatorId = await this.redisClient.hget(
        `GM|${data.title}`,
        "cretor",
      );
      const userId = await this.redisClient.hget(`GM|${data.title}`, "user");

      if (creatorId === data.userId) {
        //방장이 나간경우
        if (userId) {
          const targetClient = connectedClients.get(parseInt(userId));
          targetClient.disconnect(true);
          connectedClients.delete(parseInt(userId));
        }
        await this.gameChannelRepository.update(
          { title: data.title },
          { deleted_at: new Date() },
        );
        await this.redisClient.del(`GM|${data.title}`);
        socket.leave(channelInfo.id.toString());
      } else if (userId === data.userId) {
        //유저가 나간 경우
        await this.redisClient.hincrby(`GM|${data.title}`, "curUser", -1);
        await this.redisClient.hset(`GM|${data.title}`, "user", null);
        const targetClient = connectedClients.get(parseInt(userId));
        targetClient.disconnect(true);
        connectedClients.delete(parseInt(userId));
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

  //  @SubscribeMessage("reconnect")
  //  async Reconnect(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
  //    const channelInfo = await this.gameRepository.findOne({
  //      where: { title: data.title },
  //    });
  //    if (channelInfo.gameStatus === GameStatus.INGAME) {
  //      // Check if there's a pending timeout for the user
  //      const timeoutId = this.disconnectTimeouts.get(data.userId);

  //      if (timeoutId) {
  //        // Cancel the previous timeout
  //        clearTimeout(timeoutId);
  //        // Clean up resources, if necessary
  //        this.disconnectTimeouts.delete(data.userId);

  //        // Proceed with the game as normal
  //        this.server.emit("msgToClient", "The game is continuing.");
  //      }
  //    }
  //    // Handle other cases or do nothing if not in-game
  //  }

  //  @SubscribeMessage("enterQueue")
  //  async enterQueue(
  //    @MessageBody() data: any,
  //    @ConnectedSocket() socket: Socket,
  //  ) {
  //    const { userId, title } = data;
  //    const gameInfo = await this.gameRepository.findOne({
  //      where: { title: title },
  //    });

  //    const creatorId = await this.redisClient.hget(`GM|${title}`, "creator");

  //    if (parseInt(creatorId) === userId) {
  //      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
  //    } else {
  //      await this.redisClient.hset(`GM|${title}`, "user", userId);
  //      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
  //    }

  //    const TotalUserInfo = [];

  //    const creatorInfo = await this.userService.findUserById(
  //      parseInt(creatorId),
  //    );

  //    const CreatorInfo = {
  //      id: creatorInfo.id,
  //      nickname: creatorInfo.nickname,
  //      avatar: creatorInfo.avatar,
  //    };

  //    TotalUserInfo.push(CreatorInfo);

  //    const user = await this.redisClient.hget(`GM|${title}`, "user");
  //    if (parseInt(user) !== 0) {
  //      {
  //        const userInfo = await this.userService.findUserById(parseInt(user));

  //        const UserInfo = {
  //          id: userInfo.id,
  //          nickname: userInfo.nickname,
  //          avatar: userInfo.avatar,
  //        };
  //        TotalUserInfo.push(UserInfo);
  //      }
  //      socket.join(gameInfo.id.toString());
  //      this.server.emit("userList", TotalUserInfo);
  //    }
  //  }

  async sendUserList(channelId: number, title: string) {
    const TotalUserInfo = [];

    if (
      (await this.redisClient.hget(`GM|${title}`, "creatorOnline")) === "true"
    ) {
      const creatorId = await this.redisClient.hget(`GM|${title}`, "creator");
      const creatorInfo = await this.userService.findUserById(
        parseInt(creatorId),
      );

      const CreatorInfo = {
        id: creatorInfo.id,
        nickname: creatorInfo.nickname,
        avatar: creatorInfo.avatar,
      };
      TotalUserInfo.push(CreatorInfo);
    }
    if ((await this.redisClient.hget(`GM|${title}`, "userOnline")) === "true") {
      const user = await this.redisClient.hget(`GM|${title}`, "user");
      const userInfo = await this.userService.findUserById(parseInt(user));
      const UserInfo = {
        id: userInfo.id,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
      };
      TotalUserInfo.push(UserInfo);
    }
    this.server.to(channelId.toString()).emit("userList", TotalUserInfo);
  }

  async updateCurUser(title: string, channelId: number) {
    let cur_user = 0;
    if (
      (await this.redisClient.hget(`GM|${title}`, "createOnline")) === "true"
    ) {
      cur_user++;
    }
    if ((await this.redisClient.hget(`GM|${title}`, "userOnline")) === "true") {
      cur_user++;
    }
    await this.gameChannelRepository.update(
      { id: channelId },
      { cur_user: cur_user },
    );
  }

  // gameId: 게임방 id
  // team: home || away
  // key: 키값 up || down
  @SubscribeMessage("gameKeyDown")
  async movePaddle(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // 해당하는 키를 눌렀음. 이제 해당하는 키를 누른 유저의 패들을 움직여야 함.
      // paddle up / down logic
    } catch (error) {
      console.log(error);
    }
  }

  // gameId: 게임방 id
  // team: home || away
  // key: 키값 up || down
  @SubscribeMessage("gameKeyUp")
  async stopPaddle(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      // 해당하는 키를 때었음. 이제 해당하는 키를 누른 유저의 패들을 멈춰야 함.
      // paddle stop logic
    } catch (error) {
      console.log(error);
    }
  }
}

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

// Set a timeout for 3 minutes

//  // Save the timeout ID for the user
//  this.disconnectTimeouts.set(data.userId, timeoutId);
