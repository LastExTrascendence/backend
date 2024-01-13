import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { UserBlock } from "src/user/entity/user.block.entity";
import { UserFriend } from "src/user/entity/user.friend.entity";
import { User } from "../user/entity/user.entity";
import { channels } from "src/channel/entity/channels.entity";
import { channelUser } from "src/channel/entity/channel.user.entity";
import { GameChannel } from "src/game/entity/game.channel.entity";
import { Game } from "src/game/entity/game.entity";
import { GamePlayer } from "src/game/entity/game.players.entity";
import { ConfigService } from "@nestjs/config";
import * as config from "config";

export default class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
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
    GameChannel,
    Game,
    GamePlayer,
  ],
  synchronize: true,
};
