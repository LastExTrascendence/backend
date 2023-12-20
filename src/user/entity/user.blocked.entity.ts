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
export class User_block extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  // @Unique(["nickname"])
  @Column()
  blocked_user_id: number;

  @Column()
  created_at: Date;

  // @Column()
  // email: string;

  // @Column()
  // "two_fa": boolean;

  // @Column({
  //   type: "enum",
  //   enum: Status,
  //   default: Status.OFFLINE,
  // })
  // status: Status;

  // @Column()
  // created_at: Date;

  // @Column()
  // deleted_at: Date;
  // // @OneToMany(type => Board, board => board.user, {eager:true})
  // // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능
