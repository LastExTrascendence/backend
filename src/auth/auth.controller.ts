import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credential.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService : AuthService){
    }

        //localhost:3000/auth/signup
        @Post('/signup')
        signUp(@Body(ValidationPipe) authcredentialsDto: AuthCredentialsDto): Promise<void> {
            return this.authService.signUp(authcredentialsDto);
        }
    
}