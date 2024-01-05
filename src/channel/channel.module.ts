import { Module } from "@nestjs/common";
// import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from "src/user/entity/user.entity";
import { ChannelGateWay } from "./channel.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelsService } from "./channel.service";
import { channels } from "./channel_entity/channels.entity";
//import { ChannelsRepository } from "./channels.repository";
//import { ChannelUserRepository } from './channel.user.repositroy';
//import { ChannelUserService } from "./channel.user.service";
import { channelUser } from "./channel_entity/channel.user.entity";
import { Redis } from "ioredis";
import { UserService } from "src/user/user.service";
import { PassportModule } from "@nestjs/passport";
import * as config from "config";
import { JwtModule } from "@nestjs/jwt";

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
    TypeOrmModule.forFeature([User, channels, channelUser]),
  ],
  providers: [
    UserService,
    ChannelGateWay,
    ChannelsService,
    //ChannelsRepository,
    Redis,
    //ChannelUserRepository,
    //ChannelUserService,
  ],
  exports: [
    ChannelsService,
    //ChannelsRepository,
    Redis,
    //ChannelUserRepository,
    //ChannelUserService,
  ],
})
export class ChannelModule {}
