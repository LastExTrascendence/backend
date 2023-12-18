import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User_block } from "src/user/entity/user.blocked.entity";
import { User_friends } from "src/user/entity/user.friends.entity";
import { User } from "../user/entity/user.entity";

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
    User_block,
    User_friends,
  ],
  synchronize: true,
};
