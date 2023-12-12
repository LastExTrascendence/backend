import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
// import { UserRepository } from './user.repository';
import { UserCredentialsDto } from './dto/user.dto'
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
//import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
    //constructor(private userRepository: UserRepository) {}
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>,
        //private jwtService : JwtService
    ){ }

    async createUser(userCredentialsDto: UserCredentialsDto) : Promise<void> {
        const {IntraId, nickname, avatar, status} = userCredentialsDto;
        const user = await this.userRepository.findOne({where : {IntraId}});
        if (!user)
        {
            const user_db = this.userRepository.create({IntraId, nickname, avatar, status});4
            await this.userRepository.save(user_db);
        }
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
    

    async findUser(IntraId: string ): Promise<User> {
        const user = await this.userRepository.findOne({where : {IntraId}});
        //const user = await this.boardRepository.findOne(id);

        if (!user){
            throw new NotFoundException(`Can't find Board with id ${IntraId}`)
        }
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
