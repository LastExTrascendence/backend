import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Status } from "./user.enum";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Unique(["intra_id"])
  intra_id: string;

  @Column()
  @Unique(["nickname"])
  nickname: string;

  @Column()
  avatar: string;

  @Column()
  email: string;

  @Column()
  "2fa_status": boolean;

  @Column()
  status: Status;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;

  @Column({ nullable: true })
  access_token: string;

  // @OneToMany(type => Board, board => board.user, {eager:true})
  // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능
