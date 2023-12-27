// import { HttpException, Logger } from "@nestjs/common";
// import {
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   OnGatewayInit,
//   SubscribeMessage,
//   WebSocketGateway,
//   WebSocketServer,
// } from "@nestjs/websockets";
// import { Server, Socket } from "socket.io";
// import { Redis } from "ioredis";

// @WebSocketGateway(80, { namespace: "dm", cors: true })
// export class DmGateway
//   implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
// {
//   private static readonly logger = new Logger(DmGateway.name);

//   @WebSocketServer()
//   server: Server;
//   constructor(private redisClient: Redis) {}

//   afterInit() {
//     DmGateway.logger.debug(`Socket Server Init Complete`);
//   }

//   async handleConnection(client: Socket) {
//     DmGateway.logger.debug(
//       `${client.id}(${client.handshake.query["username"]}) is connected!`,
//     );

//     //지금 문제는 전부 같은 채널에 들어오고 있음. 채널을 구분해야함.

//     // Fetch chat history from Redis and send it to the connected client
//     const chats = await this.fetchChatHistory(client, this.redisClient);
//     DmGateway.logger.debug(`${client.id} is handleConnection...`);
//     if (chats) {
//       DmGateway.logger.debug(`${client.id} is chats...`);
//       for (const idx in chats) {
//         const split = chats[idx].split(":");
//         this.server
//           .to(client.id)
//           .emit("msgToClient", { name: split[0], text: split[1] });
//       }
//     }
//   }

//   handleDisconnect(client: Socket) {
//     DmGateway.logger.debug(`${client.id} is disconnected...`);
//   }

//   @SubscribeMessage("msgToServer")
//   handleMessage(client: Socket, payload: { name: string; text: string }): void {
//     // Save the new message to Redis
//     this.saveMessageToRedis(this.redisClient, payload);
//     // Broadcast the message to all connected clients
//     DmGateway.logger.debug(`${client.id} is here...`);
//     this.server.emit("msgToClient", payload);
//   }

//   private async fetchChatHistory(
//     client: Socket,
//     redisClient: Redis,
//   ): Promise<string[] | void> {
//     try {
//       const chatHistory = await redisClient.lrange("chatHistory", 0, -1);
//       console.log(chatHistory);
//       return chatHistory;
//     } catch (error) {
//       // Handle errors, log, or emit an error event to the client
//       console.error("Error fetching chat history from Redis:", error);
//       client.emit("error", "Failed to fetch chat history");
//     }
//   }

//   private saveMessageToRedis(
//     redisClient: Redis,
//     payload: { name: string; text: string },
//   ) {
//     // Save the new message to Redis
//     redisClient.rpush("chatHistory", `${payload.name}: ${payload.text}`);
//   }
// }


//같은 dm room에 있는 사람들에게만 메세지를 보내는 것을 구현해야함.
import { HttpException, Logger } from "@nestjs/common";
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
import { createAdapter } from 'socket.io-redis';

//path, endpoint

@WebSocketGateway(83, { namespace: "dm", cors: true })
export class DmGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private static readonly logger = new Logger(DmGateway.name);
  //dm룸 생성



  @WebSocketServer()
  server: Server;
  wsClients = [];
  constructor(private redisClient: Redis) {}

  afterInit() {
    DmGateway.logger.debug(`Socket Server Init Complete`);
  }

  async handleConnection(client: Socket) 
  {
    DmGateway.logger.debug(
      `${client.id}(${client.handshake.query["username"]}) is connected!`,
    );
    // Fetch chat history from Redis and send it to the connected client
    const chats = await this.fetchChatHistory(client, this.redisClient);
    DmGateway.logger.debug(`${client.id} is handleConnection...`);
    if (chats) {
      DmGateway.logger.debug(`${client.id} is chats...`);
      for (const idx in chats) 
      {
        const split = chats[idx].split(":");
        if (!split[0] || !split[1]) {
          console.log("Invalid chat entry:", chats[idx]);
          continue; // Split 배열의 길이가 2가 아니거나 split[0] 또는 split[1]이 없는 경우 반복문 스킵
        }
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
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any): void 
  {
    //------------------------
    const { user_id, channel_name } = data;

    // this.server.emit("msgToClient", { name, text }); // 해당 채널로 메시지 브로드캐스트
    const comeOn = `${user_id}님이 입장했습니다.`;
    this.server.emit("comeOn" + channel_name, comeOn); // 해당 채널로 메시지 브로드캐스트
    // this.saveMessageToRedis(channel, { name, text });
    this.wsClients.push(client);
    //------------------------
    // // Save the new message to Redis
    // this.saveMessageToRedis(this.redisClient, data);
    // // Broadcast the message to all connected clients
    // DmGateway.logger.debug(`${client.id} is here...`);
    // this.server.emit("msgToClient", data);
  }

  private broadcast(event, client, message: any) {
    for (let c of this.wsClients) {
      if (client.id == c.id)
        continue;
      c.emit(event, message);
    }
  }

  @SubscribeMessage('send')
  sendMessage(@MessageBody() data: string, @ConnectedSocket() client) {
    console.log('data', data)
    const [room, nickname, message] = data;
    const payload = {
      user_id : nickname,
      text : message,
    }
    this.saveMessageToRedis(this.redisClient, payload);
    console.log('----------------------')
    console.log(`${client.id} : ${data}`);
    console.log('room', room)
    console.log('nickname', nickname)
    console.log('message', message)
    console.log('----------------------')
    this.broadcast(room, client, [nickname, message]);
  }

  
  private async fetchChatHistory(
    client: Socket,
    redisClient: Redis,
  ): Promise<string[] | void> {
    try {
      const chatHistory = await redisClient.lrange("chatHistory", 0, -1);
      console.log('chatHistory', chatHistory);
      return chatHistory;
    } catch (error) {
      // Handle errors, log, or emit an error event to the client
      console.error("Error fetching chat history from Redis:", error);
      client.emit("error", "Failed to fetch chat history");
    }
  }


  private saveMessageToRedis(
    redisClient: Redis,
    data: { user_id: string; text: string },
  ) {
    // Save the new message to Redis
    redisClient.rpush("chatHistory", `${data.user_id}: ${data.text}`);
  }

  
}
