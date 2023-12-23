import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entity/user.entity";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { FortyTwoStrategy } from "./strategy/fortytwo.strategy";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtService } from "@nestjs/jwt";
import * as config from "config";
import { UserService } from "src/user/user.service";
import { UserModule } from "src/user/user.module";
import { loginStrategy } from "./strategy/login.strategy";

const jwtConfig = config.get("jwt");

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
      },
    }),
    TypeOrmModule.forFeature([User]),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    UserService,
    JwtStrategy,
    AuthService,
    FortyTwoStrategy,
    loginStrategy,
  ],
  exports: [JwtStrategy, loginStrategy, PassportModule],
})
export class AuthModule {}

//@Module({
//  imports: [
//    JwtModule.register({
//      secret: jwtConstants.secret,
//      signOptions: { expiresIn: '7d' },
//    }),
//    forwardRef(() => UsersModule),
//  ],
//  controllers: [AuthController],
//  providers: [
//    FtStrategy,
//    SessionSerializer,
//    {
//      provide: 'AUTH_SERVICE',
//      useClass: AuthService,
//    },
//    JwtStrategy,
//  ],
//  exports: [
//    {
//      provide: 'AUTH_SERVICE',
//      useClass: AuthService,
//    },
//    JwtModule,
//  ],
//})
//export class AuthModule {}
