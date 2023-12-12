import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
// import { Board } from "src/boards/board.entity";

@Entity()
@Unique(['username'])
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id : number;

    @Column()
    username: string;

    @Column()
    password: string;

    // @OneToMany(type => Board, board => board.user, {eager : true })
    // boards: Board[]
}