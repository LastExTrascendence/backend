import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserController } from "./user.controller";
// import { UserRepository } from './user.repository';
import { UserService } from "./user.service";
// import { JwtStrategy } from '../auth/strategy/jwt.strategy';
import * as config from "config";
import { User } from "./entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FriendService } from "./user.friend.service";
import { BlockService } from "./user.block.service";
import { UserFriend } from "./entity/user.friend.entity";
import { UserBlock } from "./entity/user.block.entity";
import { GameModule } from "src/game/game.module";
import { AuthModule } from "src/auth/auth.module";
import { UserGateway } from "./user.gateway";
import { GameGateWay } from "src/game/game.gateway";
import { GameChannel } from "src/game/entity/game.channel.entity";
import { GamePlayer } from "src/game/entity/game.player.entity";
import { Game } from "src/game/entity/game.entity";
import { ChannelModule } from "src/channel/channel.module";
import { Channels } from "src/channel/entity/channels.entity";
import { ChannelUser } from "src/channel/entity/channel.user.entity";
import { GameChannelService } from "src/game/game.channel.service";
import { ChannelsService } from "src/channel/channel.service";
import { GameService } from "src/game/game.service";
import { GamePlayerService } from "src/game/game.player.service";
import { UserOtpService } from "./user.otp.service";
import { UserOtpSecret } from "./entity/user.otp.entity";
import { AuthService } from "src/auth/auth.service";
import { CommonsModule } from "src/commons/commons.module";
//import { JwtStrategy } from '../auth/strategy/jwt.strategy';

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      User,
      UserFriend,
      UserOtpSecret,
      UserBlock,
      GameChannel,
      GamePlayer,
      Game,
      Channels,
      ChannelUser,
    ]),
    CommonsModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserOtpService,
    PassportModule,
    FriendService,
    BlockService,
    UserGateway,
    Game,
    GameChannel,
    GamePlayer,
    UserGateway,
    GamePlayerService,
    GameChannelService,
    GameService,
    ChannelsService,
  ],
  exports: [UserService, UserGateway, UserOtpService],
})
export class UserModule {}
