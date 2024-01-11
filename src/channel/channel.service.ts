import { InjectRepository } from "@nestjs/typeorm";
//import { ChannelsRepository } from "./channels.repository";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { channels } from "./entity/channels.entity";
import { Repository } from "typeorm";
import { ChatChannelListDto } from "./dto/channels.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { channelUser } from "./entity/channel.user.entity";
import { UserService } from "src/user/user.service";
import { ChatChannelPolicy, ChatChannelUserRole } from "./enum/channel.enum";
import { ChannelUserVerify } from "./dto/channel.user.dto";

//1. 채널 입장 시 채널 정보를 channels DB에 담기
//2. 채널 입장 시 유저 정보를 channelsUser DB에 담기

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(channels)
    private channelsRepository: Repository<channels>,
    @InjectRepository(channelUser)
    private channelUserRepository: Repository<channelUser>,
    private userService: UserService,
    private RedisClient: Redis,
  ) {}

  async createChannel(
    chatChannelListDto: ChatChannelListDto,
  ): Promise<ChatChannelListDto | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(
        `CH|${chatChannelListDto.title}`,
        0,
        -1,
      );
      if (ChannelInfo.length !== 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (chatChannelListDto.title.length > 20) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방 제목은 20자 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const createInfo = await this.userService.findUserById(
        chatChannelListDto.creatorId,
      );

      const newChannel = {
        title: chatChannelListDto.title,
        channelPolicy: ChatChannelPolicy.PUBLIC,
        creatorId: createInfo.id,
        creatorAvatar: createInfo.avatar,
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
        createdAt: new Date(),
        deletedAt: null,
      };
      if (chatChannelListDto.password) {
        newChannel.channelPolicy = ChatChannelPolicy.PRIVATE;
      }

      await this.channelsRepository.save(newChannel);

      const newChannelInfo = await this.channelsRepository.findOne({
        where: { title: newChannel.title },
      });

      await this.RedisClient.hset(
        `CH|${chatChannelListDto.title}`,
        "title",
        chatChannelListDto.title,
      );

      if (chatChannelListDto.password) {
        await this.RedisClient.hset(
          `CH|${chatChannelListDto.title}`,
          "password",
          await bcrypt.hash(chatChannelListDto.password, 10),
        );
      }

      const retChannelInfo = {
        id: newChannelInfo.id,
        title: newChannel.title,
        channelPolicy: newChannel.channelPolicy,
        password: null,
        creatorId: newChannel.creatorId,
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
      };

      return retChannelInfo;
    } catch (error) {
      throw error;
    }
  }

  async enterChannel(
    channelUserVerify: ChannelUserVerify,
  ): Promise<void | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(
        `CH|${channelUserVerify.title}`,
        0,
        -1,
      );
      if (ChannelInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방이 존재하지 않습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const ChatPassword = await this.RedisClient.hget(
        `CH|${channelUserVerify.title}`,
        "password",
      );

      if (channelUserVerify.password) {
        const isMatch = await bcrypt.compare(
          channelUserVerify.password,
          ChatPassword,
        );
        if (!isMatch) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "비밀번호가 일치하지 않습니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        } else {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "잘못된 접근입니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const user = await this.userService.findUserByNickname(
        channelUserVerify.nickname,
      );
      const channel = await this.channelsRepository.findOne({
        where: { title: channelUserVerify.title, deletedAt: null },
      });

      const usefInfo = await this.channelUserRepository.findOne({
        where: { userId: user.id, channelId: channel.id, deletedAt: null },
      });

      if (usefInfo) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 유저입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getChannels(req: any): Promise<ChatChannelListDto[] | HttpException> {
    try {
      const channelsInfo = await this.channelsRepository.find();

      if (channelsInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const totalChannels = [];

      for (let i = 0; i < channelsInfo.length; i++) {
        const channel = {
          id: channelsInfo[i].id,
          title: channelsInfo[i].title,
          channelPolicy: channelsInfo[i].channelPolicy,
          creator: {
            nickname: (
              await this.userService.findUserById(channelsInfo[i].creatorId)
            ).nickname,
            avatar: channelsInfo[i].creatorAvatar,
          },
          curUser: channelsInfo[i].curUser,
          maxUser: channelsInfo[i].maxUser,
        };

        totalChannels.push(channel);
      }

      return totalChannels;
    } catch (error) {
      throw error;
    }
  }
}
