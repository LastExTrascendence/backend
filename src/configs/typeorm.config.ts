import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../user/user.entity";

export const typeORMConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "trans_backend",
  entities: [__dirname + "../**/*.entity.{js,ts}", User],
  synchronize: true,
};
