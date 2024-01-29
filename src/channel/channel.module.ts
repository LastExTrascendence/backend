import { Module } from "@nestjs/common";
import { User } from "src/user/entity/user.entity";
import { ChannelGateWay } from "./channel.gateway";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChannelsService } from "./channel.service";
import { Channels } from "./entity/channels.entity";
import { ChannelUser } from "./entity/channel.user.entity";
import { UserService } from "src/user/user.service";
import { ChannelController } from "./channel.controller";
import { AuthModule } from "src/auth/auth.module";
import { UserOtpSecret } from "src/user/entity/user.otp.entity";
import { UserOtpService } from "src/user/user.otp.service";
import { CommonsModule } from "src/commons/commons.module";

@Module({
  imports: [
    AuthModule,
    CommonsModule,
    TypeOrmModule.forFeature([User, UserOtpSecret, Channels, ChannelUser]),
  ],
  controllers: [ChannelController],
  providers: [UserOtpService, UserService, ChannelGateWay, ChannelsService],
  exports: [ChannelsService, ChannelGateWay],
})
export class ChannelModule {}
