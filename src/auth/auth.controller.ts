import { Body, Controller, Get, Post, UseGuards, ValidationPipe, Req, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { FortyTwoAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credential.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
    constructor(private authService : AuthService, private readonly userService: UserService){
    }
    
    @Get('/42login')
    @UseGuards(FortyTwoAuthGuard)
    async FortyTwoAuth(@Req() req) {
        return 'success';
    }
    
    @Get('/redirect')
    @UseGuards(FortyTwoAuthGuard)
    async redirect(@Req() req: any, @Res({ passthrough: true }) res: Response, @Query('code') code : string) {
        console.log(code)
        console.log('req',req);
        if (req.user) {
            const token = await this.authService.login(req.user);
            console.log('token.accessToken',token.accessToken);
            res.cookie('access_token', token.accessToken, {
                httpOnly: false,
              });
              if (req.user.enableTwoFactorAuth === false) {
                  res.cookie('two_factor_auth', true, {
                      httpOnly: false,
                    });
                }
                res.status(302).redirect(`${process.env.HOST}:${process.env.CLIENT_PORT}`);
            }
        }

    @Post('otp')
    async setOtpCookie(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const body = req.body;
        if (body.otp && body.secret) {
        const isValid = this.authService.isTwoFactorAuthCodeValid(body.otp, body.secret);
        console.log('isValid', isValid);
        if (isValid) {
            res.cookie('two_factor_auth', true, {
            httpOnly: false,
            });
        }
        res.status(302).redirect(`${process.env.HOST}:${process.env.CLIENT_PORT}`);
        }
    }

    //@Get('/42logout')
    //logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    //    res.clearCookie('two_factor_auth');
    //    res.cookie('access_token', '', {
    //      httpOnly: false,
    //    });
    //    // userState를 logout으로 바꾸는 usersService 부르기
    //    if (req.query?.userID) {
    //      this.userService.updateUserState(req.query.userID, 'logout');
    //    } else {
    //      console.log('logout: no user ID in query');
    //    }
    //    res.status(302).redirect(`${process.env.HOST}:${process.env.CLIENT_PORT}`);
    //  }

        
    }