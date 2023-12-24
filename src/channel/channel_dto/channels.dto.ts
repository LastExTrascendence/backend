import { BaseEntity } from "typeorm";
import { Channel_Status } from "../channel.enum";

export class Channels_dto{
    id: number;
    name : string;
    type: Channel_Status;
    description: string;
    created_at : Date;
    deleted_at : Date;
}