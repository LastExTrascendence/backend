import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatChannelPolicy } from "../enum/channel.enum";
import { Matches } from "class-validator";

/**
 * @description 채널에 대한 엔터티
 *
 * @param {number} id - 채널의 고유 ID
 * @param {string} title - 채널의 제목
 * @param {ChatChannelPolicy} channelPolicy - 채널의 공개 여부 (PUBLIC/PRIVATE)
 * @param {number} creatorId - 채널의 생성자 ID
 * @param {string} creatorAvatar - 채널의 생성자 프로필 사진 Base64 값
 * @param {number} curUser - 채널의 현재 유저 수
 * @param {number} maxUser - 채널의 최대 유저 수
 * @param {Date} createdAt - 채널의 생성 시간
 * @param {Date} deletedAt - 채널의 삭제 시간
 */

@Entity()
export class Channels extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Matches(/^[a-zA-Z0-9-_]+$/)
  title: string;

  @Column()
  channel_policy: ChatChannelPolicy;

  @Column()
  creator_id: number;

  @Column({ nullable: true })
  creator_avatar: string;

  @Column({ nullable: true })
  cur_user: number;

  @Column()
  max_user: number;

  @Column()
  created_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;
}
