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
import { GamePlayerService } from "src/game/game.players.service";
import { GameService } from "src/game/game.service";
import { GamePlayers } from "src/game/entity/game.players.entity";
import { GameModule } from "src/game/game.module";
import { ChannelsService } from "src/channel/channel.service";
import { AuthModule } from "src/auth/auth.module";
//import { JwtStrategy } from '../auth/strategy/jwt.strategy';

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User, UserFriend, UserBlock]),
    GameModule,
  ],
  controllers: [UserController],
  providers: [UserService, PassportModule, FriendService, BlockService],
  exports: [UserService],
})
export class UserModule {}
