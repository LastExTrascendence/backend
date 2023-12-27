import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Mode, Role, Type, Status } from "../entity/game.enum";
import { Game } from "../entity/game.entity";

/**
 * @description 유저의 기본 정보를 담은 DTO
 * @param {number} id : 게임 아이디
 * @param {Type} type : 게임 타입, 일반전, 래더전
 * @param {Mode} mode : 게임 모드, 공개, 비공개
 * @param {Status} status : 게임 상태, 준비, 진행, 종료
 * @param {number} minimum_speed : 최소 속도, float
 * @param {number} average_speed : 평균 속도, float
 * @param {number} maximum_speed : 최대 속도, float
 * @param {number} number_of_rounds : 라운드 수, int
 * @param {number} number_of_bounces : 횟수, int
 * @param {Date} created_at : 게임 생성 시간
 * @param {Date} ended_at : 게임 종료 시간
 */
export class GameDto {
  id: number;
  type: Type;
  mode: Mode;
  status: Status;
  minimum_speed: number;
  average_speed: number;
  maximum_speed: number;
  number_of_rounds: number;
  number_of_bounces: number;
  created_at: Date;
  ended_at: Date;
}

/**
 * @description 게임유저의 기본 정보를 담은 DTO
 * @param {number} id : 게임 아이디
 * @param {number} game_id : 게임 아이디
 * @param {number} user_id : 유저 아이디
 * @param {number} score : 점수
 * @param {Role} role : 승패
 */

export class GamePlayersDto {
  id: number;
  game_id: number;
  user_id: number;
  score: number;
  role: Role;
}
