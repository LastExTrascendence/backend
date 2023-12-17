import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Status } from "../entity/user.enum";

export class UserDto {
  //automatic increased
  id: number;
  intra_id: string;
  nickname: string;
  avatar: string;
  email: string;
  "2fa_status": boolean;
  status: Status;
  created_at: Date;
  deleted_at: Date;
  access_token: string;
  // @IsString()
  // @MinLengthw(4)
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
  user_id: number;
  blocked_user_id: number;
  created_at: Date;
}

export class UserFriendDto {
  id: number;
  user_id: number;
  friend_user_id: number;
  followed_at: Date;
}
