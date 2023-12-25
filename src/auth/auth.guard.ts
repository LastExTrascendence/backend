import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class FortyTwoAuthGuard extends AuthGuard("auth") {}

@Injectable()
export class JWTAuthGuard extends AuthGuard("jwt") {}

@Injectable()
export class loginAuthGuard extends AuthGuard("login") {}
