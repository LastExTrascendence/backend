import { UserStatus } from "../entity/user.enum";

/**
 * @description 유저의 프로필 페이지 정보를 담은 DTO
 * @param id 유저 아이디
 * @param intra_name 유저의 고유 42 Intra ID
 * @param nickname 유저의 닉네임
 * @param avatar 유저의 프로필 사진 URL 값
 * @param email 유저의 42 Intra Email
 * @param two_fa 유저의 2FA 사용 여부
 * @param status 유저 접속상태
 * @param is_friend 유저의 친구 여부
 * @param at_friend 유저의 친구 추가 시간
 * @param games 게임 횟수
 * @param wins 승리 횟수
 * @param loses 패배 횟수
 */
export class UserProfileDto {
  id: number;
  intra_name: string;
  nickname: string;
  avatar: string;
  email: string;

  is_friend: boolean;
  at_friend: Date;

  games: number;
  wins: number;
  loses: number;
}
