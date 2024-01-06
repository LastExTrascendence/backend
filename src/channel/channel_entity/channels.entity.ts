import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Channel_Status } from "../channel.enum";
import { channelUser } from "./channel.user.entity";
import { ChannelPolicy, ChatChannelUserDto } from "../channel_dto/channels.dto";

@Entity()
export class channels extends BaseEntity {
  @PrimaryGeneratedColumn()
  //  @OneToMany(() => channel_user, (channel_user) => channel_user.channel_id, {
  //    eager: false,
  //  })
  id: number;

  @Column()
  title: string;

  @Column()
  channelpolicy: ChannelPolicy;

  @Column()
  creator: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  curuser: number;

  @Column()
  maxuser: number;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
