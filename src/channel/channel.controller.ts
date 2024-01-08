import {
  Body,
  Controller,
  Get,
  HttpException,
  Logger,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ChannelsService } from "./channel.service";
import { ChatChannelListDto, UserVerify } from "./channel_dto/channels.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";

@Controller("channel")
@UseGuards(JWTAuthGuard)
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}

  //게임 방 조회
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

  //게임 새로운 방 생성
  @Post("/create")
  async createChannel(
    @Body() chatChannelListDto: ChatChannelListDto,
    //@Req() req: any, // ChatChannelInfoDto{{}}
  ): Promise<void | HttpException> {
    this.logger.debug(
      `Called ${ChannelController.name} ${this.createChannel.name}`,
    );
    try {
      await this.channelsService.createChannel(chatChannelListDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //게임 방 입장
  @Post("/enter")
  async enterChannel(
    @Body() userVerify: UserVerify,
  ): Promise<void | HttpException> {
    try {
      this.logger.debug(
        `Called ${ChannelController.name} ${this.enterChannel.name}`,
      );
      await this.channelsService.enterChannel(userVerify);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
