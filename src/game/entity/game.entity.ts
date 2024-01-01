import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GamePlayers } from "./game.players.entity";
import { Mode, Status, Type } from "./game.enum";

@Entity()
export class Game extends BaseEntity {
  @PrimaryGeneratedColumn()
  //@OneToMany(() => GamePlayers, (GamePlayers) => GamePlayers.game_id, {
  //  eager: false,
  //})
  id: number;

  // @OneToMany(() => channel_user, channel_user => channel_user.channel_id, { eager: false })
  // channel_users: channel_user[];

  @Column()
  type: Type;

  @Column()
  mode: Mode;

  @Column()
  status: Status;

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

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  ended_at: Date;
}
