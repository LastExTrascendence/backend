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
//import { JwtStrategy } from '../auth/strategy/jwt.strategy';
const jwtConfig = config.get("jwt");

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
