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
import { chatChannelListDto } from "./dto/channels.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { channelUserVerify } from "./dto/channel.user.dto";
import { TwoFAGuard } from "src/auth/twoFA/twoFA.guard";

// gateway에서 connectedClients에 저장된 유저 정보를 가져와서
// 채널 입장 시 채널 정보를 channels DB에 담기

@Controller("channel")
@UseGuards(JWTAuthGuard, TwoFAGuard)
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}

  //채널 방 조회
  @Get("/")
  async getChannels(): Promise<chatChannelListDto[] | HttpException> {
    this.logger.debug(
      `Called ${ChannelController.name} ${this.getChannels.name}`,
    );
    try {
      return await this.channelsService.getChannels();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //채널 새로운 방 생성
  @Post("/create")
  async createChannel(
    @Body(ValidationPipe) chatChannelListDto: chatChannelListDto,
  ): Promise<chatChannelListDto | HttpException> {
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
    @Body(ValidationPipe) channelUserVerify: channelUserVerify,
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
