import { HttpException, Inject, Logger, UseGuards } from "@nestjs/common";
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
import { Repository } from "typeorm";
import { UserFriend } from "./entity/user.friend.entity";
import * as config from "config";

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

  @WebSocketServer()
  server: Server;
  constructor(
    private redisClient: Redis,
    private userService: UserService,
    @InjectRepository(User)
    private userFriendRepository: Repository<UserFriend>,
  ) {}

  afterInit() {
    this.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(socket: Socket) {
    this.logger.verbose(
      `${socket.id}(${socket.handshake.query["username"]}) is connected!`,
    );
  }

  handleDisconnect(socket: Socket) {
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

    socket.join(name);
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
    const chats = await this.fetchChatHistory(payload, this.redisClient);

    const receiver = await this.userService.findUserByNickname(
      payload.receiver,
    );

    let name = null;

    if (payload.sender >= receiver.id) {
      name = receiver.id + "," + payload.sender;
    } else {
      name = payload.sender + "," + receiver.id;
    }

    //객체 배열로 변경
    const totalMessages = [];

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

          totalMessages.push(message);
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
          totalMessages.push(message);
        }
      }
    }
    socket.join(name);
    //console.log("totalMessages", totalMessages);
    this.server.to(name).emit("msgToClient", totalMessages);
  }

  private async fetchChatHistory(
    payload: { sender: number; receiver: string },
    redisClient: Redis,
  ): Promise<string[] | void> {
    try {
      const receiverId = await this.userService.findUserByNickname(
        payload.receiver,
      );

      let name = null;
      if (payload.sender > receiverId.id) {
        name = receiverId.id + "," + payload.sender;
      } else {
        name = payload.sender + "," + receiverId.id;
      }
      const chatHistory = await redisClient.lrange(`DM|${name}`, 0, -1);
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
    const { userId } = data;

    // Store user information in Redis queue
    await this.redisClient.rpush("QM", userId);

    // Notify the user that they've entered the queue
    socket
      .to(socket.id)
      .emit("enteredQueue", { message: "Entered the quick match queue" });

    socket.join(`QM|${userId}`);

    // Check if there are enough players in the queue to start a game (two players)
    const queueLength = await this.redisClient.llen("QM");

    if (queueLength >= 2) {
      // Dequeue the first two players from the queue
      const homePlayer = await this.redisClient.lpop("QM");
      const awayPlayer = await this.redisClient.lpop("QM");

      const homePlayerInfo = await this.userService.findUserById(
        parseInt(homePlayer),
      );
      const awayPlayerInfo = await this.userService.findUserById(
        parseInt(awayPlayer),
      );

      // Create a game instance or use existing logic to set up a game with player1 and player2

      // Notify players that the game is starting and provide opponent information
      const gameStartData = {
        homePlayer: {
          id: homePlayer,
          nickname: homePlayerInfo.nickname,
          avatar: homePlayerInfo.avatar,
        },
        awayPlayer: {
          id: awayPlayer,
          nickname: awayPlayerInfo.nickname,
          avatar: awayPlayerInfo.avatar,
        },
      };

      // Emit an event to start the game for both players
      this.server.to(`QM|${homePlayer}`).emit("startGame", gameStartData);
      this.server.to(`QM|${awayPlayer}`).emit("startGame", gameStartData);
    } else {
      // There is an odd number of players, wait for another player to join
      socket.to(socket.id).emit("waitingForOpponent", {
        message: "Waiting for another player to join",
      });
    }
  }
}
