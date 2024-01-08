import { Module } from "@nestjs/common";
import Redis from "ioredis";
import { DmGateway } from "./dm.gateway";
import { DmChannels } from "./entity/dm.channels.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
//import { DmChannelsRepository } from "./dm_channels.repository";
import { User } from "src/user/entity/user.entity";
import { UserService } from "src/user/user.service";
//import { DmService } from "./dm.service";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [AuthModule, Redis, TypeOrmModule.forFeature([DmChannels, User])],
  providers: [DmGateway, Redis, UserService],
  exports: [],
})
export class DmModule {}
