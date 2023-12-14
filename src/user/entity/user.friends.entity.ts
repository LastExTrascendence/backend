import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Status } from "./user.enum";

@Entity()
export class User_friends extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
  
    // @Unique(["oauth_name"])
    @Column()
    user_id: string;
  
    // @Unique(["nickname"])
    @Column()
    frined_user_id: number;
  
    @Column()
    followrd_at: Date;
  
    // @Column()
    // email: string;
  
    // @Column()
    // "2fa_status": boolean;
  
    // @Column({
    //   type: "enum",
    //   enum: Status,
    //   default: Status.OFFLINE,
    // })
    // status: Status;
  
    // @Column()
    // created_at: Date;
  
    // @Column()
    // deleted_at: Date;
    // // @OneToMany(type => Board, board => board.user, {eager:true})
    // // boards: Board[]
}



//@Unique(['username'])
// @Unique(['', 'password']) 가능