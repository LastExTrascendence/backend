import { UserStatus } from "../entity/user.enum";
import {
  IsBase64,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * @description 유저의 프로필 페이지 정보를 담은 DTO
 * @param {number} id - 유저의 고유 ID
 * @param {string} intra_name - 유저의 고유 42 Intra ID
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 (base64)
 * @param {string} email - 유저의 42 Intra Email
 * @param {boolean} is_friend - 유저의 친구 여부
 * @param {Date} at_friend - 친구로 추가된 시간
 * @param {number} games - 유저의 게임 횟수
 * @param {number} wins - 유저의 승리 횟수
 * @param {number} loses - 유저의 패배 횟수
 */
export class userProfileDto {
  id: number;
  intra_name: string;
  nickname: string;
  avatar: string;
  email: string;

  is_friend: boolean;
  at_friend: Date;
  language: string;
  games: number;
  wins: number;
  loses: number;
}

export class myProfileResponseDto extends userProfileDto {
  two_fa: boolean;
}

/**
 * @description 유저 프로필을 업데이트할 때 사용하는 DTO
 * @param {string} nickname - 유저의 LET 닉네임
 * @param {string} avatar - 유저의 프로필 사진 (base64)
 * @param {boolean} two_fa - 유저의 2FA 사용 여부
 */
export class updateUserInfoDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9-_]+$/) // 영문, 숫자, 특수문자(-, _)만 허용
  nickname: string | null;

  // @IsBase64()
  avatar: string | null;

  @IsBoolean()
  two_fa: boolean;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[a-zA-Z]+$/) // 영문만 허용
  language: string;
}
