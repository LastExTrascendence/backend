import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { userSessionDto } from "src/user/dto/user.dto";

/**
 * @description Request 객체에서 user 정보를 가져오는 커스텀 데코레이터
 * @param data - 데코레이터에서 사용할 데이터
 * @param ctx - ExecutionContext 객체
 * @returns {userSessionDto} - Request 객체에서 가져온 user 정보
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as Request & {
      user: userSessionDto;
    };
    return request.user;
  },
);
