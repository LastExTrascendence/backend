import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class DmDto{
  id: number;
  sender : number;
  receiver : string;
  message : string;
  created_at : Date;
}
