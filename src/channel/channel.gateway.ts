import { Logger, OnModuleInit, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { channels } from "./channel_entity/channels.entity";
import { ChannelsService } from "./channel.service";
import { Redis } from "ioredis";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserService } from "src/user/user.service";
import { channelUser } from "./channel_entity/channel.user.entity";
import { format } from "date-fns";
import { ChatChannelUserRole } from "./channel.enum";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { parse } from "path";

//방에 있는 사람들 속성

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

@WebSocketGateway(81, {
  namespace: "chat",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class ChannelGateWay {
  private logger = new Logger("ChannelGateWay");
  constructor(
    private readonly channelsService: ChannelsService,
    private userService: UserService,
    @InjectRepository(channels)
    private readonly channelRepository: Repository<channels>,
    @InjectRepository(channelUser)
    private readonly channelUserRepository: Repository<channelUser>,
    private redisClient: Redis,
  ) {}

  @WebSocketServer()
  server: Server;

  private connectedClients: Map<number, Socket> = new Map();

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }

  //query
  //userId : number
  // title : string
  async handleConnection(client: Socket) {
    this.logger.debug(`Socket Connected`);

    const userId = Array.isArray(client.handshake.query.userId)
      ? parseInt(client.handshake.query.userId[0], 10)
      : parseInt(client.handshake.query.userId, 10);

    const title = Array.isArray(client.handshake.query.title)
      ? client.handshake.query.title[0]
      : (client.handshake.query.title as string);

    const channelInfo = await this.channelRepository.findOne({
      where: { title: title },
    });

    const userInfo = await this.channelUserRepository.findOne({
      where: { userId: userId, channelId: channelInfo.id },
    });

    this.connectedClients.set(userId, client);

    if (userInfo.ban === true) {
      const targetClient = this.connectedClients.get(userId);
      targetClient.disconnect(true);
      throw new Error("밴 상태입니다.");
    }

    //const userId = parseInt(client.handshake.query.userId, 10);
  }

  async handleDisconnect(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    this.logger.debug(`Socket Disconnected`);
    const channelInfo = await this.channelRepository.findOne({
      where: { title: data.title },
    });

    await this.channelUserRepository.update(
      { channelId: channelInfo.id, userId: data.userId },
      { deletedAt: new Date() },
    );

    this.connectedClients.delete(data.userId);
  }

  //----------------------------------------------

  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    //1. 채널 주인/ 관리자
    //2. DB에 담겨있는 채널 멤버들의 정보

    //인터페이스 배열
    try {
      const { userId, title } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const currentUserInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      if (currentUserInfo) {
        await this.channelUserRepository.update(
          { userId: userId, channelId: channelInfo.id },
          { createdAt: new Date(), deletedAt: null },
        );
      } else {
        const newEnterUser = {
          userId: data.userId,
          channelId: title.id,
          role:
            channelInfo.creatorNick === userId
              ? ChatChannelUserRole.CREATOR
              : ChatChannelUserRole.USER,
          mute: false,
          ban: false,
          createdAt: new Date(),
          deletedAt: null,
        };
        await this.channelUserRepository.save(newEnterUser);
      }

      const userInfo = await this.channelUserRepository.find({
        where: { channelId: channelInfo.id },
      });

      const TotalUserInfo = [];

      for (let i = 0; i < userInfo.length; i++) {
        const user = await this.userService.findUserById(userInfo[i].userId);
        const UserInfo = {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          role: userInfo[i].role,
          mute: false,
        };
        TotalUserInfo.push(UserInfo);
      }

      console.log("TotalUserInfo", TotalUserInfo);

      console.log(`${userId}님이 코드: ${title}방에 접속했습니다.`);
      console.log(`${userId}님이 입장했습니다.`);
      const comeOn = `${userId}님이 입장했습니다.`;
      this.server.emit("userList", TotalUserInfo);
    } catch (error) {
      console.log(error);
    }

    //방에 없다

    //try {
    //  if (!roomInfo) {
    //    await this.redisClient.rpush(channelTitle, userId);
    //  } else if (roomInfo.length > 2) {
    //    throw new Error("방이 꽉 찼습니다.");
    //  } else if (roomInfo && roomInfo.includes(userId)) {
    //    throw new Error("이미 방에 있습니다.");
    //  }
    //} catch (error) {
    //  console.log(error);
    //}

    //this.channelUserSerivce.createuser(channelUser);
  }

  //title : string 요청

  //sender : number
  //content : string

  @SubscribeMessage("msgToServer")
  async sendMessage(@MessageBody() data: any, @ConnectedSocket() client) {
    const senderInfo = await this.userService.findUserById(data.sender);

    const channelInfo = await this.channelRepository.findOne({
      where: { title: data.title },
    });

    const userInfo = await this.channelUserRepository.findOne({
      where: { userId: data.sender, channelId: channelInfo.id },
    });

    if (userInfo.mute === true) {
      throw new Error("뮤트 상태입니다.");
    }

    this.server.emit("msgToClient", {
      time: showTime(data.time),
      sender: senderInfo.nickname,
      content: data.content,
    });
  }

  @SubscribeMessage("kick")
  async kickSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    const { userId, title } = data;

    const channelInfo = await this.channelRepository.findOne({
      where: { title: title },
    });

    const userInfo = await this.channelUserRepository.findOne({
      where: { userId: userId, channelId: channelInfo.id },
    });

    if (
      userInfo.role === ChatChannelUserRole.CREATOR ||
      userInfo.role === ChatChannelUserRole.OPERATOR
    ) {
      const targetClient = this.connectedClients.get(userId);
      targetClient.disconnect(true);
    } else {
      throw new Error("방장이 아닙니다.");
    }
  }

  @SubscribeMessage("ban")
  async banSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    const { userId, title } = data;

    const channelInfo = await this.channelRepository.findOne({
      where: { title: title },
    });

    const userInfo = await this.channelUserRepository.findOne({
      where: { userId: userId, channelId: channelInfo.id },
    });

    if (
      userInfo.role === ChatChannelUserRole.CREATOR ||
      userInfo.role === ChatChannelUserRole.OPERATOR
    ) {
      await this.channelUserRepository.update(
        { userId: userId, channelId: channelInfo.id },
        { ban: true },
      );
      const targetClient = this.connectedClients.get(userId);
      targetClient.disconnect(true);
    } else {
      throw new Error("방장이 아닙니다.");
    }
  }

  @SubscribeMessage("mute")
  async muteSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    const { userId, title } = data;

    const channelInfo = await this.channelRepository.findOne({
      where: { title: title },
    });

    const userInfo = await this.channelUserRepository.findOne({
      where: { userId: userId, channelId: channelInfo.id },
    });

    if (
      userInfo.role === ChatChannelUserRole.CREATOR ||
      userInfo.role === ChatChannelUserRole.OPERATOR
    ) {
      await this.channelUserRepository.update(
        { userId: userId, channelId: channelInfo.id },
        { mute: true },
      );
    } else {
      throw new Error("방장이 아닙니다.");
    }
  }
}

//DM DB저장 삭제
//Channel Gateway 구조 변경(map)
//ChatChannelListDto 변경 (id : number 추가, FE => BE 시, id는 0)
//channel GateWay KICK, BAN, MUTE 구현
