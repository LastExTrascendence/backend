import { Logger, OnModuleInit, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { channels } from "./entity/channels.entity";
import { ChannelsService } from "./channel.service";
import { Redis } from "ioredis";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserService } from "src/user/user.service";
import { channelUser } from "./entity/channel.user.entity";
import { format } from "date-fns";
import { ChatChannelUserRole } from "./enum/channel.enum";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { parse } from "path";

//방에 있는 사람들 속성
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

  async handleConnection(Socket: Socket) {
    this.logger.debug(`Socket Connected`);
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

    await this.channelRepository.update(
      { title: data.title },
      { curUser: channelInfo.curUser - 1 },
    );

    this.connectedClients.delete(data.userId);
  }

  //----------------------------------------------

  //private 시, 유저가 비밀번호를 입력하면, 유저의 id를 Redis에 저장한다.
  //그 후 enter요청 시 private이면, 유저의 id를 Redis에서 확인한다.

  //userId : number
  //title : string
  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    try {
      const { userId, title } = data;
      this.connectedClients.set(userId, Socket);

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const currentUserInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      if (currentUserInfo) {
        if (currentUserInfo.ban === true) {
          const targetClient = this.connectedClients.get(userId);
          targetClient.disconnect(true);
          throw new Error("밴 상태입니다.");
        }
        await this.channelRepository.update(
          { title: title },
          { curUser: channelInfo.curUser + 1 },
        );
        await this.channelUserRepository.update(
          { userId: userId, channelId: channelInfo.id },
          { createdAt: new Date(), deletedAt: null },
        );
      } else {
        const newEnterUser = {
          userId: data.userId,
          channelId: channelInfo.id,
          role:
            channelInfo.creatorId === userId
              ? ChatChannelUserRole.CREATOR
              : ChatChannelUserRole.USER,
          mute: null,
          ban: false,
          createdAt: new Date(),
          deletedAt: null,
        };
        await this.channelUserRepository.save(newEnterUser);
        await this.channelRepository.update(
          { title: title },
          { curUser: channelInfo.curUser + 1 },
        );
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
          mute: null,
        };
        TotalUserInfo.push(UserInfo);
      }

      this.server.emit("userList", TotalUserInfo);
    } catch (error) {
      console.log(error);
    }
  }

  //time : 시간
  //title : string 요청
  //sender : number
  //content : string

  @SubscribeMessage("msgToServer")
  async sendMessage(@MessageBody() data: any, @ConnectedSocket() client) {
    try {
      const senderInfo = await this.userService.findUserById(data.sender);

      const channelInfo = await this.channelRepository.findOne({
        where: { title: data.title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: data.sender, channelId: channelInfo.id },
      });

      if (userInfo.mute) {
        if (isMoreThan30SecondsAgo(userInfo.mute)) {
          await this.channelUserRepository.update(
            { userId: data.sender, channelId: channelInfo.id },
            { mute: null },
          );
          this.server.emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: data.content,
          });
        } else
          this.server.to(client.id).emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: "뮤트 상태입니다.",
          });
      } else {
        this.server.emit("msgToClient", {
          time: showTime(data.time),
          sender: senderInfo.nickname,
          content: data.content,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //changeNick : string

  //바꾼후 모든 유저 리스트를 보내준다.
  @SubscribeMessage("changeRole")
  async changeRole(@MessageBody() data: any, @ConnectedSocket() client) {
    try {
      const { userId, title, changeId } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const changeUser = await this.userService.findUserByNickname(changeId);

      const changeUserInfo = await this.channelUserRepository.findOne({
        where: { userId: changeUser.id, channelId: channelInfo.id },
      });

      if (!changeUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (changeUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("채널 생성자는 절대 권력입니다.");
      }

      if (
        (userInfo.role === ChatChannelUserRole.CREATOR ||
          userInfo.role === ChatChannelUserRole.OPERATOR) &&
        changeUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { userId: changeUserInfo.id, channelId: channelInfo.id },
          { role: ChatChannelUserRole.OPERATOR },
        );
      } else if (
        (userInfo.role === ChatChannelUserRole.CREATOR ||
          userInfo.role === ChatChannelUserRole.OPERATOR) &&
        changeUserInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        await this.channelUserRepository.update(
          { userId: changeUserInfo.id, channelId: channelInfo.id },
          { role: ChatChannelUserRole.USER },
        );
      }
      return await this.channelUserRepository.find({
        where: { channelId: channelInfo.id },
      });
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //kickNick : string
  @SubscribeMessage("kick")
  async kickSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    try {
      const { userId, title, kickId } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const kickUser = await this.userService.findUserByNickname(kickId);

      const kickUserInfo = await this.channelUserRepository.findOne({
        where: { userId: kickUser.id, channelId: channelInfo.id },
      });

      if (!kickUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      }

      if (
        userInfo.role === ChatChannelUserRole.CREATOR ||
        userInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        const targetClient = this.connectedClients.get(userId);
        targetClient.disconnect(true);
        return await this.channelUserRepository.find({
          where: { channelId: channelInfo.id },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //banNick : string
  @SubscribeMessage("ban")
  async banSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    try {
      const { userId, title, banNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const banUser = await this.userService.findUserByNickname(banNick);

      const banUserInfo = await this.channelUserRepository.findOne({
        where: { userId: banUser.id, channelId: channelInfo.id },
      });

      if (!banUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      }

      if (
        userInfo.role === ChatChannelUserRole.CREATOR ||
        userInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        await this.channelUserRepository.update(
          { userId: banUser.id, channelId: channelInfo.id },
          { ban: true },
        );
        const targetClient = this.connectedClients.get(banUser.id);
        targetClient.disconnect(true);
      }
      return await this.channelUserRepository.find({
        where: { channelId: channelInfo.id },
      });
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //muteNick : string
  @SubscribeMessage("mute")
  async muteSomeone(@MessageBody() data: any, @ConnectedSocket() client) {
    try {
      const { title, userId, muteId } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const muteUser = await this.userService.findUserByNickname(muteId);

      const muteUserInfo = await this.channelUserRepository.findOne({
        where: { userId: muteUser.id, channelId: channelInfo.id },
      });

      if (!muteUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      }

      if (
        userInfo.role === ChatChannelUserRole.CREATOR ||
        userInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        await this.channelUserRepository.update(
          { userId: muteId, channelId: channelInfo.id },
          { mute: new Date() },
        );
      } else {
        throw new Error("권한이 없습니다.");
      }
    } catch (error) {
      console.log(error);
    }
  }
}

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

function isMoreThan30SecondsAgo(targetTime: Date): boolean {
  const currentTime = new Date();
  const timeDifferenceInSeconds =
    (currentTime.getTime() - targetTime.getTime()) / 1000;

  return timeDifferenceInSeconds > 30;
}

//DM DB저장 삭제
//Channel Gateway 구조 변경(map)
//ChatChannelListDto 변경 (id : number 추가, FE => BE 시, id는 0)
//channel GateWay KICK, BAN, MUTE 구현
