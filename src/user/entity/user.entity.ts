import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Status } from "./user.enum";

@Entity()
export class User extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    intra_id: string;

    @Column()
    nickname: string;

    @Column()
    avatar : string;
    
    @Column()
    status : Status

    @Column()
    email: string;
    
    @Column()
    "2fa_status": boolean;

    @Column()
    created_at: Date;

    @Column()
    deleted_at: Date;
    
    @Column()
    access_token: string;


    // @OneToMany(type => Board, board => board.user, {eager:true})
    // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능