import {Module} from "@nestjs/common"
import { SocketClient } from "./socket_client";

@Module({
   providers : [SocketClient], 
})
export class SocketModule {}