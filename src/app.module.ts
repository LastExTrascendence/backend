import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeORMConfig } from './configs/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtStrategy } from './auth/strategy/jwt.strategy';
import { ChannelModule } from './channel/channel.module';
import { SocketModule } from './channel/socket/socket.module';

@Module({
  imports : [
    TypeOrmModule.forRoot(typeORMConfig), 
    AuthModule, 
    UserModule,
    ChannelModule,
    SocketModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
