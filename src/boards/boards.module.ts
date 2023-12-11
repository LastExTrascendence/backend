import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardRepository } from './board.repository';
// import { TypeOrmExModule } from '@nestjs/typeorm';
import {TypeOrmExModule} from '../configs/typeorm-ex.module';
import { AuthModule } from 'src/auth/auth.module';

// imports: [
//   TypeOrmModule.forFeature([BoardRepository]),
// ],

@Module({
    imports: [TypeOrmExModule.forCustomRepository([BoardRepository]), 
    AuthModule    
    ],
    controllers: [BoardsController],
    providers: [BoardsService],
})
export class BoardsModule {}