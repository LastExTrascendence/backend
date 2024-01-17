import { HttpException, Logger, UseGuards } from "@nestjs/common";
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
import { GameChannel } from "src/game/entity/game.channel.entity";
import { UserStatus } from "./entity/user.enum";
import { connectedClients } from "src/game/game.gateway";
import { GameChannelService } from "src/game/game.channel.service";

//path, endpoint

@WebSocketGateway(config.get("FE").get("dm_port"), {
  namespace: "user",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class UserGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private logger = new Logger(UserGateway.name);
  private connectedClients: Map<number, Socket> = new Map();

  @WebSocketServer()
  server: Server;
  constructor(
    private redisClient: Redis,
    private userService: UserService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserFriend)
    private userFriendRepository: Repository<UserFriend>,
    @InjectRepository(GameChannel)
    private gameChannelRepository: Repository<GameChannel>,
    private gameChannelService: GameChannelService,
  ) {}

  afterInit() {
    this.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(socket: Socket) {
    //userId 필요함
    //this.connectedClients.set(socket.handshake.query["userId"], socket);
    //이미 들어온 유저 까투
    this.logger.verbose(
      `${socket.id}(${socket.handshake.query["username"]}) is connected!`,
    );
  }

  handleDisconnect(socket: Socket) {
    //this.connectedClients.delete(socket.handshake.query["userId"]);
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

    if (this.connectedClients.has(userId)) {
      const socket = this.connectedClients.get(userId);
      socket.disconnect();
      throw new HttpException("User already in queue", 400);
    }

    this.server.socketsJoin(`QM|${userId}`);
    this.connectedClients.set(userId, socket);

    //this.server.to(`QM|${userId}`)
    //.emit("enteredQueue", { message: "Entered the quick match queue" });
    // Notify the user that they've entered the queue

    // Check if there are enough players in the queue to start a game (two players)

    const makeMatch = setInterval(async () => {
      const queueLength = await this.redisClient.llen("QM");
      if (queueLength >= 2) {
        const quickMatchNum = await this.gameChannelRepository.find({
          where: { title: Like(`%Quick Match#%`), deleted_at: IsNull() },
        });
        // Dequeue the first two players from the queue
        const homePlayer = await this.redisClient.lpop("QM");
        const awayPlayer = await this.redisClient.lpop("QM");

        const newGame = {
          id: 0,
          title: "Quick Match#" + quickMatchNum,
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

  @SubscribeMessage("sendInviteList")
  async sendInviteList(@ConnectedSocket() socket: Socket) {
    try {
      //userList에 같은 userId가 있는지 확인
      const userList = await this.userRepository.find({
        where: { status: UserStatus.ONLINE },
      });

      if (userList.length === 0) {
        throw new HttpException("No user found", 404);
      } else {
        const vaildInviteList = [];

        for (const idx in userList) {
          const connectedUser = connectedClients.has(userList[idx].id);
          if (!connectedUser) {
            const userInfo = {
              nickname: userList[idx].nickname,
            };
            vaildInviteList.push(userInfo);
          }
        }

        this.server.to(socket.id).emit("inviteList", vaildInviteList);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("inviteUser")
  async inviteUser(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { userId, inviteUserNick } = data;

      const inviteUser =
        await this.userService.findUserByNickname(inviteUserNick);

      const connectedUser = this.connectedClients.get(inviteUser.id);

      if (!inviteUser) {
        throw new HttpException("No user found", 404);
      } else if (inviteUser.id === userId) {
        throw new HttpException("Can't invite yourself", 400);
      } else if (inviteUser.status === UserStatus.OFFLINE) {
        throw new HttpException("User is offline", 400);
      } else if (connectedUser) {
        throw new HttpException("User is already in game", 400);
      } else {
        const quickMatchNum = await this.gameChannelRepository.find({
          where: { title: Like(`%Quick Match#%`), deleted_at: IsNull() },
        });

        const newGame = {
          id: 0,
          title: "Quick Match#" + quickMatchNum,
          gameChannelPolicy: GameChannelPolicy.PUBLIC,
          password: null,
          creatorId: parseInt(userId),
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

        this.server.to(`QM|${userId}`).emit("gameMatch");
        this.server.to(`QM|${inviteUser.id}`).emit("gameMatch");
      }
    } catch (error) {
      console.log(error);
    }
  }
}
