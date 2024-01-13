import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  GameChannelPolicy,
  GameMode,
  GameType,
  GameStatus,
} from "../enum/game.enum";

/**
 * @description 게임에 대한 엔터티
 *
 * @param {number} id - 게임의 고유 ID
 * @param {number} room_id - 게임이 속한 방의 고유 ID
 * @param {GameType} game_type - 게임의 타입 (NORMAL/LADDER)
 * @param {GameMode} game_mode - 게임의 모드 (NORMAL/SPEED)
 * @param {GameStatus} game_status - 게임의 상태 (READY/INGAME/DONE)
 * @param {number} minimum_speed - 게임의 최소 속도
 * @param {number} average_speed - 게임의 평균 속도
 * @param {number} maximum_speed - 게임의 최대 속도
 * @param {number} number_of_rounds - 게임의 라운드 수
 * @param {number} number_of_bounces - 게임의 바운스 수
 * @param {number} play_time - 게임의 플레이 시간
 * @param {Date} created_at - 게임의 생성 시간
 * @param {Date} ended_at - 게임의 종료 시간
 */

@Entity()
export class Game extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  channel_id: number;

  @Column()
  game_type: GameType;

  @Column()
  game_mode: GameMode;

  @Column()
  game_status: GameStatus;

  @Column({ nullable: true })
  minimum_speed: number;

  @Column({ nullable: true })
  average_speed: number;

  @Column({ nullable: true })
  maximum_speed: number;

  @Column({ nullable: true })
  number_of_rounds: number;

  @Column({ nullable: true })
  number_of_bounces: number;

  @Column({ nullable: true })
  play_time: number;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  ended_at: Date;
}
