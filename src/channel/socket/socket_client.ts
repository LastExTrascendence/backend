import { Injectable, OnModuleInit } from "@nestjs/common";
import { io, Socket } from "socket.io-client";

@Injectable()
export class SocketClient implements OnModuleInit {
  public socketClient: Socket;

  constructor() {
    this.socketClient = io("http://localhost:83");
  }

  onModuleInit() {
    // this.socketClient.on('connect', () => {
    //     console.log('Connected to Gateway');
    // })
    this.registerConsumerEvents();
  }

  private registerConsumerEvents() {
    // this.socketClient.emit('nmessage', {msg: 'hey there'});
    this.socketClient.on("connect", () => {
      console.log("Connected to Gateway");
    });
    this.socketClient.on("onmessage", (payload: any) => {
      console.log("SocketClientclass!");
      console.log("payload", payload);
    });
  }
}
