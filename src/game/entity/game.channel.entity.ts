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
import { Matches } from "class-validator";

/**
 * @description 게임에 대한 엔터티
 *
 * @param {number} id - 게임의 고유 ID
 * @param {number} creator_id - 게임의 생성자 ID
 * @param {string} creator_avatar - 게임의 생성자 프로필 사진 Base64 값
 * @param {string} title - 게임의 제목
 * @param {GameChannelPolicy} game_channel_policy - 게임의 공개 여부 (PUBLIC/PRIVATE)
 * @param {GameType} game_type - 게임의 타입 (SPEED/BOUNCE)
 * @param {GameMode} game_mode - 게임의 모드 (NORMAL/SPEED)
 * @param {GameStatus} game_status - 게임의 상태 (WAITING/PLAYING/ENDED)
 * @param {number} cur_user - 게임의 현재 유저 수
 * @param {number} max_user - 게임의 최대 유저 수
 * @param {Date} created_at - 게임의 생성 시간
 * @param {Date} deleted_at - 게임의 삭제 시간
 */

@Entity()
export class GameChannel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creator_id: number;

  @Column({ nullable: true })
  creator_avatar: string;

  @Column()
  @Matches(/^[a-zA-Z0-9-_]+$/) // 영문, 숫자, 특수문자(-, _)만 허용
  title: string;

  @Column()
  game_channel_policy: GameChannelPolicy;

  @Column()
  game_type: GameType;

  @Column()
  game_mode: GameMode;

  @Column()
  game_status: GameStatus;

  @Column({ nullable: true })
  cur_user: number;

  @Column()
  max_user: number;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
