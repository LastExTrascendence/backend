//import { Injectable, UnauthorizedException } from "@nestjs/common";
//import { PassportStrategy } from "@nestjs/passport";
//import { InjectRepository } from "@nestjs/typeorm";
//import { ExtractJwt, Strategy } from "passport-jwt";
//import { UserRepository } from "./user.repository";
//import { User } from "./user.entity";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserRepository } from "./user.repository";
import { User } from "./user.entity";
import * as Config from 'config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(
        @InjectRepository(UserRepository)
        private userRepository : UserRepository
    ){
        super({
            secretOrKey : process.env.JWT_SECRET || Config.get('jwt.secret'),
            jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken()
        })
    }

    async validate(payload) : Promise<User> {
        const { username } = payload; 
        const user : User = await this.userRepository.findOne({where : {username}});

        if (!user){
            throw new UnauthorizedException();
        }

        return user;
    }
}