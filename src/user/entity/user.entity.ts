import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { UserStatus } from "./user.enum";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Unique(["intra_name"])
  intra_name: string;

  @Column()
  @Unique(["nickname"])
  nickname: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  language: string;

  @Column()
  two_fa: boolean;

  @Column()
  status: UserStatus;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
