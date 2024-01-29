import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: "redis",
      port: 6379,
    });

    this.redisClient.on("connect", () => {
      console.info("Redis connected!");
    });

    this.redisClient.on("error", (err) => {
      console.error("Redis Client Error", err);
    });
  }

  get client(): Redis {
    return this.redisClient;
  }

  get(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.get(formattedKey);
  }

  set(key: string | number, value: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.set(formattedKey, value);
  }

  setex(key: string | number, second: number, value: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.setex(formattedKey, second, value);
  }

  getdel(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.getdel(formattedKey);
  }

  del(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.del(formattedKey);
  }

  hset(key: string | number, field: string, value: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.hset(formattedKey, field, value);
  }

  hget(key: string | number, field: string) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.hget(formattedKey, field);
  }

  hgetall(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.hgetall(formattedKey);
  }

  hdel(key: string | number, field: string) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.hdel(formattedKey, field);
  }

  lrange(key: string | number, start: number, stop: number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.lrange(formattedKey, start, stop);
  }

  lrem(key: string | number, count: number, value: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.lrem(formattedKey, count, value);
  }

  llen(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.llen(formattedKey);
  }

  lpop(key: string | number) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.lpop(formattedKey);
  }

  rpush(key: string | number, value: any) {
    const formattedKey = typeof key === "number" ? key.toString() : key;

    return this.redisClient.rpush(formattedKey, value);
  }

  keys(pattern: string) {
    return this.redisClient.keys(pattern);
  }

  multi() {
    return this.redisClient.multi();
  }
}
