import { HttpException, Logger, UseGuards } from "@nestjs/common";
import {
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

import { DmService } from "./dm.service";
import { format } from "date-fns";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";

//path, endpoint

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

@WebSocketGateway(83, { namespace: "dm", cors: true })
@UseGuards(JWTWebSocketGuard)
export class DmGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private logger = new Logger(DmGateway.name);

  @WebSocketServer()
  server: Server;
  constructor(
    private redisClient: Redis,
    private userService: UserService,
    private dmService: DmService,
  ) {}

  afterInit() {
    this.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(client: Socket) {
    this.logger.verbose(
      `${client.id}(${client.handshake.query["username"]}) is connected!`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.verbose(`${client.id} is disconnected...`);
  }

  @SubscribeMessage("msgToServer")
  async handleMessage(
    @MessageBody()
    payload: {
      time: Date;
      sender: number;
      receiver: string;
      content: string;
    },
  ): Promise<void> {
    this.logger.debug(`Received message: ${payload.content}`);
    //DB에 저장
    //1. UserDB에서 sender, receiver가 있는지 확인
    //sender, receiver
    const sender = await this.userService.findUserById(payload.sender);
    const receiver = await this.userService.findUserByNickname(
      payload.receiver,
    );
    if (!sender) throw new HttpException("No sender found", 404);
    else if (!receiver) throw new HttpException("No receiver found", 404);

    //2. 둘다 있으면 저장 중복이면 저장 안함

    let name = null;

    if (sender.id > receiver.id) {
      name = receiver.id + "," + sender.id;
    } else {
      name = sender.id + "," + receiver.id;
    }

    if (!(await this.dmService.getdmchannelByName(name))) {
      const dm_channel = {
        name: name,
        created_at: payload.time,
        deleted_at: null,
      };
      this.dmService.createdmchannel(dm_channel);
    }

    //3. Dm 메시지 저장

    // Save the new message to Redis
    const RedisPayload = {
      name: name,
      time: showTime(payload.time),
      sender: sender.nickname,
      receiver: receiver.nickname,
      content: payload.content,
    };

    this.saveMessageToRedis(this.redisClient, RedisPayload);

    const ClientPayload = {
      time: RedisPayload.time,
      sender: RedisPayload.sender,
      receiver: RedisPayload.receiver,
      content: RedisPayload.content,
    };

    // Broadcast the message to all connected clients
    this.server.emit("msgToClient", ClientPayload);
    // this.server.emit("comeOn" + channel_name, comeOn);
    return name;
  }

  //interface Message {
  //  sender: number; // mystate id
  //  receiver: string; // receiver nickname
  //  content: string; //
  //}

  @SubscribeMessage("getRedis")
  async giveRedis(
    client: Socket,
    payload: {
      sender: number;
      receiver: string;
    },
  ): Promise<void> {
    const chats = await this.fetchChatHistory(payload, this.redisClient);

    const receiver = await this.userService.findUserByNickname(
      payload.receiver,
    );

    //객체 배열로 변경

    if (chats) {
      for (const idx in chats) {
        const split = chats[idx].split("|");
        if (split.length > 4)
          this.server.to(client.id).emit("msgToClient", {
            time: split[0],
            sender: split[1],
            receiver: split[2],
            content: split.slice(3 - split.length).join("|"),
          });
        else {
          this.server.to(client.id).emit("msgToClient", {
            time: split[0],
            sender: split[1],
            receiver: split[2],
            content: split[3],
          });
        }
      }
    }
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
      const chatHistory = await redisClient.lrange(`${name}`, 0, -1);
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
      sender: string;
      receiver: string;
      content: string;
    },
  ) {
    // Save the new message to Redis
    //조건문 추가 -> 여기서 sender, receiver가 있는지 확인 후 없으면 저장 안함
    //time:sender:receiver:content

    redisClient.rpush(
      `${payload.name}`,
      `${payload.time}|${payload.sender}|${payload.receiver}|${payload.content}`,
    );
  }
}
