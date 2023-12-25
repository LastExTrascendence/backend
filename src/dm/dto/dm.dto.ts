import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class DmDto{
  id: number;
  sender_id : string;
  receiver_id : string;
  message : string;
  created_at : Date;
}
