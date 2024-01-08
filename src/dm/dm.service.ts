//import {
//  ConflictException,
//  Injectable,
//  InternalServerErrorException,
//} from "@nestjs/common";
//import { InjectRepository } from "@nestjs/typeorm";
//import { Repository } from "typeorm";
//import { User } from "../user/entity/user.entity";
//import { JwtService } from "@nestjs/jwt";
////import { AuthCredentialsDto } from './dto/auth-credential.dto';
//import { UserService } from "src/user/user.service";
//import { authenticator } from "otplib";
//import axios from "axios";
//import { DmChannelsRepository } from "./dm_channels.repository";
//import { DmDto } from "./dto/dm.dto";
//import { DmChannels } from "./entity/dm.channels.entity";

//@Injectable()
//export class DmService {
//  constructor(private dmchannelsRepository: DmChannelsRepository) {}

//  async createdmchannel(dm_channel: any): Promise<void> {
//    await this.dmchannelsRepository.createdmchannel(dm_channel);
//  }

//  async getdmchannelByName(name: string): Promise<DmChannels> {
//    return await this.dmchannelsRepository.getdmchannelByName(name);
//  }
//}
