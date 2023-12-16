import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Status } from "../entity/user.enum";

export class UserDto{
  id: number;
  intra_id: string;
  nickname: string;
  avatar: string;
  email: string;
  "2fa_status": boolean;
  status: Status;
  created_at: Date;
  deleted_at: Date;
  access_token : string;
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

export class UserBlockDto {

    id: number;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export class UserFriendDto{
    id: number;
  user_id: string;
  friend_user_id: string;
  followed_at: string;
    
}
