import { InjectRepository } from "@nestjs/typeorm";
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from "@nestjs/common";
import { Channels } from "./entity/channels.entity";
import { IsNull, Repository } from "typeorm";
import { chatChannelListDto } from "./dto/channels.dto";
import * as bcrypt from "bcrypt";
import { ChannelUser } from "./entity/channel.user.entity";
import { UserService } from "src/user/user.service";
import { ChatChannelPolicy, ChatChannelUserRole } from "./enum/channel.enum";
import { channelUserVerify } from "./dto/channel.user.dto";
import { channelConnectedClients } from "./channel.gateway";
import { userConnectedClients } from "src/user/user.gateway";
import { RedisService } from "src/commons/redis-client.service";

//1. 채널 입장 시 채널 정보를 channels DB에 담기
//2. 채널 입장 시 유저 정보를 channelsUser DB에 담기

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channels)
    private channelsRepository: Repository<Channels>,
    @InjectRepository(ChannelUser)
    private channelUserRepository: Repository<ChannelUser>,
    private userService: UserService,
    private redisClient: RedisService,
  ) {}

  async createChannel(
    chatChannelListDto: chatChannelListDto,
  ): Promise<chatChannelListDto | HttpException> {
    try {
      if (
        await this.channelsRepository.findOne({
          where: { title: chatChannelListDto.title },
        })
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
      } else if (isNaN(chatChannelListDto.maxUser)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "최대 인원은 숫자여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      } else if (
        chatChannelListDto.maxUser < 2 ||
        chatChannelListDto.maxUser > 50
      ) {
        // 최대 인원 수 논의 필요
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "최대 인원은 2명 이상 50명 이하여야 합니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const createInfo = await this.userService.findUserById(
        chatChannelListDto.creatorId,
      );

      const newChannel = {
        title: chatChannelListDto.title,
        channel_policy: ChatChannelPolicy.PUBLIC,
        creator_id: createInfo.id,
        creator_avatar: createInfo.avatar,
        cur_user: 0,
        max_user: chatChannelListDto.maxUser,
        created_at: new Date(),
        deleted_at: null,
      };
      if (
        chatChannelListDto.password &&
        chatChannelListDto.channelPolicy === ChatChannelPolicy.PRIVATE
      ) {
        newChannel.channel_policy = ChatChannelPolicy.PRIVATE;
      }

      await this.channelsRepository.save(newChannel);

      const newChannelInfo = await this.channelsRepository.findOne({
        where: { title: newChannel.title },
      });

      await this.redisClient.hset(
        `CH|${chatChannelListDto.title}`,
        "title",
        chatChannelListDto.title,
      );

      if (
        chatChannelListDto.password &&
        chatChannelListDto.channelPolicy === ChatChannelPolicy.PRIVATE
      ) {
        const hashedPassword = await bcrypt.hash(
          chatChannelListDto.password,
          10,
        );
        await this.redisClient.hset(
          `CH|${chatChannelListDto.title}`,
          "password",
          hashedPassword,
        );
        await this.redisClient.hset(
          `CH|${chatChannelListDto.title}`,
          `ACCESS|${chatChannelListDto.creatorId}`,
          chatChannelListDto.creatorId,
        );
      }

      const retChannelInfo = {
        id: newChannelInfo.id,
        title: newChannel.title,
        channelPolicy: newChannel.channel_policy,
        password: null,
        creatorId: newChannel.creator_id,
        curUser: 0,
        maxUser: chatChannelListDto.maxUser,
      };

      return retChannelInfo;
    } catch (error) {
      throw error;
    }
  }

  //todo : private 시 채널 입장 시 비밀번호 입력
  async enterChannel(
    channelUserVerify: channelUserVerify,
  ): Promise<void | HttpException> {
    try {
      const ChannelInfo = await this.channelsRepository.findOne({
        where: { id: channelUserVerify.channelId },
      });

      if (!ChannelInfo) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "방이 존재하지 않습니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const ChatPassword = await this.redisClient.hgetall(
        `CH|${ChannelInfo.title}`,
      );

      if (channelUserVerify.password) {
        const isMatch = await bcrypt.compare(
          channelUserVerify.password,
          ChatPassword.password,
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
          const userInfo = await this.userService.findUserById(
            channelUserVerify.myInfoId,
          );

          await this.redisClient.hset(
            `CH|${ChannelInfo.title}`,
            `ACCESS|${userInfo.id}`,
            userInfo.id,
          );
        }
      } else {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: "잘못된 요청입니다.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async getChannels(): Promise<chatChannelListDto[] | HttpException> {
    try {
      if (channelConnectedClients.size === 0) {
        await this.resetChatChannel();
        //const channelUserInfo = await this.channelUserRepository.find();
        //for (let i = 0; i < channelUserInfo.length; i++) {
        //  this.channelUserRepository.update(
        //    { id: channelUserInfo[i].id },
        //    { deleted_at: new Date() },
        //  );
        //}
        //const channelsInfo = await this.channelsRepository.find();
        //for (let i = 0; i < channelsInfo.length; i++) {
        //  this.channelsRepository.update(
        //    { id: channelsInfo[i].id },
        //    { cur_user: 0 },
        //  );
        //}
      }

      const channelsInfo = await this.channelsRepository.find({
        where: { deleted_at: IsNull() },
        order: {
          created_at: "ASC",
        },
      });

      if (channelsInfo.length === 0) {
        return [];
        // throw new HttpException(
        //   {
        //     status: HttpStatus.BAD_REQUEST,
        //     error: "존재하는 채널이 없습니다.",
        //   },
        //   HttpStatus.BAD_REQUEST,
        // );
      }

      const totalChannels = [];

      for (let i = 0; i < channelsInfo.length; i++) {
        const user = await this.userService.findUserById(
          channelsInfo[i].creator_id,
        );
        if (user) {
          const channel = {
            id: channelsInfo[i].id,
            title: channelsInfo[i].title,
            channelPolicy: channelsInfo[i].channel_policy,
            creator: {
              nickname: user.nickname,
              avatar: channelsInfo[i].creator_avatar,
            },
            curUser:
              channelConnectedClients.size === 0 ? 0 : channelsInfo[i].cur_user,
            maxUser: channelsInfo[i].max_user,
          };

          totalChannels.push(channel);
        }
      }

      return totalChannels;
    } catch (error) {
      throw error;
    }
  }

  async resetChatChannel() {
    const channelUserInfo = await this.channelUserRepository.find();
    for (let i = 0; i < channelUserInfo.length; i++) {
      this.channelUserRepository.update(
        { id: channelUserInfo[i].id, deleted_at: IsNull() },
        { deleted_at: new Date() },
      );
    }
    const channelsInfo = await this.channelsRepository.find();
    for (let i = 0; i < channelsInfo.length; i++) {
      this.channelsRepository.update(
        { id: channelsInfo[i].id },
        { cur_user: 0 },
      );
    }
  }
}
