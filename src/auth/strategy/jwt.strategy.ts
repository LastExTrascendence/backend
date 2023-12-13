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
import { User } from "../../user/user.entity";
import * as Config from 'config';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>,
        private jwtService : JwtService
    ){ 
        super({
            secretOrKey : process.env.JWT_SECRET || Config.get('jwt.secret'),
            jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken()
        })
    }

    //username, nickname 유효성 확인
    async validate(payload) : Promise<User> {
        const { IntraId, nickname } = payload; 
        const user : User = await this.userRepository.findOne({where : {IntraId, nickname}});

        if (!user){
            throw new UnauthorizedException();
        }

        return user;
    }
}