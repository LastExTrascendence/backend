import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { channelUser } from "./channel.user.entity";
import { ChatChannelUserDto, UserInfoDto } from "../channel_dto/channels.dto";
import { ChannelPolicy } from "../channel.enum";

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
  channelPolicy: ChannelPolicy;

  @Column()
  creatorNick: string;

  @Column({ nullable: true })
  creatorAvatar: string;

  @Column({ nullable: true })
  curUser: number;

  @Column()
  maxUser: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;
}
