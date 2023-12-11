import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "src/auth/user.entity";

export const typeORMConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: "host.docker.internal",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "trans_backend",
  entities: [__dirname + "../**/*.entity.{js,ts}", User],
  synchronize: true,
};
