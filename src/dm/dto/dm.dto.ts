import { IsString, Matches, MaxLength, MinLength } from "class-validator";

/**
 * @description 소켓 통신으로 주고 받기 위한 DTO
 *
 * @param {number} sender - 보내는 사람의 id
 * @param {string} receiver - 받는 사람의 닉네임
 * @param {string} content - 보내는 메시지
 */

export class DmDto {
  sender: number; // mystate id
  receiver: string; // receiver nickname
  content: string; //
}
