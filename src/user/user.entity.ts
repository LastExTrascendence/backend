import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Status } from "./user.enum";

@Entity()
export class User extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    IntraId: string;

    @Column()
    nickname: string;

    @Column()
    avatar : string;
    
    @Column()
    status : Status

    // @OneToMany(type => Board, board => board.user, {eager:true})
    // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능