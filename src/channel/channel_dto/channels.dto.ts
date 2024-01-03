import { BaseEntity } from "typeorm";
import { Channel_Status } from "../channel.enum";

export class Channels_dto {
  id: number;
  name: string;
  type: Channel_Status;
  description: string;
  created_at: Date;
  deleted_at: Date;
}

export enum ChannelPolicy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export interface UserInfoDto {
  nickname: string;
  avatar: string;
}

export interface ChannelDto {
  title: string;
  ChannelPolicy: ChannelPolicy;
  password: string | null;
  creator: UserInfoDto;
}

export interface ChatChannelListDto extends Channels_dto {
  title: string;
  ChannelPolicy: ChannelPolicy;
  password: string | null;
  creator: UserInfoDto;
  curUser: number;
  maxUser: number;
}

export enum ChatChannelUserRole {
  CREATOR = "CREATOR",
  OPERATOR = "OPERATOR",
  USER = "USER",
}

// 채팅채널 리스트 보여줄 시
export interface ChatChannelUserDto {
  avatar: string; // base64
  nickname: string;
  role: ChatChannelUserRole;
}

// 채팅채널 진입 시
export interface ChatChannelInfoDto {
  title: string;
  ChannelPolicy: ChannelPolicy;
  users: ChatChannelUserDto[];
}
