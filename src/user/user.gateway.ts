import { Logger, UseFilters, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
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
import { WebSocketExceptionFilter } from "src/auth/jwt/jwtWebSocket.filter";
import { RedisService } from "src/commons/redis-client.service";
import { gameConnectedClients } from "src/game/game.gateway";

//path, endpoint

export const userConnectedClients: Map<number, Socket> = new Map();

@WebSocketGateway(config.get("FE").get("dm_port"), {
  namespace: "user",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class UserGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
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
    private redisClient: RedisService,
    private userService: UserService,
    private friendService: FriendService,
  ) { }

  afterInit() {
    this.logger.debug(`Socket Server Init Complete`);
  }

  @UseFilters(WebSocketExceptionFilter)
  async handleConnection(socket: Socket): Promise<void | WsException> {
    try {
      //userId 필요함
      const userId = parseInt(socket.handshake.auth.user.id);

      if (userId === 0 || !userId || Number.isNaN(userId)) {
        socket.disconnect();
        return;
      }

      const userInfo = await this.userService.findUserById(userId);
      if (!userInfo) {
        socket.disconnect();
        return;
      }
      //이미 들어온 유저 까투
      else if (userConnectedClients.has(userId)) {
        socket.disconnect();
        return;
      }
      userConnectedClients.set(userId, socket);
      await socket.join(userId.toString());
      this.logger.debug(`user ONLINE: ${userId}`); 
      await this.userRepository.update(
        { id: userId },
        { status: UserStatus.ONLINE },
      );

      try {
        await this.sendMyStatus(userId);
      } catch (error) {
        console.log(error);
        throw error;
      }

      if (userConnectedClients.size === 1) {
        this.channelsService.resetChatChannel();
        this.gameChannelService.deleteAllGameChannel();
        this.gameService.deleteAllGame();
      }
      //this.sendFriendStatus();
      //이미 들어온 유저 까투
      this.logger.verbose(
        `${socket.id}(${socket.handshake.query["username"]}) is connected!`,
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  @UseFilters(WebSocketExceptionFilter)
  async handleDisconnect(socket: Socket) {
    const userId = parseInt(socket.handshake.auth.user.id);
    const userInfo = await this.userService.findUserById(userId);
    if (userId === 0 || !userId || !userInfo) {
      return;
    }
    this.logger.debug(`user OFFLINE: ${userId}`);
    await this.userRepository.update(
      { id: userId },
      { status: UserStatus.OFFLINE },
    );
    userConnectedClients.delete(userId);

    try {
      await this.sendMyStatus(userId);
    } catch (error) {
      // console.log(error);
      throw error;
    }

    this.logger.verbose(`${socket.id}, ${userId} is disconnected...`);
  }

  /**
   *
   * DM 관련한 메시지를 처리하는 메소드
   * @SubscribeMessage("msgToServer")
   * @SubscribeMessage("getRedis")
   *
   */

  @SubscribeMessage("switchDmRoom")
  async switchDmRoom(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.verbose(`switchDmRoom: ${data.userId}, ${data.friendId}`);
    const { beforeUserNick, switchUserId, afterUserNick } = data;

    const beforeUser =
      await this.userService.findUserByNickname(beforeUserNick);

    if (beforeUserNick) {
      let beforeRoomName = null;

      if (beforeUser.id >= switchUserId) {
        beforeRoomName = switchUserId + "," + beforeUser.id;
      } else {
        beforeRoomName = beforeUser.id + "," + switchUserId;
      }

      await socket.leave(beforeRoomName);
    }

    const afterUser = await this.userService.findUserByNickname(afterUserNick);

    let afterRoomName = null;

    if (afterUser.id >= switchUserId) {
      afterRoomName = switchUserId + "," + afterUser.id;
    } else {
      afterRoomName = afterUser.id + "," + switchUserId;
    }

    await socket.join(afterRoomName);
  }

  @SubscribeMessage("msgToServer")
  @UseFilters(WebSocketExceptionFilter)
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
    if (!sender) throw new WsException("No sender found");
    else if (!receiver) throw new WsException("No receiver found");

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

    this.server.to(name).emit("msgToClient", ClientPayload);
  }

  @SubscribeMessage("getRedis")
  async giveRedis(
    socket: Socket,
    payload: {
      beforeUserNick: string;
      sender: number;
      receiver: string;
    },
  ): Promise<void> {
    this.logger.verbose(
      `getRedis: ${payload.beforeUserNick}, ${payload.sender}, ${payload.receiver}`,
    );

    const beforeUser = await this.userService.findUserByNickname(
      payload.beforeUserNick,
    );

    if (payload.beforeUserNick) {
      let beforeRoomName = null;

      if (beforeUser.id >= payload.sender) {
        beforeRoomName = payload.sender + "," + beforeUser.id;
      } else {
        beforeRoomName = beforeUser.id + "," + payload.sender;
      }

      await socket.leave(beforeRoomName);
    }

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

    await socket.join(name);

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
      const chatHistory = await this.redisClient.lrange(`DM|${name}`, 0, -1);
      return chatHistory;
    } catch (error) {
      // Handle errors, log, or emit an error event to the client
      console.error("Error fetching chat history from Redis:", error);
    }
  }

  private saveMessageToRedis(
    redisClient: any,
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
  @UseFilters(WebSocketExceptionFilter)
  async enterQueue(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.verbose(`enterQueue: ${data.userId}`);
    const { userId } = data;

    if (!userId || !(await this.userService.findUserById(userId))) {
      throw new WsException("No user found");
    }

    // Store user information in Redis queue
    const userList = await this.redisClient.lrange("QM", 0, -1);
    const filteredList = userList.filter((user) => parseInt(user) === userId);

    if (filteredList.length !== 0) {
      await this.redisClient.lrem("QM", 0, userId);
      await socket.leave(`QM|${userId}`);
      //throw new WsException("User already in queue");
    } else if (filteredList) {
      await this.redisClient.lrem("QM", 0, userId);
    }
    await this.redisClient.rpush("QM", userId);

    this.logger.verbose(`QM, ${await this.redisClient.lrange("QM", 0, -1)}`);

    await socket.join(`QM|${userId}`);
    userConnectedClients.set(userId, socket);

    //this.server.to(`QM|${userId}`)
    //.emit("enteredQueue", { message: "Entered the quick match queue" });
    // Notify the user that they've entered the queue

    // Check if there are enough players in the queue to start a game (two players)

    const makeMatch = setInterval(async () => {
      const queueLength = await this.redisClient.llen("QM");
      if (queueLength >= 2) {
            const result = await this.redisClient.multi()
                                                .lpop("QM")
                                                .lpop("QM")
                                                .exec();
            const homePlayer = result[0];
            const awayPlayer = result[1];

            if (!awayPlayer)
            {
              if (homePlayer[1])
                  await this.redisClient.rpush("QM", homePlayer[1]);
              
            }
            else if (!homePlayer)
            {
              
            }
            else 
            {
              const quickMatchNum = await this.gameChannelService.findQuickMatches();
              const newGame = {
                id: 0,
                title: "QuickMatch" + quickMatchNum, // Use a unique title for each room
                gameChannelPolicy: GameChannelPolicy.PUBLIC,
                password: null,
                creatorId: parseInt(homePlayer[1].toString()),
                gameType: GameType.NORMAL,
                gameMode: GameMode.NORMAL,
                curUser: 0,
                maxUser: 2,
                gameStatus: GameStatus.READY,
              };
    
              await this.gameChannelService.createGame(newGame);

              const game = await this.gameChannelService.findOneGameChannelByTitle(
                newGame.title,
              );
    
              const gameinfo = {
                gameId: game.id,
                title: game.title,
              };
    
              this.server.to(`QM|${homePlayer[1]}`).emit("gameMatch", gameinfo);
              this.server.to(`QM|${awayPlayer[1]}`).emit("gameMatch", gameinfo);

            }
      } else if (queueLength === 0) {
        return;
      }
    }, 2000);
    socket.on("exitQueue", async () => {
      //const userList = await this.redisClient.lrange("QM", 0, -1);
      ////userList에 같은 userId가 있는지 확인
      //const filteredList = userList.filter(
      //  (user) => parseInt(user) === userId,
      //  );

      //  console.log(filteredList);

      //  if (filteredList.length === 0) {
      //    //throw new WsException("No user found");
      //  } else {
      //    await this.redisClient.lrem("QM", 0, userId);
      //    await socket.leave(`QM|${userId}`);
      //  }
      await this.redisClient.lrem("QM", 0, userId);
      this.logger.verbose(`QM, ${await this.redisClient.lrange("QM", 0, -1)}`);
      clearInterval(makeMatch);
      return;
    });
    socket.on("startGame", () => {
      clearInterval(makeMatch);
    });
  }

  @SubscribeMessage("gameInvite")
  @UseFilters(WebSocketExceptionFilter)
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
        throw new WsException("No game found");
      } else if (
        gameInfo.deleted_at !== null ||
        gameInfo.game_status !== GameStatus.READY ||
        gameInfo.cur_user !== 1
      ) {
        throw new WsException("No game found");
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
      //  throw new WsException("No game found");
      // } else if (inviteUser.id === userId) {
      //   throw new WsException("Can't invite yourself");
      // } else if (gameConnectedClients) {
      //   throw new WsException("User is already in game");
      // } else if (inviteUser.status === UserStatus.OFFLINE) {
      //   throw new WsException("User is offline");
      //} else {
      //if (gameInfo.game_channel_policy === GameChannelPolicy.PRIVATE) {
      //  await this.redisClient.hset(
      //    `GM|${gameTitle}`,
      //    `ACCESS|${userId}`,
      //    userId,
      //  );
      //}
      const inviteUserSocket = userConnectedClients.get(inviteUser.id);
      //console.log("invitedUser", inviteUserSocket.id, gameTitle, url);
      this.server.to(inviteUserSocket.id).emit("invitedUser", {
        hostNickname: (await this.userService.findUserById(userId)).nickname,
        url: url,
      });

      //}
    } catch (error) {
      throw new WsException(error);
    }
  }

  async sendMyStatus(myId: number): Promise<void | WsException> {
    try {
      
      this.logger.debug(`sendMyStatus: ${myId}`);
      const myInfo = await this.userService.findUserById(myId);
      if (!myInfo) throw new WsException("No user found");
      const myData = {
        id: myInfo.id,
        nickname: myInfo.nickname,
        avatar: myInfo.avatar,
        status: myInfo.status,
      };

      userConnectedClients.forEach(async (socket, userId) => {
        this.server.to(userId.toString()).emit("followingStatus", myData);
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
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
