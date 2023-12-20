import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserBlock } from "./entity/user.block.entity";
import { UserService } from "./user.service";

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(UserBlock)
    private blockRepository: Repository<UserBlock>,
    private readonly userService: UserService,
  ) {}

  async addBlock(userId: number, blocked_user_id: number): Promise<UserBlock> {
    try {
      const blockingUser = await this.userService.findUserById(userId);
      const blockedUser = await this.userService.findUserById(blocked_user_id);

      const blocking_id = blockedUser.id;
      const blocked_id = blockedUser.id;
      const checkBlockUser: UserBlock = await this.blockRepository.findOne({
        where: { user_id: blocking_id, blocked_id: blocked_id },
      });
      if (checkBlockUser || !blockedUser.id || !blockingUser.intra_name) {
        throw new HttpException("블락할 수 없습니다.", HttpStatus.BAD_REQUEST);
      }
      const created_at: Date = new Date();

      const newBlock: UserBlock = this.blockRepository.create({
        user_id: blockingUser.id,
        blocked_id: blockedUser.id,
        created_at: created_at,
      });

      await this.blockRepository.save(newBlock);
      return newBlock;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findBlock(id: number): Promise<UserBlock[]> {
    try {
      const user = await this.userService.findUserById(id);

      const user_id = user.id;

      const blockedUser = await this.blockRepository.find({
        where: { user_id },
      });

      //해당 유저가 차단 유저가 없는 경우
      if (!blockedUser) {
        throw new HttpException(
          "블락된 유저가 존재하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      return blockedUser;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeBlock(
    blocking_user_id: number,
    blocked_user_id: number,
  ): Promise<void> {
    try {
      const removingUser =
        await this.userService.findUserById(blocking_user_id);
      const removedUser = await this.userService.findUserById(blocked_user_id);

      const blockingUserId = removingUser.id;
      const blockedUserId = removedUser.id;

      //아래 명령어의 쿼리문
      //DELETE FROM UserBlock
      //WHERE user_id = :user_id AND blocked_user_id = :blocked_user_id;

      await this.blockRepository
        .createQueryBuilder()
        .delete()
        .from(UserBlock)
        .where("user_id = :user_id", {
          user_id: blockingUserId,
        })
        .andWhere("blocked_user_id = :blocked_user_id", {
          blocked_user_id: blockedUserId,
        })
        .execute();
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
