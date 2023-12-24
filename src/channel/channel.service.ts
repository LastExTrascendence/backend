import { InjectRepository } from "@nestjs/typeorm";
import { ChannelsRepository } from "./channels.repository";
import { Injectable } from "@nestjs/common";
import { channels } from "./channel_entity/channels.entity";
import { Repository } from "typeorm";
import { Channels_dto } from "./channel_dto/channels.dto";

@Injectable()
export class ChannelsService {
    constructor(
        private channelsRepository: ChannelsRepository,
    ) {}

    // constructor(
    //     @InjectRepository(channels) private channelsRepository:Repository<channels>,
    // ){ }

    async createdbchannel(data : any) : Promise<void> {
        // this.channelsRepository.save(data); 
        await this.channelsRepository.createdbchannel(data);
    }

    async getdbchannel(name : string) : Promise<channels> {
        return this.channelsRepository.getdbchannel(name);
    }

    async getdbchannel_id(name : string) : Promise<number> {
        return this.channelsRepository.getdbchannel_id(name);
    }

    

    // async getUserschannel(channel_id : string, user_name : string)
    // {
    //     return this.channelsRepository.getUserschannel(channel_id, user_name);
    // }

}