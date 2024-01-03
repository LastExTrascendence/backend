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
import { ChatChannelInfoDto } from "./channel_dto/channels.dto";

@Controller("channel")
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}

  //게임 새로운 방 생성
  //게임 방 조회

  //게임 방 입장

  @Post("/create")
  async createChannel(
    @Req() req: any,
    @Res() res: any,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.createChannel.name}`,
      );

      const password = await this.channelsService.createChannel(req);

      // Redirect with JSON payload in the request body
      res.redirect("/channel/enter", 301, {
        name: req.name,
        password: password,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post("/enter")
  async enterChannel(
    @Body("name") name: string,
    @Body("password") password: string,
    @Req() req: any,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.enterChannel.name}`,
      );
      await this.channelsService.enterChannel(name, password, req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get("/rooms")
  async getChannels(
    @Req() req: any,
  ): Promise<ChatChannelInfoDto[] | HttpException> {
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
}
