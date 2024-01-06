import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatChannelUserRole } from "../channel.enum";
import { channels } from "./channels.entity";
import { channel } from "diagnostics_channel";
@Entity()
export class channelUser extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne()
  @Column()
  userId: number;

  //@ManyToOne(() => channels, channels => channels.id, {eager: true})
  //channel_id: channels[];

  @Column()
  channelId: number;
  // @ManyToOne(() => channels, channel => channel.channel_users, { eager: true })
  // channel_id: channels;

  @Column()
  role: ChatChannelUserRole;

  @Column()
  mute: boolean;

  @Column()
  ban: boolean;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;
}
