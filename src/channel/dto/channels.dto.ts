import { ChatChannelPolicy, ChatChannelUserRole } from "../enum/channel.enum";
import { chatChannelUserDto } from "./channel.user.dto";
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * @description 채널을 이용하는 유저의 정보를 담은 DTO
 *
 * @param {string} nickname - 채널의 LET 닉네임
 * @param {string} avatar - 채널의 프로필 사진 URL / Hash 값
 */
export class chatUserInfoDto {
  @IsString()
  nickname: string;

  @IsString()
  avatar: string;
}

/**
 * @description 각 채널의 기본 정보를 담은 DTO
 *
 * @param {string} title - 채널의 제목
 * @param {ChatChannelPolicy} ChannelPolicy - 채널의 공개 여부 (PUBLIC/PRIVATE)
 * @param {string | null} password - 채널의 비밀번호
 * @param {userInfoDto} creator - 채널의 생성자 정보 (nickname, avatar)
 */

export class chatChannelDto {
  id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(12)
  title: string;

  @IsEnum(ChatChannelPolicy)
  channelPolicy: ChatChannelPolicy;

  @IsOptional()
  @IsString()
  password: string | null;

  @IsObject()
  creator: chatUserInfoDto;
}

/**
 * @description 채널리스트에서 채널의 기본 정보를 담은 DTO
 *
 * @param {string} title - 채널의 제목
 * @param {ChatChannelPolicy} channelPolicy - 채널의 공개 여부 (PUBLIC/PRIVATE)
 * @param {string | null} password - 채널의 비밀번호
 * @param {ChatUserInfoDto} creator - 채널의 생성자 정보 (nickname, avatar)
 * @param {number} curUser - 채널의 현재 유저 수
 * @param {number} maxUser - 채널의 최대 유저 수
 */

export class chatChannelListDto {
  @IsNumber()
  id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(12)
  title: string;

  @IsEnum(ChatChannelPolicy)
  channelPolicy: ChatChannelPolicy;

  @IsOptional()
  @IsString()
  password: string | null;

  @IsNumber()
  creatorId: number;

  @IsNumber()
  curUser: number;

  @IsNumber()
  maxUser: number;
}

/**
 * @description 채팅채널 진입 시
 *
 * @param {string} title - 채널의 제목
 * @param {ChatChannelPolicy} channelPolicy - 채널의 공개 여부 (PUBLIC/PRIVATE)
 * @param {ChatChannelUserDto} users - 채널의 유저 리스트 (nickname, avatar)
 */

export class chatChannelInfoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12)
  title: string;

  @IsEnum(ChatChannelPolicy)
  channelPolicy: ChatChannelPolicy;

  @IsObject()
  users: chatChannelUserDto;
}
