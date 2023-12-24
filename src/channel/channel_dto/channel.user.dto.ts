export interface channel_user_dto {
    id: number;
    user_id: string;
    channel_id: number;
    role : string;
    created_at: Date;
    deleted_at: Date;
}