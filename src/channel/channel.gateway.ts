import { OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// @WebSocketGateway({ namespace : 'channel' })
@WebSocketGateway(80, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
  })

export class ChannelGateWay implements OnModuleInit{
  @WebSocketServer()
  server : Server;

  // wsClients = [];

  //NestJS 애플리케이션에서 Socket.io를 사용하여 
  //서버 측 소켓 연결 이벤트를 처리하는 부분. 
  //onModuleInit() 메서드는 NestJS에서 사용되는 라이프사이클 훅 중 하나. 
  //해당 클래스가 초기화될 때 호출됩니다.
  onModuleInit() {
    //Socket.io의 서버 인스턴스에서 연결 이벤트를 처리하는 부분
    //클라이언트 측에서 소켓 연결이 발생할 때마다 이 코드가 실행
      this.server.on('connection', (socket) => {
        console.log('id', socket.id);
        console.log('onModue Connected to socket.io');
      })
  }

  //NestJS 내에서 Socket.io를 사용하여 
  //특정 메시지('nmessage')를 구독하고, 해당 메시지를 처리하는 메서드
  @SubscribeMessage('nmessage')
  connectSomeone(@MessageBody() data: any) {
    console.log(data);
    const nickname = data.nickname;
    const room = data.room;
    console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
    //emit안에 onmessage 이벤트만 가지고 있는 사람에게(클라이언트) 메세지를 보냄.
    //'onmessage'라는 이벤트로 데이터를 송신. 
    //이로 인해 클라이언트 측에서 'onmessage' 이벤트를 구독하고 있는 경우 해당 데이터를 수신.
    this.server.emit('onmessage', {
      msg: 'New Message',
      content : data,
    });
    // const [nickname, room] = data;
    // console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
    // const comeOn = `${nickname}님이 입장했습니다.`;
    // this.server.emit('comeOn' + room, comeOn);
    // this.wsClients.push(client);
  }
  

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
}


// import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

// @WebSocketGateway(80, { namespace : 'channel' })
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
