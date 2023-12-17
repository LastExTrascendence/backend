import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { UserBlockDto, UserDto, UserFriendDto } from "./dto/user.dto";
import { UserService } from "./user.service";
import { User } from "./entity/user.entity";
import { JWTAuthGuard } from "src/auth/auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { AvatarService } from "./user.avatar.service";
import { FriendService } from "./user.friend.service";
import { User_friends } from "./entity/user.friends.entity";
import { BlockService } from "./user.block.service";
import { User_block } from "./entity/user.blocked.entity";

@Controller("user")
export class UserController {
  constructor(
    private userService: UserService,
    private avatarservice: AvatarService,
    private friendService: FriendService,
    private blockService: BlockService,
  ) {}
  @Post("/create")
  createUser(
    @Body(ValidationPipe) userDto: UserDto,
  ): Promise<{ access_token: string }> {
    return this.userService.createUser(userDto);
  }

  @Put("/avatar/update")
  @UseGuards(JWTAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  updateAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<User> | HttpException {
    try {
      return this.avatarservice.updateAvatar(req.user.intra_id, null, file);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // @Get('/:id')
  // getBoardById(@Param('id') id:number) : Promise<Board> {
  //     return this.boardsService.getBoardById(id);
  // }
  @Get("/:IntraId")
  findUser(@Param("IntraId") userDto: UserDto): Promise<User> {
    return this.userService.findUserByName(userDto.intra_id);
  }

  @Post("/friend/add")
  addfollow(
    @Body(ValidationPipe) regist: UserFriendDto,
  ): Promise<User_friends> | HttpException {
    try {
      return this.friendService.addfollowing(
        regist.user_id,
        regist.friend_user_id,
      );
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/friend/find")
  findfollow(@Req() req: UserFriendDto) {
    try {
      const { user_id } = req; //string
      return this.friendService.findFollwing(user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete("/friend/remove")
  unfollow(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      return this.friendService.unfollowing(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post("/block/add")
  addblock(
    @Body(ValidationPipe) regist: UserBlockDto,
  ): Promise<User_block> | HttpException {
    try {
      return this.blockService.addBlock(regist.user_id, regist.blocked_user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get("/block/find")
  findblock(@Req() req: UserFriendDto) {
    try {
      const user_id = req.user_id;
      return this.blockService.findBlock(user_id);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete("/block/remove")
  removeblock(
    @Query("ids", new ParseArrayPipe({ items: Number, separator: "," }))
    ids: number[],
  ) {
    try {
      return this.blockService.removeBlock(ids[0], ids[1]);
    } catch (error) {
      return new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
