import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GameUserRole } from "../enum/game.enum";

/**
 * @description 게임 유저에 대한 엔터티
 *
 * @param {number} id - 게임 유저의 고유 ID
 * @param {number} gameId - 게임 유저가 속한 게임의 고유 ID
 * @param {number} userId - 게임 유저의 고유 ID
 * @param {GameUserRole} gameUserRole - 게임 유저의 권한 (CREATOR/USER)
 * @param {number} score - 게임 유저의 점수
 */

@Entity()
export class gamePlayers extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  //@ManyToOne(() => Game, (game) => game.id, { eager: true })
  @Column()
  gameId: number;

  // @ManyToOne()
  @Column()
  userId: number;

  @Column()
  gameUserRole: GameUserRole;

  @Column()
  score: number;
}
