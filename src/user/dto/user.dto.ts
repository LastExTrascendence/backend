import {
  IsBase64,
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserStatus } from "../entity/user.enum";

/**
 * @description 유저 정보를 담은 DTO
 * @param {number} id - 유저의 고유 ID
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 URL / Hash 값
 * @param {string} email - 유저의 42 Intra Email
 * @param {boolean} two_fa - 유저의 2FA 사용 여부
 * @param {UserStatus} status - 유저 접속상태
 */
export class userDto {
  id: number;

  @IsString()
  @MinLength(4)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9-_]+$/) // 영문, 숫자, 특수문자(-, _)만 허용
  nickname: string | null;

  @IsBase64()
  avatar: string | null;

  @IsEmail()
  email: string;

  @IsBoolean()
  two_fa: boolean;

  status: UserStatus;
}

/**
 * @description JWT 토큰 내 유저 세션 정보를 담은 DTO
 *
 * @param {string} intra_name - 유저의 고유 42 Intra ID
 * @param {number} iat - JWT 발급 시간
 * @param {number} ext - JWT 만료 시간
 * @extends {userDto}
 */
export class userSessionDto extends userDto {
  intra_name: string;
  two_fa_complete: boolean;
  language: string;
  iat?: number;
  ext?: number;
}

/**
 * @description 유저의 기본 정보를 담은 DTO
 * @param {id} id - 유저의 고유 ID
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 URL / Hash 값
 * @param {UserStatus} status - 유저 접속상태
 */
export class userInfoDto {
  id: number;
  nickname: string | null;
  avatar: string | null;
  status: UserStatus;
  language: string;
}

export class userOtpDto {
  userId: number;
  otp: string;
}

export class userBlockDto {
  id: number;
  user_id: number;
  blocked_user_id: number;
  created_at: Date;
}

export class userAddFriendRequestDto {
  nickname: string;
}

export class userRemoveFriendRequestDto {
  nickname: string;
}

export class userFriendDto {
  id: number;
  user_id: number;
  friend_user_id: number;
  followed_at: Date;
}

export class userRegisterDataDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9-_]+$/) // 영문, 숫자, 특수문자(-, _)만 허용
  nickname: string;

  avatar: string;
}
