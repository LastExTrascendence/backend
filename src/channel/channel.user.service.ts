import { InjectRepository } from "@nestjs/typeorm";
import { ChannelsRepository } from "./channels.repository";
import { Injectable } from "@nestjs/common";
import { channels } from "./channel_entity/channels.entity";
import { Repository } from "typeorm";
import { Channels_dto } from "./channel_dto/channels.dto";
import { ChannelUserRepository } from "./channel.user.repositroy";
import { channel_user } from "./channel_entity/channel.user.entity";

@Injectable()
export class ChannelUserService {
    constructor(
        private channelsRepository: ChannelUserRepository,
    ) {}


    async createuser(user : any) : Promise<channel_user> {
    {
        return this.channelsRepository.createuser(user);
    }
}
}