import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Status } from "../user.enum";

@Entity()
export class user_block extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  blocked_id: number;

  @Column()
  created_at: Date;
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능
