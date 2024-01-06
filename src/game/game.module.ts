import { Module, forwardRef } from "@nestjs/common";
// import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from "src/user/entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameService } from "./game.service";
import { GamePlayerService } from "./game.players.service";
import { Game } from "./entity/game.entity";
import { GamePlayers } from "./entity/game.players.entity";
import { GameController } from "./game.controller";
import { UserModule } from "src/user/user.module";
import { Redis } from "ioredis";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayers])],
  controllers: [GameController],
  providers: [GameService, GamePlayerService, Redis],
  exports: [GameService, GamePlayerService, Redis],
})
export class GameModule {}
