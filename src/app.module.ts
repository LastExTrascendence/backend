import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeORMConfig } from './configs/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtStrategy } from './auth/strategy/jwt.strategy';

@Module({
  imports : [TypeOrmModule.forRoot(typeORMConfig), AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
