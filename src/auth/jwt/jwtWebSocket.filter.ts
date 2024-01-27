import { ArgumentsHost, Catch, HttpException, Logger } from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Catch(WsException, HttpException)
export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
  private logger = new Logger(WebSocketExceptionFilter.name);

  catch(exception: WsException | HttpException, host: ArgumentsHost) {
    this.logger.error(exception);
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const error =
      exception instanceof WsException
        ? exception.getError()
        : exception.getResponse();
    const errDeatil =
      error instanceof Object ? { ...error } : { message: error };
    client.send(
      JSON.stringify({
        event: "exception",
        data: {
          id: (client as any).id,
          rid: data.rid,
          status,
          ...errDeatil,
        },
      }),
    );
  }
}
// export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
//   catch(exception: WsException | HttpException, host: ArgumentsHost) {
// const client = host.switchToWs().getClient<Socket>();
// const status = exception instanceof HttpException ? exception.getStatus() : 500;
// const message = exception.message || null;
// client.emit('exception', { status, message });
//   }
// }
