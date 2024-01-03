import { Module } from "@nestjs/common";
// import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from "src/user/entity/user.entity";
import { ChannelGateWay } from "./channel.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelsService } from "./channel.service";
import { channels } from "./channel_entity/channels.entity";
import { ChannelsRepository } from "./channels.repository";
//import { ChannelUserRepository } from './channel.user.repositroy';
//import { ChannelUserService } from "./channel.user.service";
import { channel_user } from "./channel_entity/channel.user.entity";
import { Redis } from "ioredis";

@Module({
  imports: [TypeOrmModule.forFeature([User, channels, channel_user])],
  providers: [
    ChannelGateWay,
    ChannelsService,
    ChannelsRepository,
    Redis,
    //ChannelUserRepository,
    //ChannelUserService,
  ],
  exports: [
    ChannelsService,
    ChannelsRepository,
    Redis,
    //ChannelUserRepository,
    //ChannelUserService,
  ],
})
export class ChannelModule {}
