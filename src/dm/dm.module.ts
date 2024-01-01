import { Module } from "@nestjs/common";
import Redis from "ioredis";
import { DmGateway } from "./dm.gateway";
import { DmChannels } from "./entity/dm.channels.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DmChannelsRepository } from "./dm_channels.repository";
import { User } from "src/user/entity/user.entity";
import { UserService } from "src/user/user.service";
import { DmService } from "./dm.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [Redis, TypeOrmModule.forFeature([DmChannels, User])],
  providers: [
    DmGateway,
    Redis,
    DmChannelsRepository,
    UserService,
    DmService,
    JwtService,
  ],
  exports: [DmChannelsRepository, DmService],
})
export class DmModule {}
