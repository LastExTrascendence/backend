import { HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { channels } from "./channel_entity/channels.entity";
import { get } from "http";

@Injectable()
export class ChannelsRepository extends Repository<channels> {
  // userId, rooms[]
  // private roomList = new Map<number, string[]>();
  constructor(@InjectRepository(channels) private dataSource: DataSource) {
    super(channels, dataSource.manager);
  }

  async createdbchannel(data: any): Promise<void> {
    await this.save(data);
  }

  async getdbchannelName(name: string): Promise<boolean> {
    const channel = await this.findOne({ where: { name } });
    if (channel) return false;
    return true;
  }

  async getdbchannel(name: string): Promise<channels> {
    const channel = await this.findOne({ where: { name } });
    if (channel) return channel;
    return null;
  }

  async getdbchannel_id(name: string): Promise<number> {
    const id = await this.getdbchannel(name);
    if (!id) throw new HttpException("No channel found", 404);
    return id.id;
  }

  // async getUserschannel(channel_id : string, user_name : string)
  // {
  //     try
  //     {
  //         const channel = await this.getdbchannel(channel_id);
  //         if (!channel)
  //             throw new HttpException('No channel found', 404);
  //         const users = await channel.channel_users;
  //         for (let i = 0; i < users.length; i++)
  //         {
  //             if (users[i].user_id == user_name)
  //                 return users[i];
  //         }
  //     }
  //     catch
  //     {
  //        throw new HttpException('No channel found', 404);
  //     }
  // }

  // initRoomList(userId: number) {
  //     this.roomList.set(userId, null);
  // }

  // getRoomList(userId: number) {
  //     return this.roomList.get(userId);
  // }
}
