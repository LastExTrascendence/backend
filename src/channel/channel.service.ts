import { InjectRepository } from "@nestjs/typeorm";
//import { ChannelsRepository } from "./channels.repository";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { channels } from "./channel_entity/channels.entity";
import { Repository } from "typeorm";
import {
  ChannelPolicy,
  ChannelDto,
  ChatChannelInfoDto,
  ChatChannelUserDto,
  ChatChannelUserRole,
} from "./channel_dto/channels.dto";
import { Redis } from "ioredis";
import * as bcrypt from "bcrypt";
import { channelUser } from "./channel_entity/channel.user.entity";

//1. 채널 입장 시 채널 정보를 channels DB에 담기
//2. 채널 입장 시 유저 정보를 channelsUser DB에 담기

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(channels)
    private channelsRepository: Repository<channels>,
    @InjectRepository(channelUser)
    private channelUserRepository: Repository<channelUser>,
    //private channelsRepository: ChannelsRepository
    private RedisClient: Redis,
  ) {}

  // constructor(
  //     @InjectRepository(channels) private channelsRepository:Repository<channels>,
  // ){ }

  async createChannel(req: any): Promise<number | HttpException> {
    try {
      console.log(req);
      const ChannelInfo = await this.RedisClient.lrange(`${req.title}`, 0, -1);
      const password = await bcrypt.hash(req.password, 10);

      if ((await ChannelInfo).find((title) => title === req.title)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "이미 존재하는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (req.title.length > 20) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방 제목은 20자 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.RedisClient.hset(`${req.title}`, "title", req.title);
      await this.RedisClient.hset(`${req.title}`, "password", password);

      const channelinfo = {
        title: req.title,
        channelPolicy: ChannelPolicy.PUBLIC,
        creator: req.user.nickname,
        curUser: 1,
        maxUser: req.maxUser,
        avatar: req.user.avatar,
        create_at: new Date(),
        delete_at: null,
      };
      if (req.password) {
        channelinfo.channelPolicy = ChannelPolicy.PRIVATE;
      }

      await this.channelsRepository.save(channelinfo);

      const newChannel = await this.channelsRepository.findOne({
        where: { title: channelinfo.title },
      });

      const userInfo = {
        user_id: req.user.id,
        channel_id: newChannel.id,
        role: ChatChannelUserRole.CREATOR,
        mute: false,
        create_at: new Date(),
        delete_at: null,
      };

      await this.channelUserRepository.save(userInfo);
      //await this.RedisClient.rpush(`${req.name}`, `user id: ${req.user_id}`);
      // 피그마에 따라 프론트에서 받아야할 데이터 추후 수정 필요
      // name, creator, 채널 내 유저 수 (유저 수 / 방 정원), type
      return newChannel.id;
    } catch (error) {
      throw error;
    }
  }

  async enterChannel(
    req: any,
    password: string,
  ): Promise<string[] | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(`${req.title}`, 0, -1);
      if (ChannelInfo.length === 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하지 않는 방입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const checkIds = ChannelInfo.filter((value) =>
        /^user nickname: \d+$/.test(value),
      );
      if (password && req.ChannelPolicy === ChannelPolicy.PRIVATE) {
        const isMatch = await bcrypt.compare(password, (await ChannelInfo)[1]);
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
      for (let i = 0; i < (await checkIds).length; i++) {
        if ((await ChannelInfo)[i] === req.user.nickname) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: "이미 방에 존재합니다.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      //await this.RedisClient.rpush(
      //  `${req.title}`,
      //  `user nickname: ${req.nickname}`,
      //);
      return ChannelInfo;
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

        const users: ChatChannelUserDto[] = [
          {
            avatar: channel.avatar,
            nickname: channel.nickname,
            role: channel.role as ChatChannelUserRole,
          },
        ];

        const channelinfo: ChatChannelInfoDto = {
          title: channel.title,
          ChannelPolicy: channel.channelPolicy as ChannelPolicy,
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
