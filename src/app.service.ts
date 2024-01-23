import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  constructor() {}

  getHello(): string {
    return "비키세요 트센막차 지나갑니다<br /><br />For Docker HealthTest";
  }
}
