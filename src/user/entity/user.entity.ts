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
export class user extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  intra_name: string;

  @Column()
  nickname: string;

  @Column()
  avatar: string;

  @Column()
  two_fa: boolean;

  @Column()
  status: Status;

  @Column()
  create_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
