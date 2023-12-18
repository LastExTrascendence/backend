import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, Repository } from "typeorm";
import { User_friends } from "./entity/user.friends.entity";
import { UserService } from "./user.service";

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(User_friends)
    private friendRepository: Repository<User_friends>,
    private readonly userService: UserService,
  ) {}

  async addFriendUser(
    userId: number,
    friendUserId: number,
  ): Promise<User_friends> {
    try {
      const addingUser = await this.userService.findUserById(userId);
      const friendUser = await this.userService.findUserById(friendUserId);

      const add_id = addingUser.id;
      const follow_id = friendUser.id;
      const checkFriendUser: User_friends = await this.friendRepository.findOne(
        { where: { user_id: add_id, friend_user_id: follow_id } },
      );
      if (checkFriendUser || !addingUser || !friendUser) {
        throw new HttpException(
          "팔로우할 수 없습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      //  .catch(() => null): catch 메서드는 Promise를 해결하는 동안 발생할 수 있는 모든 오류를 처리하는 데 사용됩니다.
      //이 경우 오류가 발생하면 화살표 함수 () => null이 실행되고 friends 변수에 null이 할당됩니다.
      //  const friends = await this.findFriend(friendOfferUser.id).catch(
      //    () => null,
      //  );

      const added_at: Date = new Date();

      const newFriend: User_friends = this.friendRepository.create({
        user_id: add_id,
        friend_user_id: follow_id,
        followed_at: added_at,
      });

      await this.friendRepository.save(newFriend);
      return newFriend;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findFriendUsers(id: number): Promise<User_friends[]> {
    try {
      const user = await this.userService.findUserById(id);

      const user_id = user.id;

      const friendedUser = await this.friendRepository.find({
        where: { user_id },
      });

      if (!friendedUser) {
        throw new HttpException(
          "팔로우할 유저가 존재하지 않습니다.",
          HttpStatus.BAD_REQUEST,
        );
      }

      return friendedUser;
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeFriendUser(
    user_id: number,
    unfollow_user_id: number,
  ): Promise<void> {
    try {
      const friendUser = await this.userService.findUserById(user_id);
      const removingFriend =
        await this.userService.findUserById(unfollow_user_id);

      const friendUserId = friendUser.id;
      const removingFriendId = removingFriend.id;

      await this.friendRepository
        .createQueryBuilder()
        .delete()
        .from(User_friends)
        .where("user_id = :user_id", {
          user_id: friendUserId,
        })
        .andWhere("unfollwing_user_id = :unfollwing_user_id", {
          unfollwing_user_id: removingFriendId,
        })
        .execute();
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
