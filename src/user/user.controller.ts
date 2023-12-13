import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common';
import { UserCredentialsDto } from './dto/user.dto'
import { UserService } from './user.service';
import { User } from './user.entity';


@Controller('user')
export class UserController {
    constructor(private userService: UserService){}
    @Post('/create')
    createUser(@Body(ValidationPipe) userCredentialsDto: UserCredentialsDto): Promise<{access_token: string}> {
        return this.userService.createUser(userCredentialsDto);
    }



    // @Get('/:id')
    // getBoardById(@Param('id') id:number) : Promise<Board> {
    //     return this.boardsService.getBoardById(id);
    // }
    @Get('/:IntraId')
    findUser(@Param('IntraId') IntraId:string ) : Promise<User> {
        return this.userService.findUser(IntraId);
    }

}
