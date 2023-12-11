import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController, FortyTwoController} from './app.controller';
import { AppService } from './app.service';
import { FortyTwoStrategy } from './google.strategy'

@Module({
  imports: [],
  controllers: [AppController, FortyTwoController],
  providers: [AppService, FortyTwoStrategy],
})
export class AppModule {}