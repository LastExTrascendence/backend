import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GameUserRole } from "../enum/game.enum";

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
