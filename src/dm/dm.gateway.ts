//import {
//  ConnectedSocket,
//  MessageBody,
//  OnGatewayConnection,
//  OnGatewayDisconnect,
//  OnGatewayInit,
//  SubscribeMessage,
//  WebSocketGateway,
//  WebSocketServer,
//  WsException,
//} from "@nestjs/websockets";
//import { Server } from "http";
//import { Socket } from "socket.io";
//import { AuthService } from "src/auth/auth.service";
//import { UserService } from "src/user/user.service";
//import { DmService } from "./dm.service";

////https://4sii.tistory.com/487

//@WebSocketGateway(80, { namespace: "dm", cors: true })
//export class DmGateWay
//  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
//{
//  constructor(
//    private readonly authService: AuthService,
//    private readonly userService: UserService,
//    private readonly dmservice: DmService,
//  ) {}

//  @WebSocketServer()
//  public server: Server;

//  /* --------------------------
//        |				handleConnection 		|
//        |				handleDisconnect		|
//        ---------------------------*/

//  async afterInit(): Promise<void> {
//    //나중에 끊었다가 다시 접속했을 떄 기록이 남아있는지 확인 필요
//    //await this.dmservice.deleteChatRoomAll();
//    //await this.dmservice.deleteChatRoomDmAll();
//  }

//  async handleConnection(@ConnectedSocket() socket: Socket): Promise<void> {
//    try {
//      // DM하려는 상대가 친구가 아니라면
//      const user = await this.userService.findUser(socket);
//      if (!user) {
//        socket.disconnect();
//        throw new WsException("소켓 연결 유저 없습니다.");
//      }

//      await this.userService.updateStatus(user.id, userStatus.ONLINE);

//      await this.chatService.deleteChatRoomIfOwner(user.id);
//      const initChatRooms = await this.chatService
//        .findChatRoomByUserId(user.id)
//        .catch(() => null);

//      if (initChatRooms) {
//        for (const initChatRoom of initChatRooms) {
//          await this.chatService.leaveChatRoom(
//            user.id,
//            initChatRoom.id,
//            user.id,
//          );
//        }
//      }
//      await this.chatService.deleteChatRoomDmIfOwner(user.id);
//      const initChatRoomDms = await this.chatService
//        .findChatRoomDmByUserId(user.id, ["joinedDmUser", "owner"])
//        .catch(() => null);
//      if (initChatRoomDms) {
//        for (const initChatRoomDm of initChatRoomDms) {
//          await this.chatService.leaveChatRoomDm(
//            user.id,
//            initChatRoomDm.id,
//            user.id,
//          );
//        }
//      }
//      const chatRooms = await this.chatService.findChatRoomByUserId(user.id);
//      const chatRoomsDm = await this.chatService.findChatRoomDmByUserId(
//        user.id,
//      );
//      const allChatRooms = await this.chatService.findChatRoomAll();

//      socket.data.user = user;
//      socket_username[user.username] = socket;

//      socket.emit("connection", {
//        message: `${user.username} 연결`,
//        user,
//        chatRooms,
//        chatRoomsDm,
//        allChatRooms,
//      });
//    } catch (e) {
//      return new WsException(e.message);
//    }
//  }
//  async handleDisconnect(
//    @ConnectedSocket() socket: Socket,
//  ): Promise<WsException | void> {
//    try {
//      const user = socket.data.user;
//      if (!user) throw new WsException("소켓 연결 유저 없습니다.");

//      const disconnectUser = await this.userService.findUserById(user.id);

//      await this.chatService.deleteChatRoomIfOwner(user.id);
//      const chatRooms = await this.chatService
//        .findChatRoomByUserId(disconnectUser.id)
//        .catch(() => null);
//      if (chatRooms) {
//        for (const chatRoom of chatRooms) {
//          const leaveUser = {
//            targetUserId: disconnectUser.id,
//            chatRoomId: chatRoom.id,
//          };
//          await this.leaveChatRoom(socket, leaveUser);
//        }
//      }

//      await this.chatService.deleteChatRoomDmIfOwner(user.id);
//      const chatRoomDms = await this.chatService
//        .findChatRoomDmByUserId(disconnectUser.id)
//        .catch(() => null);
//      if (chatRoomDms) {
//        for (const chatRoomDm of chatRoomDms) {
//          const leaveUser = {
//            targetUserId: disconnectUser.id,
//            chatRoomId: chatRoomDm.id,
//          };
//          await this.leaveChatRoomDm(socket, leaveUser);
//        }
//      }

//      const chatRoom = await this.chatService.findChatRoomByUserId(
//        disconnectUser.id,
//      );
//      const chatRoomDm = await this.chatService.findChatRoomDmByUserId(
//        disconnectUser.id,
//      );

//      socket.emit("disconnectiton", {
//        message: `${user.username} 연결해제`,
//        disconnectUser,
//        chatRoom,
//        chatRoomDm,
//      });
//    } catch (e) {
//      return new WsException(e.message);
//    }
//  }

//  @SubscribeMessage("new_user")
//  handleNewUser(
//    @MessageBody() username: string,
//    @ConnectedSocket() socket: Socket,
//  ) {
//    console.log(socket.id);

//    console.log(username);
//    socket.emit("hello_user", `hello ${username}`);
//    return "hello world";
//  }
//}
