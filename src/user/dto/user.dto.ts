import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Status } from "../user.enum";

export class UserCredentialsDto{
    IntraId: string;
    nickname: string;
    avatar : string;
    status : Status
    // @IsString()
    // @MinLength(4)
    // @MaxLength(20)
    // username: string;

    // @IsString()
    // @MinLength(4)
    // @MaxLength(20)
    // @Matches(/^[a-zA-Z0-9]*$/,{
    //     message: 'passwrod only accepts english and number'
    // })
    // password: string;


}