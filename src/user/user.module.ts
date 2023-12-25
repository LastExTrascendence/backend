import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserController } from "./user.controller";
// import { UserRepository } from './user.repository';
import { UserService } from "./user.service";
// import { JwtStrategy } from '../auth/strategy/jwt.strategy';
import * as config from "config";
import { User } from "./entity/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AvatarService } from "./user.avatar.service";
import { FriendService } from "./user.friend.service";
import { BlockService } from "./user.block.service";
import { UserFriend } from "./entity/user.friend.entity";
import { UserBlock } from "./entity/user.block.entity";
//import { JwtStrategy } from '../auth/strategy/jwt.strategy';

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
    TypeOrmModule.forFeature([User, UserFriend, UserBlock]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    AvatarService,
    PassportModule,
    FriendService,
    BlockService,
  ],
})
export class UserModule {}
