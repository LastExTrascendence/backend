import { Module } from "@nestjs/common";
import { RedisService } from "./redis-client.service";

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonsModule {}
