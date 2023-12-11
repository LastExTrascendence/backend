import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		private jwtService: JwtService
	) {}
	async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {

		const { username, password} = authCredentialsDto;
		
		const salt = await bcrypt.genSalt();
		const hashedPassword = await bcrypt.hash(password, salt);

		const user = new User();
		user.username = username;
		user.password = hashedPassword;

		//const user = this.create({ username, password : hasedPassword});
		try {
			await this.userRepository.save(user);
			//왜 user자리에 authCredentialsDto의 차이점
		} catch (error) {
			if (error.code === '23505') {
				throw new ConflictException('Existing username');
			}
			else {
				throw new InternalServerErrorException();
			}
		}
	}
	async signIn(authCredentialDto: AuthCredentialsDto): Promise<{accessToken: string}> {
        const {username, password} = authCredentialDto;
        //console.log('username', username);
        //console.log('password', password);
        const user = await this.userRepository.findOne({where : {username}});
        //console.log('find user', user);
 
        if (user && (await bcrypt.compare(password, user.password))){
            //유저 토큰 생성 (Secret + payload)
            const payload = {username};
            const accessToken = await this.jwtService.sign(payload);

            return {accessToken : accessToken};
        }
        else {
            throw new UnauthorizedException('login failed');
        }
    }
	FortyTwoLogin(req) {
		if (!req.user) {
		  return 'No user from FortyTwo'
		}
	
		return {
		  message: 'User information from FortyTwo',
		  user: req.user
		}
	  }
}