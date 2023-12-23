import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Channel_Status } from "../channel.enum";
import { channel_user } from "./channel.user.entity";

@Entity()
export class channels extends BaseEntity{
    @PrimaryGeneratedColumn()
    @OneToMany(() => channel_user, channel_user => channel_user.channel_id, {eager: false})
    id: number;

    // @OneToMany(() => channel_user, channel_user => channel_user.channel_id, { eager: false })
    // channel_users: channel_user[];

    @Column()
    name : string;

    @Column()
    type: Channel_Status;

    @Column()
    description: string;

    @Column()
    created_at : Date;

    @Column()
    deleted_at : Date;

}