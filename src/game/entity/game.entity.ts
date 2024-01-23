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
 * @param {string} title - 게임의 제목
 * @param {GameChannelPolicy} gameChannelPolicy - 게임의 공개 여부 (PUBLIC/PRIVATE)
 * @param {number} creatorId - 게임의 생성자 ID
 * @param {string} creatorAvatar - 게임의 생성자 프로필 사진 Base64 값
 * @param {GameType} gameType - 게임의 타입 (SPEED/BOUNCE)
 * @param {GameMode} gameMode - 게임의 모드 (NORMAL/SPEED)
 * @param {GameStatus} gameStatus - 게임의 상태 (WAITING/PLAYING/ENDED)
 * @param {number} minimumSpeed - 게임의 최소 속도
 * @param {number} averageSpeed - 게임의 평균 속도
 * @param {number} maximumSpeed - 게임의 최대 속도
 * @param {number} numberOfRounds - 게임의 라운드 수
 * @param {number} numberOfBounces - 게임의 바운스 수
 * @param {number} playTime - 게임의 플레이 시간
 * @param {Date} createdAt - 게임의 생성 시간
 * @param {Date} endedAt - 게임의 종료 시간
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
  play_time: string;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  ended_at: Date;
}
