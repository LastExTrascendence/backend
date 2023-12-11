import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardStatus } from './board-status.enum';
//v1 버전 사용
import { v1 as uuid } from 'uuid';
import { CreateBoardDto } from './dto/create-board.dto';
import { BoardRepository } from './board.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Board } from './board.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class BoardsService {

    constructor(private boardRepository: BoardRepository){}

    //createBoard(createBoardDto : CreateBoardDto) : Promise<Board> {
    //    return this.boardRepository.createBoard(createBoardDto);
    //}

    async createBoard(createBoardDto : CreateBoardDto, user: User) : Promise<Board> {
        return this.boardRepository.createBoard(createBoardDto, user);
    }


    async getBoardById(id: number): Promise <Board> {
        const found = await this.boardRepository.findOne({where : {id}});

        if (!found){
            throw new NotFoundException(`Can't find Board with id ${id}`)
        }
        return found;
    }

    async deleteBoard(id : number, user : User) : Promise<void> {
        //const result = await this.boardRepository.delete({id, user});
        const result = await this.boardRepository.delete({id, user:{
            id:user.id,
        }});

        if(result.affected === 0){
            throw new NotFoundException(`Can't find Board with id ${id}`)
        }
    }

    async updateBoardStatus(id: number, status: BoardStatus) : Promise<Board> {
        const board = await this.getBoardById(id);

        board.status = status;
        await this.boardRepository.save(board);

        return board;
    }

    async getAllBoards(
        user: User
    ) : Promise<Board[]> {
        const query = this.boardRepository.createQueryBuilder('board');

        query.where('board.userId = :userId', {userId: user.id});

        const boards = await query.getMany();

        return boards;
    }
}