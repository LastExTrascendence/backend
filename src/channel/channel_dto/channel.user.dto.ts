export interface channel_user_dto {
  id: number;
  userId: string;
  channelId: number;
  role: string;
  createdAt: Date;
  deletedAt: Date;
}
