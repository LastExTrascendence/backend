import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Status } from "../entity/user.enum";

/**
 * @description 유저의 기본 정보를 담은 DTO
 *
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 URL / Hash 값
 * @param {string} email - 유저의 42 Intra Email
 */
export class UserDto {
  nickname: string;
  avatar: string;
  email: string;
  "2fa_status": boolean;
  status: Status;
}

/**
 * @description JWT 토큰 내 유저 세션 정보를 담은 DTO
 *
 * @param {number} oauth_id - 유저의 고유 42 ID
 * @param {string} oauth_name - 유저의 고유 42 Intra ID
 * @param {number} iat - JWT 발급 시간
 * @param {number} ext - JWT 만료 시간
 * @extends {UserDto}
 */
export class UserSessionDto extends UserDto {
  // oauth_id: number;
  oauth_name: string;
  iat?: number;
  ext?: number;
}

export class UserBlockDto {
  id: number;
  user_id: number;
  blocked_user_id: number;
  created_at: Date;
}

export class UserFriendDto {
  id: number;
  user_id: number;
  friend_user_id: number;
  followed_at: Date;
}
