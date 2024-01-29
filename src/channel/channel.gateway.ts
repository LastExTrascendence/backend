import {
  Inject,
  Logger,
  OnModuleInit,
  UseGuards,
  forwardRef,
} from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Channels } from "./entity/channels.entity";
import { ChannelsService } from "./channel.service";
import { IsNull, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserService } from "src/user/user.service";
import { ChannelUser } from "./entity/channel.user.entity";
import { format } from "date-fns";
import { ChatChannelPolicy, ChatChannelUserRole } from "./enum/channel.enum";
import { JWTWebSocketGuard } from "src/auth/jwt/jwtWebSocket.guard";
import { RedisService } from "src/commons/redis-client.service";

// channelConnectedClients를 export 해서 다른 곳에서도 사용할 수 있도록 한다.
export const channelConnectedClients: Map<number, Socket> = new Map();

//방에 있는 사람들 속성
@WebSocketGateway(81, {
  namespace: "chat",
  cors: true,
})
@UseGuards(JWTWebSocketGuard)
export class ChannelGateWay {
  private logger = new Logger("ChannelGateWay");
  constructor(
    @InjectRepository(Channels)
    private readonly channelRepository: Repository<Channels>,
    @InjectRepository(ChannelUser)
    private readonly channelUserRepository: Repository<ChannelUser>,
    private redisClient: RedisService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }

  async handleConnection(Socket: Socket) {
    this.logger.debug(`Socket Connected`);
  }

  handleDisconnect(socket: Socket) {
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

      this.logger.debug(`enter ${userId} ${title}`);

      let channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      if (channelConnectedClients.has(userId)) {
        //해당 유저가 다른 채널에 있다면 다른 채널의 소켓 통신을 끊어버림
        const targetClient = channelConnectedClients.get(userId);
        targetClient.disconnect(true);
        channelConnectedClients.delete(data.userId);
        const exChannelUserInfo = await this.channelUserRepository.findOne({
          where: { user_id: userId, deleted_at: IsNull() },
        });
        const exChannelInfo = await this.channelRepository.findOne({
          where: { id: exChannelUserInfo.channel_id },
        });
        await this.channelUserRepository.update(
          { user_id: userId, deleted_at: IsNull() },
          { deleted_at: new Date() },
        );
        await this.updateCurUser(
          exChannelInfo.title,
          exChannelUserInfo.channel_id,
        );
        channelInfo = await this.channelRepository.findOne({
          where: { title: title },
        });
      }

      if (!channelInfo) {
        socket.disconnect(true);
        throw new Error("채널을 찾을 수 없습니다.");
      }

      const currentUserInfo = await this.channelUserRepository.findOne({
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      await socket.join(channelInfo.id.toString());
      //this.server.socketsJoin(channelInfo.id.toString());
      channelConnectedClients.set(userId, socket);

      //입장불가
      //1. 비밀번호 입력자가 아닌 경우
      //2. 방의 인원수가 꽉 찬 경우
      //3. 벤 상태인 경우

      if (channelInfo.channel_policy === ChatChannelPolicy.PRIVATE) {
        const isPasswordCorrect = await this.redisClient.hgetall(
          `CH|${channelInfo.title}`,
        );

        const passwordValidate = isPasswordCorrect
          ? Object.keys(isPasswordCorrect).filter((key) =>
              key.startsWith("ACCESS"),
            )
          : null;

        //isPasswordCorrect 중에 ACCESS로 시작하는 value값만 가져온다.

        //ACCESS 대상이 아닌경우
        if (!passwordValidate) {
          const targetClient = channelConnectedClients.get(userId);
          targetClient.disconnect(true);
          socket.leave(channelInfo.id.toString());
          channelConnectedClients.delete(data.userId);
          return;
        }
      } else if (channelInfo.cur_user === channelInfo.max_user) {
        //방이 꽉 찬 경우
        const targetClient = channelConnectedClients.get(userId);
        targetClient.disconnect(true);
        socket.leave(channelInfo.id.toString());
        channelConnectedClients.delete(data.userId);
        return;
      }

      const checkAccesableUser = await this.channelUserRepository.findOne({
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      if (checkAccesableUser) {
        if (checkAccesableUser.ban === true) {
          const targetClient = channelConnectedClients.get(userId);
          targetClient.disconnect(true);
          socket.leave(channelInfo.id.toString());
          channelConnectedClients.delete(data.userId);
          return;
        }
      }

      if (currentUserInfo) {
        if (currentUserInfo.role === ChatChannelUserRole.CREATOR) {
          await this.channelUserRepository.update(
            { user_id: userId, channel_id: channelInfo.id },
            { role: ChatChannelUserRole.CREATOR, deleted_at: null },
          );
        } else {
          await this.channelUserRepository.update(
            { user_id: userId, channel_id: channelInfo.id },
            { role: ChatChannelUserRole.USER, deleted_at: null },
          );
        }
      } else {
        const newEnterUser = {
          user_id: data.userId,
          channel_id: channelInfo.id,
          role:
            channelInfo.creator_id === userId
              ? ChatChannelUserRole.CREATOR
              : ChatChannelUserRole.USER,
          mute: null,
          ban: false,
          created_at: new Date(),
          deleted_at: null,
        };
        await this.channelUserRepository.save(newEnterUser);
      }
      //현재 채널의 인원수를 업데이트 한다.
      await this.updateCurUser(title, channelInfo.id);

      //현재 입장한 유저의 정보를 보내준다.
      await this.sendUserList(userId, channelInfo.id, socket);
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
        where: { user_id: data.sender, channel_id: channelInfo.id },
      });

      if (userInfo.mute) {
        if (isMoreThan30SecondsAgo(userInfo.mute)) {
          await this.channelUserRepository.update(
            { user_id: data.sender, channel_id: channelInfo.id },
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
      this.logger.debug(`changeRoleUser`);
      const { userId, title, changeNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      const changeUser = await this.userService.findUserByNickname(changeNick);

      const changeUserInfo = await this.channelUserRepository.findOne({
        where: { user_id: changeUser.id, channel_id: channelInfo.id },
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
          { user_id: changeUser.id, channel_id: channelInfo.id },
          { role: ChatChannelUserRole.OPERATOR },
        );
      } else if (
        userInfo.role === ChatChannelUserRole.CREATOR &&
        changeUserInfo.role === ChatChannelUserRole.OPERATOR
      ) {
        await this.channelUserRepository.update(
          { user_id: changeUser.id, channel_id: channelInfo.id },
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
      this.logger.debug(`kickUser`);
      const { userId, title, kickNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      const kickUser = await this.userService.findUserByNickname(kickNick);

      const kickUserInfo = await this.channelUserRepository.findOne({
        where: { user_id: kickUser.id, channel_id: channelInfo.id },
      });

      if (!userInfo || !kickUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (kickUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        await this.channelUserRepository.update(
          { user_id: kickUser.id, channel_id: channelInfo.id },
          { deleted_at: new Date() },
        );
        const targetClient = channelConnectedClients.get(kickUser.id);
        targetClient.disconnect(true);
        //socket.leave(channelInfo.id.toString());
        channelConnectedClients.delete(kickUser.id);
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        kickUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { user_id: kickUser.id, channel_id: channelInfo.id },
          { deleted_at: new Date() },
        );
        const targetClient = channelConnectedClients.get(kickUser.id);
        targetClient.disconnect(true);
        //socket.leave(channelInfo.id.toString());
        channelConnectedClients.delete(kickUser.id);
      }

      this.updateCurUser(channelInfo.title, channelInfo.id);
      this.sendUserList(userId, channelInfo.id, socket);
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
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      const banUser = await this.userService.findUserByNickname(banNick);

      const banUserInfo = await this.channelUserRepository.findOne({
        where: { user_id: banUser.id, channel_id: channelInfo.id },
      });

      if (!userInfo || !banUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (banUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        await this.channelUserRepository.update(
          { user_id: banUser.id, channel_id: channelInfo.id },
          { ban: true, deleted_at: new Date() },
        );
        const targetClient = channelConnectedClients.get(banUser.id);
        targetClient.disconnect(true);
        //socket.leave(channelInfo.id.toString());
        channelConnectedClients.delete(banUser.id);
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        banUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { user_id: banUser.id, channel_id: channelInfo.id },
          { ban: true, deleted_at: new Date() },
        );
        const targetClient = channelConnectedClients.get(banUser.id);
        targetClient.disconnect(true);
        //socket.leave(channelInfo.id.toString());
        channelConnectedClients.delete(banUser.id);
      }
      this.updateCurUser(channelInfo.title, channelInfo.id);

      this.sendUserList(data.userId, channelInfo.id, socket);
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
      this.logger.debug(`muteUser`);
      const { title, userId, muteNick } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: title },
      });

      const userInfo = await this.channelUserRepository.findOne({
        where: { user_id: userId, channel_id: channelInfo.id },
      });

      const muteUser = await this.userService.findUserByNickname(muteNick);

      const muteUserInfo = await this.channelUserRepository.findOne({
        where: { user_id: muteUser.id, channel_id: channelInfo.id },
      });

      if (!userInfo || !muteUserInfo) {
        throw new Error("유저를 찾을 수 없습니다.");
      } else if (muteUserInfo.role === ChatChannelUserRole.CREATOR) {
        throw new Error("은인에게 총을 겨누는건 잘못된 행동입니다.");
      }

      if (userInfo.role === ChatChannelUserRole.CREATOR) {
        await this.channelUserRepository.update(
          { user_id: muteUser.id, channel_id: channelInfo.id },
          { mute: new Date() },
        );
      } else if (
        userInfo.role === ChatChannelUserRole.OPERATOR &&
        muteUserInfo.role === ChatChannelUserRole.USER
      ) {
        await this.channelUserRepository.update(
          { user_id: muteUser.id, channel_id: channelInfo.id },
          { ban: true },
        );
      }

      this.sendUserList(data.userId, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("leaveChannel")
  async leaveChannel(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      this.logger.debug(`leaveChannel`);
      const channelInfo = await this.channelRepository.findOne({
        where: { id: data.channelId },
      });

      await this.channelUserRepository.update(
        { channel_id: channelInfo.id, user_id: data.userId },
        { deleted_at: new Date() },
      );
      socket.leave(channelInfo.id.toString());
      channelConnectedClients.delete(data.userId);
      this.updateCurUser(channelInfo.title, data.channelId);

      this.sendUserList(data.userId, channelInfo.id, socket);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserList(userId: number, channelId: number, socket: Socket) {
    this.logger.debug(`sendUserList ${userId} ${channelId}`);
    const userInfo = await this.channelUserRepository.find({
      where: { channel_id: channelId, deleted_at: IsNull() },
      order: { created_at: "ASC" },
    });

    const TotalUserInfo = [];

    for (let i = 0; i < userInfo.length; i++) {
      const user = await this.userService.findUserById(userInfo[i].user_id);
      const UserInfo = {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        role: userInfo[i].role,
        mute: null,
      };
      TotalUserInfo.push(UserInfo);
    }

    this.server.to(channelId.toString()).emit("userList", TotalUserInfo);
  }

  async updateCurUser(title: string, channelId: number) {
    //channelUser에서 channelId에 해당하고, deleted_at이 null인 유저의 수를 구한다.
    const currentUserNumber = await this.channelUserRepository.find({
      where: { channel_id: channelId, deleted_at: IsNull() },
    });

    await this.channelRepository.update(
      { title: title },
      { cur_user: currentUserNumber.length },
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
