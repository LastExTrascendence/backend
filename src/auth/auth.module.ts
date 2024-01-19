import { Module, forwardRef } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entity/user.entity";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtService } from "@nestjs/jwt";
import * as config from "config";
import { UserService } from "src/user/user.service";
import { UserModule } from "src/user/user.module";
import { JwtStrategy } from "./jwt/jwt.strategy";
import { FortyTwoStrategy } from "./fortytwo/fortytwo.strategy";
import { Redis } from "ioredis";

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [UserService, JwtStrategy, AuthService, FortyTwoStrategy, Redis],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
