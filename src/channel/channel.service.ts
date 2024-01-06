import { InjectRepository } from "@nestjs/typeorm";
//import { ChannelsRepository } from "./channels.repository";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { channels } from "./channel_entity/channels.entity";
import { Repository } from "typeorm";
import {
  ChannelDto,
  ChatChannelInfoDto,
  ChatChannelUserDto,
  ChatChannelListDto,
  UserVerify,
} from "./channel_dto/channels.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { channelUser } from "./channel_entity/channel.user.entity";
import { UserService } from "src/user/user.service";
import { ChannelPolicy, ChatChannelUserRole } from "./channel.enum";

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

  // constructor(
  //     @InjectRepository(channels) private channelsRepository:Repository<channels>,
  // ){ }

  async createChannel(
    chatChannelListDto: ChatChannelListDto,
  ): Promise<ChatChannelListDto | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(
        `${chatChannelListDto.title}`,
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

      const createInfo = await this.userService.findUserByNickname(
        chatChannelListDto.creator.nickname,
      );

      const newChannel = {
        title: chatChannelListDto.title,
        channelPolicy: ChannelPolicy.PUBLIC,
        creatorNick: createInfo.nickname,
        creatorAvatar: createInfo.avatar,
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
        createdAt: new Date(),
        deletedAt: null,
      };
      if (chatChannelListDto.password) {
        newChannel.channelPolicy = ChannelPolicy.PRIVATE;
      }

      await this.channelsRepository.save(newChannel);

      const newChannelInfo = await this.channelsRepository.findOne({
        where: { title: newChannel.title },
      });

      const userInfo = {
        userId: createInfo.id,
        channelId: newChannelInfo.id,
        role: ChatChannelUserRole.CREATOR,
        mute: false,
        ban: false,
        createdAt: new Date(),
        deletedAt: null,
      };

      await this.channelUserRepository.save(userInfo);

      await this.RedisClient.hset(
        `${chatChannelListDto.title}`,
        "title",
        chatChannelListDto.title,
      );

      if (chatChannelListDto.password) {
        await this.RedisClient.hset(
          `${chatChannelListDto.title}`,
          "password",
          await bcrypt.hash(chatChannelListDto.password, 10),
        );
      }

      const retChannelInfo: ChatChannelListDto = {
        title: newChannel.title,
        password: null,
        channelPolicy: newChannel.channelPolicy,
        creator: {
          nickname: createInfo.nickname,
          avatar: createInfo.avatar,
        },
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
      };

      return retChannelInfo;
    } catch (error) {
      throw error;
    }
  }

  async enterChannel(userVerify: UserVerify): Promise<void | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(
        `${userVerify.title}`,
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
      const checkIds = ChannelInfo.filter((value) =>
        /^user nickname: \d+$/.test(value),
      );
      if (userVerify.password) {
        const isMatch = await bcrypt.compare(
          userVerify.password,
          (await ChannelInfo)[1],
        );
        if (!isMatch) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "비밀번호가 일치하지 않습니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const user = await this.userService.findUserByNickname(
        userVerify.nickname,
      );
      const channel = await this.channelsRepository.findOne({
        where: { title: userVerify.title, deletedAt: null },
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

  async getChannels(req: any): Promise<ChatChannelInfoDto[] | HttpException> {
    try {
      const keys = await this.RedisClient.keys("Channel:");

      const filteredKeys = keys.filter((key) => key.startsWith("Channel:"));

      if (filteredKeys.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const channels: ChatChannelInfoDto[] = [];

      for (let i = 0; i < keys.length; i++) {
        const channel = await this.RedisClient.hgetall(filteredKeys[i]);

        const users: ChatChannelUserDto = {
          avatar: channel.avatar,
          nickname: channel.nickname,
          role: channel.role as ChatChannelUserRole,
        };

        const channelinfo: ChatChannelInfoDto = {
          title: channel.title,
          channelPolicy: channel.channelPolicy as ChannelPolicy,
          users: users,
        };

        channels.push(channelinfo);
      }
      return channels;
    } catch (error) {
      throw error;
    }
  }

  //async createdbchannel(data : any) : Promise<void> {
  //    // this.channelsRepository.save(data);
  //    await this.channelsRepository.createdbchannel(data);
  //}

  //async getdbchannel(name : string) : Promise<channels> {
  //    return this.channelsRepository.getdbchannel(name);
  //}

  //async getdbchannel_id(name : string) : Promise<number> {
  //    return this.channelsRepository.getdbchannel_id(name);
  //}

  // async getUserschannel(channel_id : string, user_name : string)
  // {
  //     return this.channelsRepository.getUserschannel(channel_id, user_name);
  // }
}
