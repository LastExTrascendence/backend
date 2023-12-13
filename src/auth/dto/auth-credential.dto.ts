//import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class AuthDto{
    // @IsString()
    // @MinLength(4)
    // @MaxLength(20)
    username: string;

    // @IsString()
    // @MinLength(4)
    // @MaxLength(20)
    // @Matches(/^[a-zA-Z0-9]*$/,{
    //     message: 'passwrod only accepts english and number'
    // })
    userId : string;

    profile : string;

    accessToken : string;
}