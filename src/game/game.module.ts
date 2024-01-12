import { Module, forwardRef } from "@nestjs/common";
import { User } from "src/user/entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameService } from "./game.service";
import { games } from "./entity/game.entity";
import { gamePlayers } from "./entity/game.players.entity";
import { GameController } from "./game.controller";
import { Redis } from "ioredis";
import { AuthModule } from "src/auth/auth.module";
import { GamePlayerService } from "./game.players.service";
import { UserService } from "src/user/user.service";
import { GameGateWay } from "./game.gateway";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, games, gamePlayers]),
  ],
  controllers: [GameController],
  providers: [GameService, GamePlayerService, Redis, UserService, GameGateWay],
  exports: [GameService, GamePlayerService, Redis],
})
export class GameModule {}
