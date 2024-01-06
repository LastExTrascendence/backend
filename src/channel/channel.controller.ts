import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ChannelsService } from "./channel.service";
import {
  ChatChannelListDto,
  ChatChannelUserDto,
} from "./channel_dto/channels.dto";

@Controller("channel")
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}
  //게임 방 조회
  @Get("/")
  async getChannels(
    @Req() req: any,
  ): Promise<ChatChannelUserDto[] | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.getChannels.name}`,
      );
      return await this.channelsService.getChannels(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 새로운 방 생성
  @Post("/create")
  async createChannel(
    @Body() chatChannelListDto: ChatChannelListDto,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.createChannel.name}`,
      );
      await this.channelsService.createChannel(chatChannelListDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 방 입장
  @Post("/enter")
  async enterChannel(
    @Body("req") req: any,
    @Body("password") password: string,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.enterChannel.name}`,
      );
      await this.channelsService.enterChannel(req, password);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
