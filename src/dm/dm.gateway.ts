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


@WebSocketGateway(80, { namespace: "dm", cors: true })
export class DmGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private static readonly logger = new Logger(DmGateway.name);

  @WebSocketServer()
  server: Server;
  constructor(private redisClient: Redis) {}

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
  handleMessage(client: Socket, payload: { name: string; text: string }): void {
    // Save the new message to Redis
    this.saveMessageToRedis(this.redisClient, payload);
    // Broadcast the message to all connected clients
    this.server.emit("msgToClient", payload);
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
    payload: { name: string; text: string },
  ) {
    // Save the new message to Redis
    redisClient.rpush("chatHistory", `${payload.name}: ${payload.text}`);
  }
}