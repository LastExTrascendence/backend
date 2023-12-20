import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Status } from "../user.enum";

export class userDto {
  id: number;

  intra_name: string;

  nickname: string;

  avatar: string;

  two_fa: boolean;

  status: Status;

  create_at: Date;

  deleted_at: Date;
}

export class userBlockDto {
  id: number;

  user_id: number;

  friend_id: number;

  created_at: Date;
}

export class userFriendDto {
  id: number;

  user_id: number;

  blocked_id: number;

  created_at: Date;
}
