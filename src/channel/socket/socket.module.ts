import { Module } from "@nestjs/common";
import { SocketClient } from "./socket_client";
import { Redis } from "ioredis";

@Module({
  providers: [SocketClient, Redis],
})
export class SocketModule {}
