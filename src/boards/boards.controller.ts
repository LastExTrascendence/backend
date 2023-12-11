import { Body, Controller, Get, Post, Param, Patch, UsePipes, ValidationPipe, Delete, UseGuards, Logger} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { BoardStatus } from './board-status.enum';
import { Board } from  "./board.entity"
import { BoardStatusValidationPipe } from './pipes/board-status-validation.pipe';
import { ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('boards')
@UseGuards(AuthGuard())
export class BoardsController {
    private logger = new Logger('BoardsController');
    constructor(private boardsService: BoardsService) {}
    
    @Get('/:id')
    getBoardById(@Param('id') id: number) : Promise<Board> {
        return this.boardsService.getBoardById(id);
    }

    @Post()
    @UsePipes(ValidationPipe)
    createBoard(
        @Body() createBoardDto: CreateBoardDto,
        @GetUser() user: User,
    ): Promise<Board> {
        this.logger.verbose(`User ${user.username} creating a new board.
        Payload: ${JSON.stringify(createBoardDto)}`);
        return this.boardsService.createBoard(createBoardDto, user);
    }


    @Delete('/:id')
    deleteBoard(@Param('id', ParseIntPipe) id,
    @GetUser() user:User
    ): Promise<void> {
        return this.boardsService.deleteBoard(id, user);
    }

    @Patch('/:id/status')
    updateBoardStauts(
        @Param('id', ParseIntPipe) id : number,
        @Body('status', BoardStatusValidationPipe) status : BoardStatus
    ) {
        return this.boardsService.updateBoardStatus(id, status);
    }

    //@Get()
    //getAllTask() : Promise<Board[]> {
    //    return this.boardsService.getAllBoards(user);
    //}

    @Get()
    getAllBoard(
        @GetUser() user : User
    ) : Promise<Board[]> {
        this.logger.verbose(`User ${user.username} retrieving all boards.`);
        return this.boardsService.getAllBoards(user);
    }

    //@Get()
    //getAllBoard() : Board[] {
    //    return this.boardsService.getAllBoards();
    //}

    //@Post()
    //@UsePipes(ValidationPipe)
    //createBoard(
    //    @Body() createBoardDto : CreateBoardDto
    //): Board {
    //    return this.boardsService.createBoard(createBoardDto);
    //}

    //@Get('/:id')
    //getBoardById(@Param('id') id: string) : Board {
    //    return this.boardsService.getBoardById(id);
    //}

    //@Get('/:id')
    //deleteBoard(@Param('id') id: string) : void {
    //    this.boardsService.deleteBoard(id);
    //}

    //@Patch('/:id/status')
    //updateBoardStatus(
    //    @Param('id') id: string,
    //    @Body('status', BoardStatusValidationPipe) status: BoardStatus
    //) : Board {
    //    return this.boardsService.updateBoardStatus(id, status);
    //}
}