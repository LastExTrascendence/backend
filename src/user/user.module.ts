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
import { Redis } from "ioredis";
import { UserGateway } from "./user.gateway";
import { GameGateWay } from "src/game/game.gateway";
import { GameChannel } from "src/game/entity/game.channel.entity";
import { GamePlayer } from "src/game/entity/game.player.entity";
import { Game } from "src/game/entity/game.entity";
//import { JwtStrategy } from '../auth/strategy/jwt.strategy';

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, UserFriend, UserBlock]),
    GameModule,
    Redis,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    PassportModule,
    FriendService,
    BlockService,
    Redis,
    UserGateway,
    Game,
    GameChannel,
    GamePlayer,
  ],
  exports: [UserService, UserGateway],
})
export class UserModule {}
