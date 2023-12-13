import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
// import { UserRepository } from './user.repository';
import { UserCredentialsDto } from './dto/user.dto'
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {Status } from './user.enum';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
    //constructor(private userRepository: UserRepository) {}
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>,
        private jwtService : JwtService
    ){ }

    async createUser(userCredentialsDto: UserCredentialsDto) : Promise<{access_token: string}> {
        const {IntraId, nickname, avatar, status} = userCredentialsDto;
        //const check_user = this.findUser(IntraId);

        const user_db = this.userRepository.create({IntraId, nickname, avatar, status});
        await this.userRepository.save(user_db);
        await this.updateUser(user_db);

        const payload = { username: user_db.IntraId};

        return {access_token: await this.jwtService.sign(payload)};
         //jwt Token => cookie =>res.status(301).redirect(`http://localhost:3333/auth/login/otp`);
        //const user = await this.userRepository.findOne({where : {IntraId}});
        //if (!user) 
        //{
        //}

        
        // if (user && (await bcrypt.compare(IntraId, user.IntraId))){
        //     //유저 토큰 생성 (Secret + payload)
        //     const payload = {IntraId};
        //     const accessToken = await this.jwtService.sign(payload);

        //     return {accessToken : accessToken};
        // }
        // else {
        //     throw new UnauthorizedException('login failed');
        // }

        //const user = this.userRepository.create({IntraId, nickname});
    }

    async updateUser(userCredentialsDto: UserCredentialsDto):Promise<void>{
        userCredentialsDto.status = Status.ONLINE;
    }
    

    async findUser(IntraId: string ): Promise<User> {
        const user = await this.userRepository.findOne({where : {IntraId}});
        //const user = await this.boardRepository.findOne(id);

        //front요청을 해서 정보를 받아서 그 기반으로 유저 생성해서 db담기
        // if (!user){
        //     throw new NotFoundException(`Can't find Board with id ${IntraId}`)
        // }
        return user;
    }

    
    // async signIn(authCredentialDto: AuthCredentialsDto): Promise<{accessToken: string}> {
    //     const {username, password} = authCredentialDto;
    //     //console.log('username', username);
    //     //console.log('password', password);
    //     const user = await this.userRepository.findOne({where : {username}});
    //     //console.log('find user', user);
 
    //     if (user && (await bcrypt.compare(password, user.password))){
    //         //유저 토큰 생성 (Secret + payload)
    //         const payload = {username};
    //         const accessToken = await this.jwtService.sign(payload);

    //         return {accessToken : accessToken};
    //     }
    //     else {
    //         throw new UnauthorizedException('login failed');
    //     }
    // }
}
