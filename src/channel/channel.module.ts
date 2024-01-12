import { Module } from "@nestjs/common";
import { User } from "src/user/entity/user.entity";
import { ChannelGateWay } from "./channel.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelsService } from "./channel.service";
import { channels } from "./entity/channels.entity";
import { channelUser } from "./entity/channel.user.entity";
import { Redis } from "ioredis";
import { UserService } from "src/user/user.service";
import { ChannelController } from "./channel.controller";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, channels, channelUser]),
  ],
  controllers: [ChannelController],
  providers: [UserService, ChannelGateWay, ChannelsService, Redis],
  exports: [ChannelsService, Redis],
})
export class ChannelModule {}
