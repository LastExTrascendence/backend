import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Channel_Status } from "../channel.enum";
import { channels } from "./channels.entity";
import { channel } from "diagnostics_channel";
import { ChatChannelUserRole } from "../channel_dto/channels.dto";

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
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
