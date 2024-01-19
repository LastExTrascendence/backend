import {
  HttpException,
  Inject,
  Logger,
  UseGuards,
  forwardRef,
} from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Redis } from "ioredis";
import { UserService } from "src/user/user.service";

import { format } from "date-fns";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { User } from "./entity/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Like, Repository } from "typeorm";
import { UserFriend } from "./entity/user.friend.entity";
import * as config from "config";
import {
  GameChannelPolicy,
  GameMode,
  GameStatus,
  GameType,
} from "src/game/enum/game.enum";
import { UserStatus } from "./entity/user.enum";
import { GameChannelService } from "src/game/game.channel.service";
import { FriendService } from "./user.friend.service";
import { ChannelsService } from "src/channel/channel.service";
import { GameService } from "src/game/game.service";
import { gameConnectedClients } from "src/game/game.gateway";

//path, endpoint

export const userConnectedClients: Map<number, Socket> = new Map();

@WebSocketGateway(config.get("FE").get("dm_port"), {
  namespace: "user",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class UserGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private logger = new Logger(UserGateway.name);

  @WebSocketServer()
  server: Server;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserFriend)
    private userFriendRepository: Repository<UserFriend>,
    private gameChannelService: GameChannelService,
    private gameService: GameService,
    private channelsService: ChannelsService,
    private redisClient: Redis,
    private userService: UserService,
    private friendService: FriendService,
  ) {}

  afterInit() {
    this.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(socket: Socket) {
    //userId 필요함
    const userId = parseInt(socket.handshake.auth.user.id);
    userConnectedClients.set(userId, socket);
    this.userRepository.update(userId, { status: UserStatus.ONLINE });
    if (userConnectedClients.size === 1) {
      this.reconnectedServer();
      this.channelsService.resetChatChannel();
      this.gameChannelService.deleteAllGameChannel();
      this.gameService.deleteAllGame();
    }
    this.sendFriendStatus();
    //이미 들어온 유저 까투
    this.logger.verbose(
      `${socket.id}(${socket.handshake.query["username"]}) is connected!`,
    );
  }

  handleDisconnect(socket: Socket) {
    //this.connectedClients.delete(socket.handshake.query["userId"]);
    const userId = parseInt(socket.handshake.auth.user.id);
    this.leaveServer(userId);
    userConnectedClients.delete(userId);
    this.sendFriendStatus();

    this.logger.verbose(`${socket.id} is disconnected...`);
  }

  /**
   *
   * DM 관련한 메시지를 처리하는 메소드
   * @SubscribeMessage("msgToServer")
   * @SubscribeMessage("getRedis")
   *
   */

  @SubscribeMessage("msgToServer")
  async handleMessage(
    @MessageBody()
    payload: {
      time: Date;
      sender: number;
      receiver: string;
      content: string;
    },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    this.logger.verbose(`Received message: ${payload.content}`);
    //1. UserDB에서 sender, receiver가 있는지 확인
    const sender = await this.userService.findUserById(payload.sender);
    const receiver = await this.userService.findUserByNickname(
      payload.receiver,
    );
    if (!sender) throw new HttpException("No sender found", 404);
    else if (!receiver) throw new HttpException("No receiver found", 404);

    //2. 둘다 있으면 저장 중복이면 저장 안함
    let name = null;

    //나에게 보내기 기능 추가
    if (sender.id >= receiver.id) {
      name = receiver.id + "," + sender.id;
    } else {
      name = sender.id + "," + receiver.id;
    }

    //3. Dm 메시지 저장

    const RedisPayload = {
      name: name,
      time: this.showTime(payload.time),
      sender: sender.id,
      receiver: receiver.id,
      content: payload.content,
    };

    this.saveMessageToRedis(this.redisClient, RedisPayload);

    const ClientPayload = {
      time: RedisPayload.time,
      sender: sender.nickname,
      receiver: receiver.nickname,
      content: RedisPayload.content,
    };

    this.server.socketsJoin(name);
    this.server.to(name).emit("msgToClient", ClientPayload);
  }

  @SubscribeMessage("getRedis")
  async giveRedis(
    socket: Socket,
    payload: {
      sender: number;
      receiver: string;
    },
  ): Promise<void> {
    this.logger.verbose(`getRedis: ${payload.sender}, ${payload.receiver}`);
    const chats = await this.fetchChatHistory(payload);

    const receiver = await this.userService.findUserByNickname(
      payload.receiver,
    );

    let name = null;

    if (payload.sender >= receiver.id) {
      name = receiver.id + "," + payload.sender;
    } else {
      name = payload.sender + "," + receiver.id;
    }

    this.server.socketsJoin(name);
    //객체 배열로 변경
    //const totalMessages = [];

    if (chats) {
      for (const idx in chats) {
        const split = chats[idx].split("|");
        if (split.length > 4) {
          const message = {
            time: split[0],
            sender: split[1],
            receiver: split[2],
            content: split.slice(3 - split.length).join("|"),
          };
          message.sender = (
            await this.userService.findUserById(Number(split[1]))
          ).nickname;
          message.receiver = (
            await this.userService.findUserById(Number(split[2]))
          ).nickname;
          this.server.to(socket.id).emit("msgToClient", message);
        } else {
          const message = {
            time: split[0],
            sender: split[1],
            receiver: split[2],
            content: split[3],
          };
          message.sender = (
            await this.userService.findUserById(Number(split[1]))
          ).nickname;
          message.receiver = (
            await this.userService.findUserById(Number(split[2]))
          ).nickname;
          this.server.to(socket.id).emit("msgToClient", message);
        }
      }
    }
  }

  private async fetchChatHistory(payload: {
    sender: number;
    receiver: string;
  }): Promise<string[] | void> {
    try {
      const receiverId = await this.userService.findUserByNickname(
        payload.receiver,
      );

      let name = null;
      if (payload.sender >= receiverId.id) {
        name = receiverId.id + "," + payload.sender;
      } else {
        name = payload.sender + "," + receiverId.id;
      }
      console.log(name);
      const chatHistory = await this.redisClient.lrange(`DM|${name}`, 0, -1);
      return chatHistory;
    } catch (error) {
      // Handle errors, log, or emit an error event to the client
      console.error("Error fetching chat history from Redis:", error);
    }
  }

  private saveMessageToRedis(
    redisClient: Redis,
    payload: {
      name: string;
      time: string;
      sender: number;
      receiver: number;
      content: string;
    },
  ) {
    redisClient.rpush(
      `DM|${payload.name}`,
      `${payload.time}|${payload.sender}|${payload.receiver}|${payload.content}`,
    );
  }

  private showTime(currentDate: Date) {
    const formattedTime = format(currentDate, "h:mm a");
    return formattedTime;
  }

  /**
   *
   * 해당 유저의 친구의 ONLINE/OFFLINE 상태를 알려주는 메소드
   * @SubscribeMessage("getFriendList")
   *
   */

  //userId : number

  @SubscribeMessage("getFriendList")
  async getFriendList(socket: Socket, data: any): Promise<void> {
    const friendList = await this.userFriendRepository.find({
      where: { user_id: data.userId },
    });

    const totalFriendList = [];

    for (const idx in friendList) {
      const friendInfo = await this.userService.findUserById(
        friendList[idx].friend_id,
      );
      const friendData = {
        nickname: friendInfo.nickname,
        avatar: friendInfo.avatar,
        status: friendInfo.status,
      };
      totalFriendList.push(friendData);
    }

    this.server.to(socket.id).emit("friendList", totalFriendList);
  }

  /**
   *
   * 해당 유저의 친구의 ONLINE/OFFLINE 상태를 알려주는 메소드
   * @SubscribeMessage("getFriendList")
   *
   */

  //userId : number

  @SubscribeMessage("enterQueue")
  async enterQueue(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.verbose(`enterQueue: ${data.userId}`);
    const { userId } = data;

    if (!userId || !(await this.userService.findUserById(userId))) {
      throw new HttpException("No user found", 404);
    }

    // Store user information in Redis queue
    await this.redisClient.rpush("QM", userId);

    if (userConnectedClients.has(userId)) {
      const socket = userConnectedClients.get(userId);
      socket.disconnect();
      throw new HttpException("User already in queue", 400);
    }

    this.server.socketsJoin(`QM|${userId}`);
    userConnectedClients.set(userId, socket);

    //this.server.to(`QM|${userId}`)
    //.emit("enteredQueue", { message: "Entered the quick match queue" });
    // Notify the user that they've entered the queue

    // Check if there are enough players in the queue to start a game (two players)

    const makeMatch = setInterval(async () => {
      const queueLength = await this.redisClient.llen("QM");
      if (queueLength >= 2) {
        const quickMatchNum = await this.gameChannelService.findQuickMatches();
        // Dequeue the first two players from the queue
        const homePlayer = await this.redisClient.lpop("QM");
        const awayPlayer = await this.redisClient.lpop("QM");

        const newGame = {
          id: 0,
          title: "Quick Match#" + quickMatchNum.toString(),
          gameChannelPolicy: GameChannelPolicy.PUBLIC,
          password: null,
          creatorId: parseInt(homePlayer),
          gameType: GameType.NORMAL,
          gameMode: GameMode.NORMAL,
          curUser: 0,
          maxUser: 2,
          gameStatus: GameStatus.READY,
        };

        this.gameChannelService.createGame(newGame);

        // Create a game instance or use existing logic to set up a game with player1 and player2

        // Notify players that the game is starting and provide opponent information
        // Emit an event to start the game for both players

        this.server.to(`QM|${homePlayer}`).emit("gameMatch");
        this.server.to(`QM|${awayPlayer}`).emit("gameMatch");
      } else if (queueLength === 0) {
        return;
      }
    }, 1000);
    socket.on("exitQueue", () => {
      clearInterval(makeMatch);
    });
    socket.on("startGame", () => {
      clearInterval(makeMatch);
    });
  }

  @SubscribeMessage("exitQueue")
  async exitQueue(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    try {
      const { userId } = data;

      const userList = await this.redisClient.lrange("QM", 0, -1);

      //userList에 같은 userId가 있는지 확인
      const filteredList = userList.filter((user) => parseInt(user) === userId);

      if (filteredList.length === 0) {
        throw new HttpException("No user found", 404);
      } else {
        await this.redisClient.lrem("QM", 0, userId);
        socket.leave(`QM|${userId}`);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("gameInvite")
  async inviteUser(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.verbose(
        `inviteUser: ${data.userId}, ${data.inviteUserNick}, ${data.url}`,
      );
      // "/game/{id}?name={gameTitle}"
      const { userId, inviteUserNick, url } = data;

      const inviteUser =
        await this.userService.findUserByNickname(inviteUserNick);

      const splitUrl = url.split("?");

      const gameId = splitUrl[0].split("/")[2];
      const gameTitle = splitUrl[1].split("=")[1];

      const gameInfo =
        await this.gameChannelService.findOneGameChannelById(gameId);

      if (!gameId || !gameTitle) {
        throw new HttpException("No game found", 404);
      } else if (
        gameInfo.deleted_at !== null ||
        gameInfo.game_status !== GameStatus.READY ||
        gameInfo.cur_user !== 1
      ) {
        throw new HttpException("No game found", 404);
      }

      //입장 불가인 경우
      //1. 게임 방이 없는 경우 || 게임이 시작 된 경우
      //2. 초대한 사람이랑 초대받은 사람이 같은 경우
      //3. 이미 게임 소켓을 사용하고 있는 경우
      //4. 초대한 사람이 OFFLINE인 경우
      //5. 게임 방의 정원이 2명인 경우

      //해야할 것
      //초대 받은 사람이, 초대한 사람을 싫어하는 경우

      //if (!gameInfo) {
      //  throw new HttpException("No game found", 404);
      // } else if (inviteUser.id === userId) {
      //   throw new HttpException("Can't invite yourself", 400);
      // } else if (gameConnectedClients) {
      //   throw new HttpException("User is already in game", 400);
      // } else if (inviteUser.status === UserStatus.OFFLINE) {
      //   throw new HttpException("User is offline", 400);
      //} else {
      //if (gameInfo.game_channel_policy === GameChannelPolicy.PRIVATE) {
      //  await this.redisClient.hset(
      //    `GM|${gameTitle}`,
      //    `ACCESS|${userId}`,
      //    userId,
      //  );
      //}
      const inviteUserSocket = userConnectedClients.get(inviteUser.id);
      console.log("invitedUser", inviteUserSocket.id, gameTitle, url);
      this.server.to(inviteUserSocket.id).emit("invitedUser", {
        hostNickname: (await this.userService.findUserById(userId)).nickname,
        url: url,
      });

      //}
    } catch (error) {
      throw new HttpException(error, 400);
    }
  }

  async sendFriendStatus() {
    userConnectedClients.forEach(async (socket, userId) => {
      const user = await this.friendService.findAllFriend(userId);
      const friends = [];

      for (const idx in user) {
        const friendInfo = await this.userService.findUserById(
          user[idx].friend_id,
        );
        const friendData = {
          friendId: friendInfo.id,
          friendNickname: friendInfo.nickname,
          friendAvatar: friendInfo.avatar,
          status: friendInfo.status,
        };
        friends.push(friendData);
      }
      console.log(friends);
      this.server.to(socket.id).emit("friendStatus", friends);
    });
  }

  async leaveServer(userId: number) {
    const socket = userConnectedClients.get(userId);
    if (socket) {
      socket.disconnect();
    }
    this.userRepository.update(userId, { status: UserStatus.OFFLINE });
  }

  async reconnectedServer() {
    if (userConnectedClients.size === 1) {
      userConnectedClients.forEach(async (socket, userId) => {
        const user = await this.userService.findUserById(userId);
        if (user.status === UserStatus.OFFLINE) {
          socket.disconnect();
        }
      });
    }
  }
}
