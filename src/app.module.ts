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
// import { ChatGateway } from './channel/channel.gateway';
import { ChannelGateWay } from './channel/channel.gateway';
import { ChannelsService } from './channel/channel.service';
import { DmModule } from './dm/dm.module';

@Module({
  imports : [
    TypeOrmModule.forRoot(typeORMConfig), 
    AuthModule, 
    UserModule,
    ChannelModule,
    SocketModule,
    DmModule
  ],
  controllers: [AppController],
  providers: [AppService ]
  // providers: [AppService, ChatGateway ]
})
export class AppModule {}
