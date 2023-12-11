import { Body, Controller, Post, Req, UseGuards, ValidationPipe, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FortyTwoAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { GetUser } from './get-user.decorator';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
    constructor( private authService : AuthService){}
    //localhost:3000/auth/signup
    @Post('/signup')
    signUp(@Body(ValidationPipe) authcredentialsDto : AuthCredentialsDto): Promise<void> {
        return this.authService.signUp(authcredentialsDto);
    }

    @Post('/signin')
    signIn(@Body(ValidationPipe) authCredentialsDto : AuthCredentialsDto): Promise<{accessToken : string}> {
        return this.authService.signIn(authCredentialsDto);
    }

    @Post('/test')
    @UseGuards(AuthGuard())
    test(@Req() req) {
        console.log('req', req);
    }

    @UseGuards(FortyTwoAuthGuard)
    @Get('/42login')
    async FortyTwoAuth(@Req() req) {
      return 'success';
    }
  
    @Get('/redirect')
    @UseGuards(AuthGuard('auth'))
    FortyTwoRedirect(@Req() req) {
      return this.authService.FortyTwoLogin(req)
    }
    //@Post('/authTest')
    //@UseGuards(AuthGuard())
    //authTest(@Req() req) {
    //    console.log(req);
    //}

    //@Post('/test')
    //@UseGuards(AuthGuard())
    //test(@GetUser() user: User) {
    //    console.log('user', user);
    //}
}
