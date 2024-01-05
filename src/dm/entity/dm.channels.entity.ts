import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

// import { channel_user } from "./channel.user.entity";

@Entity()
export class DmChannels extends BaseEntity {
  @PrimaryGeneratedColumn()
  //@OneToMany(() => channel_user, channel_user => channel_user.channel_id, {eager: false})
  id: number;

  // @OneToMany(() => channel_user, channel_user => channel_user.channel_id, { eager: false })
  // channel_users: channel_user[];

  @Column()
  name: string;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
