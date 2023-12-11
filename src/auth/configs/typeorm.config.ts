import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Board } from "src/boards/board.entity";
import * as config from 'config';

const dbConfig = config.get('db');

export const typeORMConfig : TypeOrmModuleOptions = {
    //type: 'postgres',
    //host: 'localhost',
    //port: 5432,
    //username: 'postgres',
    //password: 'password',
    //database: 'postgres',
    //entities: [__dirname + '../**/*.entity.{js,ts}', Board],
    //synchronize: true

    type : dbConfig.type,
    host : process.env.RDS_HOSTNAME || dbConfig.host,
    port : process.env.RDS_PORT || dbConfig.port,
    username : process.env.RDS_USERNAME || dbConfig.username,
    password : process.env.RDS_PASSWORD || dbConfig.password,
    database : process.env.RDS_DB_NAME || dbConfig.database,
    entities : [__dirname + '/../**/*.entity.{js,ts}', Board],
    synchronize : dbConfig.synchronize

};