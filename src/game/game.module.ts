import { Module, forwardRef } from "@nestjs/common";
import { User } from "src/user/entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameService } from "./game.service";
import { Game } from "./entity/game.entity";
import { GamePlayer } from "./entity/game.player.entity";
import { GameController } from "./game.controller";
import { AuthModule } from "src/auth/auth.module";
import { GamePlayerService } from "./game.player.service";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { GameGateWay } from "./game.gateway";
import { GameChannelService } from "./game.channel.service";
import { UserModule } from "src/user/user.module";
import { UserOtpService } from "src/user/user.otp.service";
import { UserOtpSecret } from "src/user/entity/user.otp.entity";
import { CommonsModule } from "src/commons/commons.module";
import { RedisService } from "src/commons/redis-client.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([
      User,
      UserOtpSecret,
      Game,
      GameChannel,
      GamePlayer,
    ]),
    CommonsModule,
  ],
  controllers: [GameController],
  providers: [
    UserOtpService,
    GameChannelService,
    GameService,
    GamePlayerService,
    UserService,
    GameGateWay,
    RedisService,
  ],
  exports: [
    UserService,
    GameChannelService,
    GameService,
    GamePlayerService,
    GameGateWay,
  ],
})
export class GameModule {}
