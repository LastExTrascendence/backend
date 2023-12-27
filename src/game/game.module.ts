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

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayers])],
  controllers: [GameController],
  providers: [GameService, GamePlayerService],
  exports: [GameService, GamePlayerService],
})
export class GameModule {}
