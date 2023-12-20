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
export class user_friend extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  friend_id: number;

  @Column()
  created_at: Date;
}
