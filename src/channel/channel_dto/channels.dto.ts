import { BaseEntity } from "typeorm";
import { ChannelPolicy, ChatChannelUserRole } from "../channel.enum";

/**
 * @description 채널을 이용하는 유저의 정보를 담은 DTO
 *
 * @param {string} nickname - 채널의 LET 닉네임
 * @param {string} avatar - 채널의 프로필 사진 URL / Hash 값
 */
export class UserInfoDto {
  nickname: string;
  avatar: string;
}

/**
 * @description 각 채널의 기본 정보를 담은 DTO
 *
 * @param {string} title - 채널의 제목
 * @param {ChannelPolicy} ChannelPolicy - 채널의 공개 여부
 * @param {string} password - 채널의 비밀번호
 * @param {UserInfoDto} creator - 채널의 생성자 정보
 */

export class ChannelDto {
  title: string;
  ChannelPolicy: ChannelPolicy;
  password: string | null;
  creator: UserInfoDto;
}

/**
 * @description 채널리스트에서 채널의 기본 정보를 담은 DTO
 *
 * @param {string} title - 채널의 제목
 * @param {ChannelPolicy} ChannelPolicy - 채널의 공개 여부
 * @param {string} password - 채널의 비밀번호
 * @param {number} creatorId - 채널의 생성자 정보
 * @param {number} curUser - 채널의 현재 유저 수
 * @param {number} maxUser - 채널의 최대 유저 수
 */

export class ChatChannelListDto {
  id: number;
  title: string;
  channelPolicy: ChannelPolicy;
  password: string | null;
  creatorId: number;
  curUser: number;
  maxUser: number;
}

/**
 * @description 채팅채널 리스트 보여줄 시
 *
 * @param {string} avatar - 채널의 프로필 사진 URL / Hash 값
 * @param {string} nickname - 채널의 LET 닉네임
 * @param {ChatChannelUserRole} role - 채널의 유저 권한
 */

export class ChatChannelUserDto {
  avatar: string; // base64
  nickname: string;
  role: ChatChannelUserRole;
}

/**
 * @description 채팅채널 진입 시
 *
 * @param {string} title - 채널의 제목
 * @param {ChannelPolicy} ChannelPolicy - 채널의 공개 여부
 * @param {ChatChannelUserDto} users - 채널의 유저 리스트
 */

export class ChatChannelInfoDto {
  title: string;
  channelPolicy: ChannelPolicy;
  users: ChatChannelUserDto;
}

/**
 * @description enter 시 필요한 정보
 *
 * @param {string} title - 채널의 제목
 * @param {string} password - 채널의 비밀번호
 * @param {string} nickname - 채널의 LET 닉네임
 */
export class UserVerify {
  title: string;
  password: string | null;
  nickname: string;
}
