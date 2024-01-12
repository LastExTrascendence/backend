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
import { ChatChannelPolicy, ChatChannelUserRole } from "./enum/channel.enum";
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
  }

  //userId : number
  //title : string
  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { userId, title } = data;

      //해당 유저가 다른 채널에 있다면 다른 채널의 소켓 통신을 끊어버림
      if (this.connectedClients.has(userId)) {
        const targetClient = this.connectedClients.get(userId);
        targetClient.disconnect(true);
        this.connectedClients.delete(data.userId);
      }

      //해당 유저를 채널에 넣는 로직
      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const currentUserInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      //해당 유저가 처음 들어왔는지, 아니면 다시 들어온건지 확인

      if (currentUserInfo) {
        if (currentUserInfo.role === ChatChannelUserRole.CREATOR) {
          await this.channelUserRepository.update(
            { userId: userId, channelId: channelInfo.id },
            { role: ChatChannelUserRole.CREATOR, deletedAt: null },
          );
        } else {
          await this.channelUserRepository.update(
            { userId: userId, channelId: channelInfo.id },
            { role: ChatChannelUserRole.USER, deletedAt: null },
          );
        }
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
      }

      socket.join(channelInfo.id.toString());
      this.connectedClients.set(userId, socket);

      //입장불가
      //1. 비밀번호 입력자가 아닌 경우
      //2. 방의 인원수가 꽉 찬 경우
      //3. 벤 상태인 경우

      const checkAccesableUser = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      if (channelInfo.channelPolicy === ChatChannelPolicy.PRIVATE) {
        const isPasswordCorrect = await this.redisClient.lrange(
          `CH|${channelInfo.title}`,
          0,
          -1,
        );

        //isPasswordCorrect 중에 ACCESS로 시작하는 value값만 가져온다.
        const filter = isPasswordCorrect.filter((value) =>
          value.startsWith("ACCESS|"),
        );

        //ACCESS 대상이 아닌경우
        if (!filter) {
          const targetClient = this.connectedClients.get(userId);
          targetClient.disconnect(true);
          socket.leave(channelInfo.id.toString());
          this.connectedClients.delete(data.userId);
        }
        //비밀번호가 맞지 않는 경우
        //밴 상태인 경우
      } else if (
        channelInfo.curUser > channelInfo.maxUser ||
        checkAccesableUser.ban === true
      ) {
        const targetClient = this.connectedClients.get(userId);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        this.connectedClients.delete(data.userId);
      }

      //현재 입장한 유저의 정보를 보내준다.
      this.sendUserList(userId, channelInfo.id, socket);

      //현재 채널의 인원수를 업데이트 한다.
      this.updateCurUser(title, channelInfo.id);
    } catch (error) {
      console.log(error);
    }
  }

  //time : 시간
  //title : string 요청
  //sender : number
  //content : string

  @SubscribeMessage("msgToServer")
  async sendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
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
          this.server.to(channelInfo.id.toString()).emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: data.content,
          });
        } else
          this.server.to(channelInfo.id.toString()).emit("msgToClient", {
            time: showTime(data.time),
            sender: senderInfo.nickname,
            content: "뮤트 상태입니다.",
          });
      } else {
        this.server.to(channelInfo.id.toString()).emit("msgToClient", {
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
  @SubscribeMessage("changeRoleUser")
  async changeRole(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { userId, title, changeNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const changeUser = await this.userService.findUserByNickname(changeNick);

      const changeUserInfo = await this.channelUserRepository.findOne({
        where: { userId: changeUser.id, channelId: channelInfo.id },
      });

      if (!changeUserInfo || !userInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (changeUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("집안 싸움은 불법입니다.");
      }

      if (
        userInfo.role === ChatChannelUserRole.CREATOR &&
        changeUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { userId: changeUser.id, channelId: channelInfo.id },
          { role: ChatChannelUserRole.OPERATOR },
        );
      } else if (
        userInfo.role === ChatChannelUserRole.CREATOR &&
        changeUserInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        await this.channelUserRepository.update(
          { userId: changeUser.id, channelId: channelInfo.id },
          { role: ChatChannelUserRole.USER },
        );
      }
      await this.sendUserList(userId, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //kickNick : string
  @SubscribeMessage("kickUser")
  async kickSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { userId, title, kickName } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const kickUser = await this.userService.findUserByNickname(kickName);

      const kickUserInfo = await this.channelUserRepository.findOne({
        where: { userId: kickUser.id, channelId: channelInfo.id },
      });

      if (!userInfo || !kickUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (kickUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        const targetClient = this.connectedClients.get(kickUserInfo.id);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        this.connectedClients.delete(kickUserInfo.id);
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        kickUserInfo.role === ChatChannelUserRole.USER
      ) {
        const targetClient = this.connectedClients.get(kickUserInfo.id);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        this.connectedClients.delete(kickUserInfo.id);
      }

      this.sendUserList(userId, channelInfo.id, socket);

      this.updateCurUser(channelInfo.title, data);
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //banNick : string
  @SubscribeMessage("banUser")
  async banSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
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

      if (!userInfo || !banUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (banUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        await this.channelUserRepository.update(
          { userId: banUser.id, channelId: channelInfo.id },
          { ban: true },
        );
        const targetClient = this.connectedClients.get(banUserInfo.id);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        this.connectedClients.delete(banUserInfo.id);
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        banUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { userId: banUser.id, channelId: channelInfo.id },
          { ban: true },
        );
        const targetClient = this.connectedClients.get(banUserInfo.id);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        this.connectedClients.delete(banUserInfo.id);
      }

      this.sendUserList(data.userId, channelInfo.id, socket);

      this.updateCurUser(channelInfo.title, data);
    } catch (error) {
      console.log(error);
    }
  }

  //title : string
  //userId : number
  //muteNick : string
  @SubscribeMessage("muteUser")
  async muteSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const { title, userId, muteNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { userId: userId, channelId: channelInfo.id },
      });

      const muteUser = await this.userService.findUserByNickname(muteNick);

      const muteUserInfo = await this.channelUserRepository.findOne({
        where: { userId: muteUser.id, channelId: channelInfo.id },
      });

      if (!userInfo || !muteUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (muteUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        await this.channelUserRepository.update(
          { userId: muteUser.id, channelId: channelInfo.id },
          { mute: new Date() },
        );
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        muteUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { userId: muteUser.id, channelId: channelInfo.id },
          { ban: true },
        );
      }

      this.sendUserList(data.userId, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("leaveChannelUser")
  async leaveChannel(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const channelInfo = await this.channelRepository.findOne({
        where: { id: data.channelId },
      });

      await this.channelUserRepository.update(
        { channelId: channelInfo.id, userId: data.userId },
        { deletedAt: new Date() },
      );
      socket.leave(channelInfo.id.toString());
      this.connectedClients.delete(data.userId);

      this.sendUserList(data.userId, channelInfo.id, socket);

      this.updateCurUser(channelInfo.title, data.channelId);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserList(userId: number, channelId: number, socket: Socket) {
    const userInfo = await this.channelUserRepository.find({
      where: { channelId: channelId, deletedAt: null },
      order: { createdAt: "ASC" },
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
  }

  async updateCurUser(_title: string, _channelId: number) {
    const currentUserNumber = await this.channelUserRepository.find({
      where: { channelId: _channelId, deletedAt: null },
    });

    await this.channelRepository.update(
      { title: _title },
      { curUser: currentUserNumber.length },
    );
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
