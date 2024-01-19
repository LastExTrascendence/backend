import { UserStatus } from "../entity/user.enum";

export class UserFriendListResponseDto {
  id: number;
  nickname: string;
  avatar: string | null;
  status: UserStatus;
}
