import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatChannelPolicy } from "../enum/channel.enum";

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
export class channels extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  channelPolicy: ChatChannelPolicy;

  @Column()
  creatorId: number;

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
