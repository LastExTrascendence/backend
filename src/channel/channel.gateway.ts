// import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

// @WebSocketGateway(80, { namespace : 'channel' })
// export class ChatGateWay {
//   @WebSocketServer()
//   server;

//   wsClients = [];

//   @SubscribeMessage('message')
//   connectSomeone(@MessageBody() data: string, @ConnectedSocket() client) {
//     const [nickname, room] = data;
//     console.log(`${nickname}님이 코드: ${room}방에 접속했습니다.`);
//     const comeOn = `${nickname}님이 입장했습니다.`;
//     this.server.emit('comeOn' + room, comeOn);
//     this.wsClients.push(client);
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
