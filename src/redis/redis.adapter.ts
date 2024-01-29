import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter, RedisAdapterOptions } from "socket.io-redis";

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    const redisOptions: RedisAdapterOptions = {
      key: "socket.io",
      pubClient: "localhost", // Replace with your Redis pub client instance
      subClient: process.env.REDIS_SUB_CLIENT, // Replace with your Redis sub client instance
      requestsTimeout: 5000,
    };

    const redisAdapter = createAdapter(redisOptions);

    server.adapter(redisAdapter);

    return server;
  }
}

//npm i --save redis socket.io @socket.io/redis-adapter
//npm i -D @types/redis
//npm i --save socket.io-redis
//npm install @nestjs/platform-socket.io socket.io-redis
