import { HttpException, Logger } from "@nestjs/common";
import {
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
import { DmDto } from "./dto/dm.dto";
import { DmService } from "./dm.service";

//path, endpoint

@WebSocketGateway(83, { namespace: "dm", cors: true })
export class DmGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private static readonly logger = new Logger(DmGateway.name);

  @WebSocketServer()
  server: Server;
  constructor(
    private redisClient: Redis,
    private userService: UserService,
    private dmService: DmService,
  ) {}

  afterInit() {
    DmGateway.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(client: Socket) {
    DmGateway.logger.debug(
      `${client.id}(${client.handshake.query["username"]}) is connected!`,
    );

    // Fetch chat history from Redis and send it to the connected client
    const chats = await this.fetchChatHistory(client, this.redisClient);

    if (chats) {
      for (const idx in chats) {
        const split = chats[idx].split(":");
        this.server
          .to(client.id)
          .emit("msgToClient", { name: split[0], text: split[1] });
      }
    }
  }

  handleDisconnect(client: Socket) {
    DmGateway.logger.debug(`${client.id} is disconnected...`);
  }

  @SubscribeMessage("msgToServer")
  async handleMessage(
    client: Socket,
    payload: { sender: number; receiver: string; content: string },
  ): Promise<string> {
    //DB에 저장
    //1. UserDB에서 sender, receiver가 있는지 확인
    //sender, receiver
    const sender = await this.userService.findUserById(payload.sender);
    const receiver = await this.userService.findUserByName(payload.receiver);
    if (!sender) throw new HttpException("No sender found", 404);
    else if (!receiver) throw new HttpException("No receiver found", 404);

    //2. 둘다 있으면 저장 중복이면 저장 안함
    const name = sender.id + "," + receiver.id;
    if (!(await this.dmService.getdmchannelByName(name))) {
      const dm_channel = {
        name: name,
        created_at: new Date(),
        deleted_at: new Date(),
      };
      this.dmService.createdmchannel(dm_channel);
    }

    //3. DmUser 저장

    // Save the new message to Redis
    this.saveMessageToRedis(this.redisClient, payload);

    const payload2 = {
      payload : payload,
      name
    }
    // Broadcast the message to all connected clients
    this.server.emit("msgToClient", payload2);
    // this.server.emit("comeOn" + channel_name, comeOn);
    return name;
  }

  @SubscribeMessage("getRedis")
  async giveRedis(
    client: Socket,
  ): Promise<void> {
    const chats = await this.fetchChatHistory(client, this.redisClient);

    if (chats) {
      for (const idx in chats) {
        const split = chats[idx].split(":");
        this.server
          .to(client.id)
          .emit("msgToClient", { name: split[0], text: split[1] });
      }
    }
  }

  private async fetchChatHistory(
    client: Socket,
    redisClient: Redis,
  ): Promise<string[] | void> {
    try {
      const chatHistory = await redisClient.lrange("chatHistory", 0, -1);
      console.log(chatHistory);
      return chatHistory;
    } catch (error) {
      // Handle errors, log, or emit an error event to the client
      console.error("Error fetching chat history from Redis:", error);
      client.emit("error", "Failed to fetch chat history");
    }
  }

  private saveMessageToRedis(
    redisClient: Redis,
    payload: { sender: number; receiver: string; content: string },
  ) {
    // Save the new message to Redis

    //조건문 추가 -> 여기서 sender, receiver가 있는지 확인 후 없으면 저장 안함
    // redisClient.rpush("chatHistory", `${payload.name}: ${payload.text}`);
  }
}
