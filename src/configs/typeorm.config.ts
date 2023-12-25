import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { UserBlock } from "src/user/entity/user.block.entity";
import { UserFriend } from "src/user/entity/user.friend.entity";
import { User } from "../user/entity/user.entity";
import { channels } from "src/channel/channel_entity/channels.entity";
import { channel_user } from "src/channel/channel_entity/channel.user.entity";

export const typeORMConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "trans_backend",
  entities: [__dirname + "../**/*.entity.{js,ts}", User, channels, channel_user, UserBlock, UserFriend],
  synchronize: true,
};
