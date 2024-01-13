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
import { GameGateWay } from "./game.gateway";
import { GameChannel } from "./entity/game.channel.entity";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, Game, GameChannel, GamePlayer]),
  ],
  controllers: [GameController],
  providers: [GameService, GamePlayerService, Redis, UserService, GameGateWay],
  exports: [GameService, GamePlayerService, Redis],
})
export class GameModule {}
