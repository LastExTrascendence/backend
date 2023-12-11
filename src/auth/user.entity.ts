import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
export class User extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    username: string;

    @Column()
    password: string;

    // @OneToMany(type => Board, board => board.user, {eager:true})
    // boards: Board[]
}

//@Unique(['username'])
// @Unique(['', 'password']) 가능