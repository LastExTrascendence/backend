import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { channel_user } from "./channel_entity/channel.user.entity";


@Injectable()
export class ChannelUserRepository extends Repository<channel_user>{
    // userId, rooms[]
    // private roomList = new Map<number, string[]>();
        constructor(@InjectRepository(channel_user) private dataSource: DataSource) {
        super(channel_user, dataSource.manager);
    }


    async createuser(user : any) : Promise<channel_user> { 
        return this.save(user);
    }


    // initRoomList(userId: number) {
    //     this.roomList.set(userId, null);
    // }

    // getRoomList(userId: number) {
    //     return this.roomList.get(userId);
    // }
    
}