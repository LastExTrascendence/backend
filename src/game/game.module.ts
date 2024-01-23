import { Module, forwardRef } from "@nestjs/common";
import { User } from "src/user/entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameService } from "./game.service";
import { Game } from "./entity/game.entity";
import { GamePlayer } from "./entity/game.player.entity";
import { GameController } from "./game.controller";
import { Redis } from "ioredis";
import { AuthModule } from "src/auth/auth.module";
import { GamePlayerService } from "./game.player.service";
import { UserService } from "src/user/user.service";
import { GameChannel } from "./entity/game.channel.entity";
import { GameGateWay } from "./game.gateway";
import { GameChannelService } from "./game.channel.service";
import { UserModule } from "src/user/user.module";


@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([User, Game, GameChannel, GamePlayer]),
  ],
  controllers: [GameController],
  providers: [
    UserOtpService,
    GameChannelService,
    GameService,
    GamePlayerService,
    Redis,
    UserService,
    GameGateWay,
  ],
  exports: [
    UserService,
    GameChannelService,
    GameService,
    GamePlayerService,
    Redis,
    GameGateWay,
  ],
})
export class GameModule { }
