import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthCredentialsDto } from './dto/auth-credential.dto';
import { UserService } from 'src/user/user.service';
import { authenticator } from 'otplib';

@Injectable()
export class AuthService {
    constructor(private userService: UserService, 
      private jwtService: JwtService){}

    login(user: User): { accessToken: string } {
        const payload = { username: user.nickname, sub: user.IntraId };
        return {
          accessToken: this.jwtService.sign(payload),
        };
      }

      isTwoFactorAuthCodeValid(twoFactorAuthCode: string, secret: string) {
        return authenticator.verify({
          token: twoFactorAuthCode,
          secret: secret,
        });

    }

    //async signUp(authCredentialsDto: AuthCredentialsDto):Promise<void>{
    //    //try{
    //        const {username, password} = authCredentialsDto;
    
    //        // const salt = await bcrypt.genSalt();
    //        // const hashedPassword = await bcrypt.hash(password, salt);
    
    //        const user = this.userRepository.create({username, password});
    //      //  await this.userRepository.save(authCredentialsDto);
    //      await this.userRepository.save(user);
    //        // } catch (error){
    //        //     if (error.code == '23505'){
    //        //         throw new ConflictException('Exishting username');
    //        //     }
    //        //     else {
    //        //         console.log('here');
    
    //        //         throw new InternalServerErrorException();
    //        //     }
    //        //     //console.log('error',error);
    //        // }
    
    //}
}