import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GameResult } from "../enum/game.enum";
/**
 * @description 게임 유저에 대한 엔터티
 *
 * @param {number} id - 게임 유저의 고유 ID
 * @param {number} game_id - 게임 유저가 속한 게임의 고유 ID
 * @param {number} user_id - 게임 유저의 고유 ID
 * @param {GameUserRole} game_user_role - 게임 유저의 역할 (WINNER/LOSER)
 * @param {number} score - 게임 유저의 점수
 */

@Entity()
export class GamePlayer extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne()
  @Column()
  user_id: number;
  //@ManyToOne(() => Game, (game) => game.id, { eager: true })
  @Column()
  game_id: number;

  @Column()
  role: GameResult;

  @Column()
  score: number;
}
