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
import {
  ChatChannelConnectDto,
  ChatChannelInfoDto,
} from "./channel_dto/channels.dto";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";

@Controller("channel")
@UseGuards(JWTAuthGuard)
export class ChannelController {
  private logger = new Logger(ChannelController.name);
  constructor(private channelsService: ChannelsService) {}

  //게임 새로운 방 생성
  //게임 방 조회

  //게임 방 입장

  @Post("/create")
  async createChannel(
    @Body() chatChannelConnectDto: ChatChannelConnectDto,
    //@Req() req: any, // ChatChannelInfoDto{{}}
  ): Promise<void | HttpException> {
    this.logger.debug(
      `Called ${ChannelController.name} ${this.createChannel.name}`,
    );
    try {
      //const password =
      await this.channelsService.createChannel(chatChannelConnectDto);

      // Redirect with JSON payload in the request body
      //res.redirect("/channel/enter", 301, {
      //  req: req,
      //  password: password,
      //});
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Post("/enter")
  async enterChannel(
    @Body() req: any,
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

  @Get("/rooms")
  async getChannels(
    @Req() req: any,
  ): Promise<ChatChannelInfoDto[] | HttpException> {
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
}
