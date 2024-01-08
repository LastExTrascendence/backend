//import { HttpException, Injectable } from "@nestjs/common";
//import { InjectRepository } from "@nestjs/typeorm";
//import { DataSource, Repository } from "typeorm";
//import { DmChannels } from "./entity/dm.channels.entity";
//import { get } from "http";

//@Injectable()
//export class DmChannelsRepository extends Repository<DmChannels> {
//  constructor(@InjectRepository(DmChannels) private dataSource: DataSource) {
//    super(DmChannels, dataSource.manager);
//  }

//  async createdmchannel(data: any): Promise<void> {
//    await this.save(data);
//  }

//  async getdmchannelByName(name: string): Promise<DmChannels> {
//    const channel = await this.findOne({ where: { name } });
//    if (!channel) return null;
//    return channel;
//  }

//  // async getdbchannelName(name : string) : Promise<boolean> {
//  //     const channel =  await this.findOne({where : {name}});
//  //     if (channel)
//  //          return false;
//  //     return true;
//  // }

//  // async getdbchannel(name : string) : Promise<DmChannels> {
//  //     const channel =  await this.findOne({where : {name}});
//  //     if (channel)
//  //          return channel;
//  //     return null;
//  // }

//  // async getdbchannel_id(name : string) : Promise<number> {
//  //     const id = await this.getdbchannel(name);
//  //     console.log(id);
//  //     if (!id)
//  //         throw new HttpException('No channel found', 404);
//  //     return id.id;
//  // }
//}
