//import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
//import { InjectRepository } from '@nestjs/typeorm';
//import { Repository } from 'typeorm';
//import { User } from '../user/entity/user.entity';
//import { JwtService } from '@nestjs/jwt';
////import { AuthCredentialsDto } from './dto/auth-credential.dto';
//import { UserService } from 'src/user/user.service';
//import { authenticator } from 'otplib';
//import axios from 'axios';

//@Injectable()
//export class DmService {
//    constructor(private userService: UserService, 
//      private jwtService: JwtService, 
//      @InjectRepository(User) private userRepository:Repository<User>){}

//      // login(user: User): { access_token: string } {
//      //   const payload = { username: user.IntraId};
//      //   return {
//      //     access_token: this.jwtService.sign(payload),
//      //   };
//      // }
//    async login(user: User): Promise<{access_token: string}> {
      
//        const findUser = await this.userService.findUser(user.IntraId)
//        if (!findUser) {
//          return null
//        }
//        else { //백엔드에 finduser, update 요청하기
//          //findUser.userservice.updateuser()
//          const status = findUser.status;
//          if (status === 'OFFLINE')
//          {
//            // this.userService.updateUser();
//            await this.userService.updateUser(findUser);  
//            console.log('사용자는 오프라인 상태입니다.');
//          }

//          //JWT generate 

//    //       const payload = { username: user.nickname, sub: user.userID };
//    // return {
//    //   access_token: this.jwtService.sign(payload),
//    // };
//          console.log('test');
//          const payload = { username: findUser.IntraId};
//          // const payload = findUser.IntraId;
//          console.log(payload);
//          //const result = {
//          //  token: await this.authService.generateJWT(
//          //    user.id,
//          //    auth42Status,
//          //    otpStatus,
//          //  ),
//          //  profileUrl: data.profileUrl,
//          //  otpStatus,
//          //  accessToken42: data.accessToken42,
//          //};
//          return {access_token: await this.jwtService.sign(payload)};

//        }
//  }

//  //async onOtp(user : User): Promise<object> {
//  //  try {
//  //    const finduser = await this.userService.findUser(user.IntraId);
//  //    // const auth42User = await this.userRepository.findOne({where: { userId: user.IntraId },});
//  //    if (auth42User.otpOn === false) 
//  //      auth42User.otpOn = true;
//  //    await this.userRepository.save(auth42User);
//  //    const result = { status: 'otpOn' };
//  //    return result;
//  //  } catch (e) {
//  //    throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
//  //  }
//  //}

//  //async offOtp(userId: number): Promise<object> {
//  //  try {
//  //    const user = await this.userService.findUserById(userId, ['auth42']);
//  //    const auth42User = await this.userRepository.findOne({
//  //      where: { userId: user.id },
//  //    });
//  //    if (auth42User.otpOn === true) auth42User.otpOn = false;
//  //    await this.userRepository.save(auth42User);
//  //    const result = { status: 'otpOff' };
//  //    return result;
//  //  } catch (e) {
//  //    throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
//  //  }
//  //}

  

//    isTwoFactorAuthCodeValid(twoFactorAuthCode: string, secret: string) {
//      return authenticator.verify({
//        token: twoFactorAuthCode,
//        secret: secret,
//      });
//  }

//  //async generateJWT(
//  //  userId: number,
//  //  auth42Status: boolean,
//  //  otpStatus: boolean,
//  //): Promise<string> {
//  //  try {
//  //    const user = await this.userService.findUserById(userId);

//  //    const payload: Payload = {
//  //      id: user.id,
//  //      username: user.username,
//  //      auth42Status,
//  //      otpStatus,
//  //    };

//  //    const token = await this.jwtService.sign(payload);
//  //    this.userService.updateUserToken(userId, token);
//  //    return token;
//  //  } catch (e) {
//  //    throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
//  //  }
//  //}

//}

//    //async signUp(authCredentialsDto: AuthCredentialsDto):Promise<void>{
//    //    //try{
//    //        const {username, password} = authCredentialsDto;
    
//    //        // const salt = await bcrypt.genSalt();
//    //        // const hashedPassword = await bcrypt.hash(password, salt);
    
//    //        const user = this.userRepository.create({username, password});
//    //      //  await this.userRepository.save(authCredentialsDto);
//    //      await this.userRepository.save(user);
//    //        // } catch (error){
//    //        //     if (error.code == '23505'){
//    //        //         throw new ConflictException('Exishting username');
//    //        //     }
//    //        //     else {
//    //        //         console.log('here');
    
//    //        //         throw new InternalServerErrorException();
//    //        //     }
//    //        //     //console.log('error',error);
//    //        // }
    
//    //}