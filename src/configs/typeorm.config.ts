import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { UserBlock } from "src/user/entity/user.block.entity";
import { UserFriend } from "src/user/entity/user.friend.entity";
import { User } from "../user/entity/user.entity";
import { Channels } from "src/channel/entity/channels.entity";
import { ChannelUser } from "src/channel/entity/channel.user.entity";
import { Game } from "src/game/entity/game.entity";
import { GameChannel } from "src/game/entity/game.channel.entity";
import { GamePlayer } from "src/game/entity/game.player.entity";
import { ConfigService } from "@nestjs/config";
import * as config from "config";
import { UserOtpSecret } from "src/user/entity/user.otp.entity";

export default class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: "postgres",
      host: "host.docker.internal",
      port: 5432,
      username: "postgres",
      password: "password",
      database: "trans_backend",
      entities: [
        __dirname + "../**/*.entity.{js,ts}",
        User,
        Channels,
        ChannelUser,
        UserBlock,
        UserFriend,
        UserOtpSecret,
        GameChannel,
        Game,
        GamePlayer,
      ],
      synchronize: true,
    };
  }
}

export const typeORMConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "trans_backend",
  entities: [
    __dirname + "../**/*.entity.{js,ts}",
    User,
    Channels,
    ChannelUser,
    UserBlock,
    UserFriend,
    UserOtpSecret,
    GameChannel,
    Game,
    GamePlayer,
  ],
  synchronize: true,
};
