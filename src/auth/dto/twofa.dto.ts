import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class TwoFaDto {
  id: number;
  user_id: number;
  otpAuthUrl: string;
}
