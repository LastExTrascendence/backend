import { Logger, OnModuleInit } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserDto } from "src/user/dto/user.dto";
import { channelUserDto } from "./channel_dto/channel.user.dto";
import { channels } from "./channel_entity/channels.entity";
import { ChannelsService } from "./channel.service";
import { ChannelDto, ChatChannelUserRole } from "./channel_dto/channels.dto";
import { Channel_Status } from "./channel.enum";
import { SaveOptions, RemoveOptions } from "typeorm";
import { Redis } from "ioredis";
import { Repository } from "typeorm";
import { User } from "src/user/entity/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { UserService } from "src/user/user.service";
import { channelUser } from "./channel_entity/channel.user.entity";
import { format } from "date-fns";

//방에 있는 사람들 속성

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

@WebSocketGateway(81, {
  namespace: "chat",
  cors: true,
  // cors: {
  //   origin: "http://10.19.239.198:3000",
  //   methods: ["GET", "POST"],
  //   credentials: true
  // }
})
export class ChannelGateWay {
  private logger = new Logger("ChannelGateWay");
  constructor(
    private readonly channelsService: ChannelsService,
    private userService: UserService,
    @InjectRepository(channels)
    private readonly channelRepository: Repository<channels>,
    @InjectRepository(channelUser)
    private readonly channelUserRepository: Repository<channelUser>,
    //private readonly channelUserSerivce: ChannelUserService,
    private redisClient: Redis,
  ) {}

  handleRoomCreation(roomName: string) {
    throw new Error("Method not implemented.");
  }
  @WebSocketServer()
  server: Server;

  wsClients = [];

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }
  handleConnection(Socket: Socket) {}

  handleDisconnect(Socket: Socket) {}

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
      const { userId, channelTitle } = data;

      const channelInfo = await this.channelRepository.findOne({
        where: { title: channelTitle },
      });

      const channelUsers = await this.channelUserRepository.find({
        where: { channelId: channelInfo.id },
      });

      const TotalUserInfo = [];

      for (let i = 0; i < channelUsers.length; i++) {
        let findUser = await this.userService.findUserById(
          channelUsers[i].userId,
        );
        const userInfo = {
          id: channelUsers[i].userId,
          nickname: findUser.nickname,
          avatar: findUser.avatar,
          role: channelUsers[i].role,
          mute: channelUsers[i].mute,
        };
        TotalUserInfo.push(userInfo);
      }

      //const roomInfo = await this.channelRepository.findOne({
      //  where: { title: channelTitle },
      //});
      //const userInfo = await this.userService.findUserById(userId);
      //if (!roomInfo) {
      //  const UserInfo = {
      //    id: userInfo.id,
      //    nickname: userInfo.nickname,
      //    avatar: userInfo.avatar,
      //    role: ChatChannelUserRole.CREATOR,
      //    mute: false,
      //  };
      //} else {
      //  const UserInfo = {
      //    id: user.id,
      //    nickname: user.nickname,
      //    avatar: user.avatar,
      //    role: roomInfo.Users.role,
      //    mute: false,
      //  };
      //}
      console.log(`${userId}님이 코드: ${channelTitle}방에 접속했습니다.`);
      console.log(`${userId}님이 입장했습니다.`);
      const comeOn = `${userId}님이 입장했습니다.`;
      this.server.emit("userList", TotalUserInfo);
      this.wsClients.push(Socket);
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

  //채널에 사용자 추가
  // const UserData = {
  //   user_id: "12",
  //   channel_id : channel_id,
  //   role: 'User Description',
  //   created_at: new Date(),
  //   deleted_at: new Date()
  // };
  // await this.channelUserSerivce.createuser(UserData);

  // this.channelsService.createdbchannel(channelData);

  // if (await this.channelsService.getUserschannel(channel_id, user_id))
  // {
  //   this.logger.debug(`channel_id : ${channel_id} is already exist, in getdbchannelName`);
  //     console.log('channel_id', channel_id)
  //     const channelData = {
  //       name: channel_id,
  //       type: Channel_Status.PUBLIC,
  //       description: 'Channel Description',
  //       created_at: new Date(),
  //       deleted_at: new Date()
  //     };
  //     this.channelsService.createdbchannel(channelData);
  // }

  private broadcast(event, client, message: any) {
    for (let c of this.wsClients) {
      if (client.id == c.id) continue;
      c.to(client.id).emit(event, message);
    }
  }

  //sender : number
  //content : string

  @SubscribeMessage("msgToServer")
  async sendMessage(@MessageBody() data: any, @ConnectedSocket() client) {
    //console.log("data", data)

    const senderInfo = await this.userService.findUserById(data.sender);

    this.server.to(client.id).emit("msgToClient", {
      time: showTime(data.time),
      sender: senderInfo.nickname,
      content: data.content,
    });

    //console.log("----------------------");
    //console.log(`${client.id} : ${data}`);
    //console.log("room", room);
    //console.log("nickname", nickname);
    //console.log("message", message);
    //console.log("----------------------");
    //this.broadcast(room, client, [nickname, message]);
  }
}
// export class ChannelGateWay implements OnModuleInit{
//   @WebSocketServer()
//   server : Server;

//   // wsClients = [];

//   //NestJS 애플리케이션에서 Socket.io를 사용하여
//   //서버 측 소켓 연결 이벤트를 처리하는 부분.
//   //onModuleInit() 메서드는 NestJS에서 사용되는 라이프사이클 훅 중 하나.
//   //해당 클래스가 초기화될 때 호출됩니다.
//   onModuleInit() {
//     //Socket.io의 서버 인스턴스에서 연결 이벤트를 처리하는 부분
//     //클라이언트 측에서 소켓 연결이 발생할 때마다 이 코드가 실행
//       this.server.on('connection', (socket) => {
//         console.log('id', socket.id);
//         console.log('onModue Connected to socket.io');
//       })
//   }

//   //NestJS 내에서 Socket.io를 사용하여
//   //특정 메시지('nmessage')를 구독하고, 해당 메시지를 처리하는 메서드
//   @SubscribeMessage('nmessage')
//   connectSomeone(@MessageBody() data: any) {
//     console.log(data);
//     const nickname = data.nickname;
//     const room = data.room;
//     console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
//     //emit안에 onmessage 이벤트만 가지고 있는 사람에게(클라이언트) 메세지를 보냄.
//     //'onmessage'라는 이벤트로 데이터를 송신.
//     //이로 인해 클라이언트 측에서 'onmessage' 이벤트를 구독하고 있는 경우 해당 데이터를 수신.
//     this.server.emit('onmessage', {
//       msg: 'New Message',
//       content : data,
//     });
//     // const [nickname, room] = data;
//     // console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
//     // const comeOn = `${nickname}님이 입장했습니다.`;
//     // this.server.emit('comeOn' + room, comeOn);
//     // this.wsClients.push(client);
//   }

//   private broadcast(event, client, message: any) {
//     for (let c of this.wsClients) {
//       if (client.id == c.id)
//         continue;
//       c.emit(event, message);
//     }
//   }

//   afterInit() {
//     console.log('init test'); //gateway가 실행될 때 가장 먼저 실행되는 함수이다.
//   }

//   @SubscribeMessage('send')
//   sendMessage(@MessageBody() data: string, @ConnectedSocket() client) {
//     const [room, nickname, message] = data;
//     console.log(`${client.id} : ${data}`);
//     this.broadcast(room, client, [nickname, message]);
//   }
// }

// import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

// @WebSocketGateway(83, { namespace : 'channel' })
// export class ChannelGateWay {
//   @WebSocketServer()
//   server;

//   wsClients = [];

//   @SubscribeMessage('message')
//   connectSomeone(@MessageBody() data: string, @ConnectedSocket() client) {
//     // const [nickname, room] = data;
//     // console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
//     // const comeOn = `${nickname}님이 입장했습니다.`;
//     // this.server.emit('comeOn' + room, comeOn);
//     // this.wsClients.push(client);
//   }

// //   private broadcast(event, client, message: any) {
// //     for (let c of this.wsClients) {
// //       if (client.id == c.id)
// //         continue;
// //       c.emit(event, message);
// //     }
// //   }

// //   afterInit() {
// //     console.log('init test'); //gateway가 실행될 때 가장 먼저 실행되는 함수이다.
// //   }

// //   @SubscribeMessage('send')
// //   sendMessage(@MessageBody() data: string, @ConnectedSocket() client) {
// //     const [room, nickname, message] = data;
// //     console.log(`${client.id} : ${data}`);
// //     this.broadcast(room, client, [nickname, message]);
// //   }
// }
