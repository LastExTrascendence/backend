import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
export class Dm extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    sender_id: string;

    @Column()
    receiver_id: string;

    @Column()
    message : string;

    @Column()
    created_at: Date;

    // @OneToMany(type => Board, board => board.user, {eager:true})
    // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능