import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";
import { UserBlock } from "src/user/entity/user.block.entity";
import { UserFriend } from "src/user/entity/user.friend.entity";
import { User } from "../user/entity/user.entity";
import { channels } from "src/channel/channel_entity/channels.entity";
import { channelUser } from "src/channel/channel_entity/channel.user.entity";
import { Game } from "src/game/entity/game.entity";
import { GamePlayers } from "src/game/entity/game.players.entity";
import { DmChannels } from "src/dm/entity/dm.channels.entity";
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
        channels,
        channelUser,
        UserBlock,
        UserFriend,
        Game,
        GamePlayers,
        DmChannels,
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
    channels,
    channelUser,
    UserBlock,
    UserFriend,
    Game,
    GamePlayers,
    DmChannels,
  ],
  synchronize: true,
};
