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

@Entity()
export class games extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  gameChannelPolicy: GameChannelPolicy;

  @Column()
  creatorId: number;

  @Column({ nullable: true })
  creatorAvatar: string;

  @Column()
  gameType: GameType;

  @Column()
  gameMode: GameMode;

  @Column()
  gameStatus: GameStatus;

  @Column({ nullable: true })
  minimumSpeed: number;

  @Column({ nullable: true })
  averageSpeed: number;

  @Column({ nullable: true })
  maximumSpeed: number;

  @Column({ nullable: true })
  numberOfRounds: number;

  @Column({ nullable: true })
  numberOfBounces: number;

  @Column({ nullable: true })
  playTime: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  endedAt: Date;
}
