import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { UserStatus } from "../entity/user.enum";

/**
 * @description 유저의 기본 정보를 담은 DTO
 *
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 URL / Hash 값
 * @param {string} email - 유저의 42 Intra Email
 * @param {boolean} two_fa - 유저의 2FA 사용 여부
 * @param {UserStatus} status - 유저 접속상태
 */
export class UserDto {
  id: number;
  nickname: string | null;
  avatar: string | null;
  email: string;
  two_fa: boolean;
  status: UserStatus;
}

/**
 * @description JWT 토큰 내 유저 세션 정보를 담은 DTO
 *
 * @param {string} intra_name - 유저의 고유 42 Intra ID
 * @param {number} iat - JWT 발급 시간
 * @param {number} ext - JWT 만료 시간
 * @extends {UserDto}
 */
export class UserSessionDto extends UserDto {
  intra_name: string;
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
