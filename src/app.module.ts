import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { typeORMConfig } from "./configs/typeorm.config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { JwtStrategy } from "./auth/strategy/jwt.strategy";
import { ChannelModule } from "./channel/channel.module";
import { SocketModule } from "./channel/socket/socket.module";
import { SessionMiddleware } from "./middleware/session-middleware";
// import { ChatGateway } from './channel/channel.gateway';
import { ChannelGateWay } from "./channel/channel.gateway";
import { ChannelsService } from "./channel/channel.service";
import { DmModule } from "./dm/dm.module";
import { GameModule } from "./game/game.module";

@Module({
  imports: [
    TypeOrmModule.forRoot(typeORMConfig),
    AuthModule,
    UserModule,
    ChannelModule,
    SocketModule,
    DmModule,
    GameModule,
  ],
  controllers: [],
  providers: [SessionMiddleware],
})
export class AppModule implements NestModule {
  constructor(public sessionMiddleware: SessionMiddleware) {}

  configure(consumer: MiddlewareConsumer) {
    // NOTE: JWT 토큰이 쿠키에 저장되기 때문에 모든 경로에 대해 해당 미들웨어 적용
    consumer
      .apply(this.sessionMiddleware.cookieParser, this.sessionMiddleware.helmet)
      .forRoutes("*");
  }
}
