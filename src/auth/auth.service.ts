import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credential.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository : Repository<User>   
    ){}

    async signUp(authCredentialsDto: AuthCredentialsDto):Promise<void>{
        //try{
            const {username, password} = authCredentialsDto;
    
            // const salt = await bcrypt.genSalt();
            // const hashedPassword = await bcrypt.hash(password, salt);
    
            const user = this.userRepository.create({username, password});
          //  await this.userRepository.save(authCredentialsDto);
          await this.userRepository.save(user);
            // } catch (error){
            //     if (error.code == '23505'){
            //         throw new ConflictException('Exishting username');
            //     }
            //     else {
            //         console.log('here');
    
            //         throw new InternalServerErrorException();
            //     }
            //     //console.log('error',error);
            // }
    
    }
}