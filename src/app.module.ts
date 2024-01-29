import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import TypeOrmConfigService from "./configs/typeorm.config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { addTransactionalDataSource } from "typeorm-transactional";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { ChannelModule } from "./channel/channel.module";
import { SessionMiddleware } from "./middleware/session-middleware";
import { GameModule } from "./game/game.module";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CommonsModule } from "./commons/commons.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [],
      isGlobal: true, // TODO: remove after
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error("No options");
        }
        return addTransactionalDataSource(new DataSource(options));
      },
    }),
    AuthModule,
    UserModule,
    ChannelModule,
    GameModule,
    CommonsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SessionMiddleware],
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
