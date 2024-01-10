import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { ChannelsService } from "./channel.service";
import { ChatChannelListDto } from "./dto/channels.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { ChannelUserVerify } from "./dto/channel.user.dto";

@Controller("channel")
@UseGuards(JWTAuthGuard)
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}

  //채널 방 조회
  @Get("/")
  async getChannels(
    @Req() req: any,
  ): Promise<ChatChannelListDto[] | HttpException> {
    this.logger.debug(
      `Called ${ChannelController.name} ${this.getChannels.name}`,
    );
    try {
      return await this.channelsService.getChannels(req);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //채널 새로운 방 생성
  @Post("/create")
  async createChannel(
    @Body(ValidationPipe) chatChannelListDto: ChatChannelListDto,
  ): Promise<ChatChannelListDto | HttpException> {
    this.logger.debug(
      `Called ${ChannelController.name} ${this.createChannel.name}`,
    );
    try {
      return await this.channelsService.createChannel(chatChannelListDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //채널 방 입장
  @Post("/enter")
  async enterChannel(
    @Body(ValidationPipe) channelUserVerify: ChannelUserVerify,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.enterChannel.name}`,
      );
      await this.channelsService.enterChannel(channelUserVerify);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
