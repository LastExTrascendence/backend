import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Game } from "./game.entity";
import { Role } from "./game.enum";

@Entity()
export class GamePlayers extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  //@ManyToOne(() => Game, (game) => game.id, { eager: true })
  @Column()
  game_id: number;

  // @ManyToOne()
  @Column()
  user_id: number;

  @Column()
  role: Role;

  @Column()
  score: number;
}
