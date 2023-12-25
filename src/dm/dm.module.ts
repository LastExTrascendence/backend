import { Module } from "@nestjs/common";
import Redis from "ioredis";
import { DmGateway } from "./dm.gateway";

@Module({
  imports: [Redis],
  providers: [DmGateway, Redis],
  exports: [],
})
export class DmModule {}
