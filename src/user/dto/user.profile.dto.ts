import { Status } from "../entity/user.enum";

/**
 * @description 유저의 기본 정보를 담은 DTO
 * id : 유저 아이디
 * intra_name : 유저의 고유 42 Intra ID
 * nickname : 유저의 닉네임
 * avatar : 유저의 프로필 사진 URL 값
 * email : 유저의 42 Intra Email
 * two_fa : 유저의 2FA 사용 여부
 * status : 유저 접속상태
 * Games : 게임 횟수
 * Wins : 승리 횟수
 * Loses : 패배 횟수
 */

export class UserProfileDto {
  id: number;
  intra_name: string;
  nickname: string;
  avatar: string;
  email: string;
  two_fa: boolean;
  status: Status;

  Games: number;
  Wins: number;
  Loses: number;
}
