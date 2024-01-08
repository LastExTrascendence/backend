import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatChannelUserRole } from "../channel.enum";
/**
 * @description 채널 유저에 대한 엔터티
 *
 * @param {number} id - 채널 유저의 고유 ID
 * @param {number} userId - 채널 유저의 고유 ID
 * @param {number} channelId - 채널 유저가 속한 채널의 고유 ID
 * @param {ChatChannelUserRole} role - 채널 유저의 권한
 * @param {boolean} mute - 채널 유저의 뮤트 여부
 * @param {boolean} ban - 채널 유저의 밴 여부
 * @param {Date} createdAt - 채널 유저의 생성 시간
 * @param {Date} deletedAt - 채널 유저의 삭제 시간
 */

@Entity()
export class channelUser extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne()
  @Column()
  userId: number;

  @Column()
  channelId: number;

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
