import { Logger, OnModuleInit, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SaveOptions, RemoveOptions, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { games } from "./entity/game.entity";
import { Redis } from "ioredis";
import { GameUserRole, GameStatus } from "./enum/game.enum";
import { gamePlayers } from "./entity/game.players.entity";
import { JWTAuthGuard } from "src/auth/jwt/jwtAuth.guard";
import { format } from "date-fns";
import { UserService } from "src/user/user.service";

@WebSocketGateway(85, {
  namespace: "game",
  cors: true,
})
@UseGuards(JWTAuthGuard)
export class GameGateWay {
  private logger = new Logger(GameGateWay.name);
  constructor(
    @InjectRepository(games)
    private gameRepository: Repository<games>,
    @InjectRepository(gamePlayers)
    private gamePlayerRepository: Repository<gamePlayers>,
    private redisClient: Redis,
    private userService: UserService,
  ) {}

  @WebSocketServer()
  server: Server;

  private connectedClients: Map<number, Socket> = new Map();
  private disconnectTimeouts = new Map<number, NodeJS.Timeout>();

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }
  handleConnection(Socket: Socket) {
    this.logger.debug(`Socket Connected`);
  }

  //title :string
  //userId : number

  //minimum_speed: number;
  //average_speed: number;
  //maximum_speed: number;
  //number_of_rounds: number;
  //number_of_bounces: number;
  async handleDisconnect(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    this.logger.debug(`Socket Disconnected`);
    const channelInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });

    if (channelInfo.gameStatus === GameStatus.READY) {
      //게임 준비 상태에서 연결이 끊긴 경우
      const creatorId = await this.redisClient.hget(
        `GM|${data.title}`,
        "cretor",
      );
      const userId = await this.redisClient.hget(`GM|${data.title}`, "user");

      if (creatorId === data.userId) {
        //방장이 나간경우
        if (userId) {
          const targetClient = this.connectedClients.get(parseInt(userId));
          targetClient.disconnect(true);
        }
        await this.gameRepository.update(
          { title: data.title },
          { endedAt: new Date() },
        );
        await this.redisClient.del(`GM|${data.title}`);
      } else if (userId === data.userId) {
        //유저가 나간 경우
        await this.redisClient.hincrby(`GM|${data.title}`, "curUser", -1);
        await this.redisClient.hset(`GM|${data.title}`, "user", null);
      }
      // 게임중에 연결이 끊긴 경우
    } else if (channelInfo.gameStatus === GameStatus.INGAME) {
      await timeOut(data);
    } else if (channelInfo.gameStatus === GameStatus.DONE) {
      if (await this.redisClient.keys(`GM|${data.title}`))
        await this.redisClient.del(`GM|${data.title}`);
    }
  }

  async handleReconnect(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    this.logger.debug(`Socket Reconnected`);
    const channelInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });
    if (channelInfo.gameStatus === GameStatus.INGAME) {
      // Check if there's a pending timeout for the user
      const timeoutId = this.disconnectTimeouts.get(data.userId);

      if (timeoutId) {
        // Cancel the previous timeout
        clearTimeout(timeoutId);
        // Clean up resources, if necessary
        this.disconnectTimeouts.delete(data.userId);

        // Proceed with the game as normal
        this.server.emit("msgToClient", "The game is continuing.");
      }
    }
    // Handle other cases or do nothing if not in-game
  }

  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const { userId, title } = data;

    if ((await this.redisClient.hget(`GM|${title}`, "curUser")) == "2") {
      this.server.emit("msgToClient", "방이 꽉 찼습니다.");
      return;
    }
    this.connectedClients.set(userId, socket);

    const creatorId = await this.redisClient.hget(`GM|${title}`, "creator");

    if (parseInt(creatorId) === userId) {
      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
    } else {
      await this.redisClient.hset(`GM|${title}`, "user", userId);
      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
    }

    const gameChannelInfo = await this.gameRepository.findOne({
      where: { title: title },
    });

    const TotalUserInfo = [];

    const creatorInfo = await this.userService.findUserById(
      parseInt(creatorId),
    );

    const CreatorInfo = {
      id: creatorInfo.id,
      nickname: creatorInfo.nickname,
      avatar: creatorInfo.avatar,
    };

    TotalUserInfo.push(CreatorInfo);

    const user = await this.redisClient.hget(`GM|${title}`, "user");
    if (parseInt(user) !== 0) {
      {
        const userInfo = await this.userService.findUserById(parseInt(user));

        const UserInfo = {
          id: userInfo.id,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
        };
        TotalUserInfo.push(UserInfo);
      }
      socket.join(gameChannelInfo.id.toString());
      this.server.emit("userList", TotalUserInfo);
    }
  }

  //time : 시간
  //title : string 요청
  //sender : number
  //content : string
  @SubscribeMessage("msgToServer")
  async sendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const senderInfo = await this.userService.findUserById(data.sender);

      const gameInfo = await this.gameRepository.findOne({
        where: { title: data.title },
      });

      this.server.to(gameInfo.id.toString()).emit("msgToClient", {
        time: showTime(data.time),
        sender: senderInfo.nickname,
        content: data.content,
      });
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage("start")
  async startGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    await this.gameRepository.update(
      { title: data.title },
      { gameStatus: GameStatus.INGAME },
    );
  }

  //title :string
  //userId : number
  //score : number
  @SubscribeMessage("win")
  async winGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    if (data.score < 0 || data.score > 5) {
      this.server.emit("msgToClient", "잘못된 점수입니다.");
      return;
    }
    const winnerInfo = await this.userService.findUserById(data.winner);

    const gameInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });

    const winPlayer = {
      gameId: gameInfo.id,
      userId: winnerInfo.id,
      gameUserRole: GameUserRole.WINNER,
      score: data.score,
    };
    await this.gamePlayerRepository.save(winPlayer);
  }

  //title :string
  //userId : number
  //score : number
  @SubscribeMessage("lose")
  async loseGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    if (data.score < 0 || data.score > 5) {
      this.server.emit("msgToClient", "잘못된 점수입니다.");
      return;
    }
    const loserInfo = await this.userService.findUserById(data.loser);

    const gameInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });

    const losePlayer = {
      gameId: gameInfo.id,
      userId: loserInfo.id,
      gameUserRole: GameUserRole.LOSER,
      score: data.score,
    };
    await this.gamePlayerRepository.save(losePlayer);
  }

  //title :string
  //minimum_speed: number;
  //average_speed: number;
  //maximum_speed: number;
  //number_of_rounds: number;
  //number_of_bounces: number;
  @SubscribeMessage("finish")
  async finishGame(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    await this.gameRepository.update(
      { title: data.title },
      {
        minimumSpeed: data.minimumSpeed,
        averageSpeed: data.averageSpeed,
        maximumSpeed: data.maximumSpeed,
        numberOfRounds: data.numberOfRounds,
        numberOfBounces: data.numberOfBounces,
        gameStatus: GameStatus.DONE,
        endedAt: new Date(),
      },
    );
  }

  @SubscribeMessage("leaveChannel")
  async leaveChannel(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    const channelInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });

    if (channelInfo.gameStatus === GameStatus.READY) {
      //게임 준비 상태에서 연결이 끊긴 경우
      const creatorId = await this.redisClient.hget(
        `GM|${data.title}`,
        "cretor",
      );
      const userId = await this.redisClient.hget(`GM|${data.title}`, "user");

      if (creatorId === data.userId) {
        //방장이 나간경우
        if (userId) {
          const targetClient = this.connectedClients.get(parseInt(userId));
          targetClient.disconnect(true);
        }
        await this.gameRepository.update(
          { title: data.title },
          { endedAt: new Date() },
        );
        await this.redisClient.del(`GM|${data.title}`);
      } else if (userId === data.userId) {
        //유저가 나간 경우
        await this.redisClient.hincrby(`GM|${data.title}`, "curUser", -1);
        await this.redisClient.hset(`GM|${data.title}`, "user", null);
      }
      // 게임중에 연결이 끊긴 경우
    } else if (channelInfo.gameStatus === GameStatus.INGAME) {
      await timeOut(data);
    } else if (channelInfo.gameStatus === GameStatus.DONE) {
      if (await this.redisClient.keys(`GM|${data.title}`))
        await this.redisClient.del(`GM|${data.title}`);
    }
  }

  @SubscribeMessage("reconnect")
  async Reconnect(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const channelInfo = await this.gameRepository.findOne({
      where: { title: data.title },
    });
    if (channelInfo.gameStatus === GameStatus.INGAME) {
      // Check if there's a pending timeout for the user
      const timeoutId = this.disconnectTimeouts.get(data.userId);

      if (timeoutId) {
        // Cancel the previous timeout
        clearTimeout(timeoutId);
        // Clean up resources, if necessary
        this.disconnectTimeouts.delete(data.userId);

        // Proceed with the game as normal
        this.server.emit("msgToClient", "The game is continuing.");
      }
    }
    // Handle other cases or do nothing if not in-game
  }

  @SubscribeMessage("enterQueue")
  async enterQueue(
    @MessageBody() data: any,
    @ConnectedSocket() socket: Socket,
  ) {
    const { userId, title } = data;
    const gameInfo = await this.gameRepository.findOne({
      where: { title: title },
    });

    const creatorId = await this.redisClient.hget(`GM|${title}`, "creator");

    if (parseInt(creatorId) === userId) {
      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
    } else {
      await this.redisClient.hset(`GM|${title}`, "user", userId);
      await this.redisClient.hincrby(`GM|${title}`, "curUser", 1);
    }

    const TotalUserInfo = [];

    const creatorInfo = await this.userService.findUserById(
      parseInt(creatorId),
    );

    const CreatorInfo = {
      id: creatorInfo.id,
      nickname: creatorInfo.nickname,
      avatar: creatorInfo.avatar,
    };

    TotalUserInfo.push(CreatorInfo);

    const user = await this.redisClient.hget(`GM|${title}`, "user");
    if (parseInt(user) !== 0) {
      {
        const userInfo = await this.userService.findUserById(parseInt(user));

        const UserInfo = {
          id: userInfo.id,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
        };
        TotalUserInfo.push(UserInfo);
      }
      socket.join(gameInfo.id.toString());
      this.server.emit("userList", TotalUserInfo);
    }
  }
}

function showTime(currentDate: Date) {
  const formattedTime = format(currentDate, "h:mm a");
  return formattedTime;
}

async function timeOut(data: any) {
  const game = await this.gameRepository.findOne({
    where: { title: data.title },
  });

  // Set a timeout for 3 minutes
  const timeoutId = setTimeout(
    async () => {
      // 3분내로 들어오지 않았을 경우
      this.server.emit("msgToClient", "The game has ended.");

      if (data.userId === game.creatorId) {
        const defeatPlayer = {
          gameId: game.id,
          userId: data.creatorId,
          score: 0,
          role: GameUserRole.LOSER,
        };

        const winPlayer = {
          gameId: game.id,
          userId: game.userId,
          score: 5,
          role: GameUserRole.WINNER,
        };
        await this.gamePlayerRepository.save(defeatPlayer);
        await this.gamePlayerRepository.save(winPlayer);
      } else if (data.userId !== game.creatorId) {
        const defeatPlayer = {
          gameId: game.id,
          userId: data.userId,
          score: 0,
          role: GameUserRole.LOSER,
        };

        const winPlayer = {
          gameId: game.id,
          userId: game.creatorId,
          score: 5,
          role: GameUserRole.WINNER,
        };
        await this.gamePlayerRepository.save(defeatPlayer);
        await this.gamePlayerRepository.save(winPlayer);
      }
      await this.gameRepository.update(
        { title: data.title },
        {
          deletedAt: new Date(),
          status: GameStatus.DONE,
          minimumSpeed: data.minimumSpeed,
          averageSpeed: data.averageSpeed,
          maximumSpeed: data.maximumSpeed,
          numberOfBounces: data.numberOfBounces,
          endedAt: new Date(),
        },
      );
      this.disconnectTimeouts.delete(data.userId);
    },
    3 * 60 * 1000,
  ); // 3 minutes in milliseconds

  // Save the timeout ID for the user
  this.disconnectTimeouts.set(data.userId, timeoutId);
}

//redis field
//title
//password
//creator
//curUser
//user
