import { BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Channel_Status } from "../channel.enum";
import { channels } from "./channels.entity";
import { channel } from "diagnostics_channel";

@Entity()
export class channel_user extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;

    // @ManyToOne()
    @Column()
    user_id : string;

    @ManyToOne(() => channels, channels => channels.id, {eager: true})
    channel_id: channels[];
    
    // @ManyToOne(() => channels, channel => channel.channel_users, { eager: true })
    // channel_id: channels;


    @Column()
    role: string;

    @Column()
    created_at : Date;

    @Column()
    deleted_at : Date;




}