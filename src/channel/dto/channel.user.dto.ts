import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ChatChannelUserRole } from "../enum/channel.enum";
/**
 * @description 채팅채널 리스트 보여줄 시
 *
 * @param {string} avatar - 채널의 프로필 사진 Base64 값
 * @param {string} nickname - 채널의 LET 닉네임
 * @param {ChatChannelUserRole} role - 채널의 유저 권한 (CREATOR/USER)
 */

export class ChatChannelUserDto {
  @IsString()
  avatar: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsEnum(ChatChannelUserRole)
  role: ChatChannelUserRole;
}

/**
 * @description enter 시 필요한 정보
 *
 * @param {string} title - 채널의 제목
 * @param {string | null} password - 채널의 비밀번호
 * @param {string} nickname - 채널의 LET 닉네임
 */
export class ChannelUserVerify {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title: string;

  @IsOptional()
  @IsString()
  password: string | null;

  @IsString()
  @IsNotEmpty()
  nickname: string;
}
