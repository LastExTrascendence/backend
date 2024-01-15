import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

@Entity()
export class UserOtpSecret extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Unique(["user_id"])
  user_id: number;

  @Column({ nullable: true })
  secret: string;

  @Column()
  updated_at: Date;
}
