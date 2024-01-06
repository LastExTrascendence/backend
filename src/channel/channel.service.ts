import { InjectRepository } from "@nestjs/typeorm";
//import { ChannelsRepository } from "./channels.repository";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { channels } from "./channel_entity/channels.entity";
import { Repository } from "typeorm";
import {
  ChatChannelUserDto,
  ChatChannelListDto,
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
    //private channelsRepository: ChannelsRepository
    private RedisClient: Redis,
  ) {}

  // constructor(
  //     @InjectRepository(channels) private channelsRepository:Repository<channels>,
  // ){ }

  async createChannel(
    chatChannelListDto: ChatChannelListDto,
  ): Promise<any | HttpException> {
    try {
      const ChannelInfo = await this.RedisClient.lrange(
        `${chatChannelListDto.title}`,
        0,
        -1,
      );

      if (
        (await ChannelInfo).find((title) => title === chatChannelListDto.title)
      ) {
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

      console.log("test");

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

      const totalChannel = {
        title: chatChannelListDto.title,
        password: null,
        creator: chatChannelListDto.creator,
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
        channelPolicy: chatChannelListDto.channelPolicy,
      };
      //await this.RedisClient.rpush(`${req.name}`, `user id: ${req.user_id}`);
      // 피그마에 따라 프론트에서 받아야할 데이터 추후 수정 필요
      // name, creator, 채널 내 유저 수 (유저 수 / 방 정원), type
      return totalChannel;
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

  async getChannels(req: any): Promise<ChatChannelUserDto[] | HttpException> {
    try {
      const rooms: channels[] = await this.channelsRepository.find();

      if (!rooms) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "존재하는 채널이 없습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log(rooms);

      const channels = [];

      for (let i = 0; i < rooms.length; i++) {
        let roomInfo = {
          id: rooms[i].id,
          title: rooms[i].title,
          channelPolicy: rooms[i].channelPolicy,
          password: null,
          creator: {
            nickname: rooms[i].creatorNick,
            avatar: rooms[i].creatorAvatar,
          },
          maxUser: rooms[i].maxUser,
          curUser: rooms[i].curUser,
        };
        channels.push(roomInfo);
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
