import { Logger, OnModuleInit } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserDto } from "src/user/dto/user.dto";
import { SaveOptions, RemoveOptions, Repository } from "typeorm";
import { GameService } from "./game.service";
import { GamePlayerService } from "./game.players.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Game } from "./entity/game.entity";
import { Redis } from "ioredis";
import { GameDto } from "./dto/game.dto";
import { Mode, Role, Status } from "./entity/game.enum";
import { GamePlayers } from "./entity/game.players.entity";

@WebSocketGateway(85, {
  namespace: "game",
  cors: true,
  // cors: {
  //   origin: "http://10.19.239.198:3000",
  //   methods: ["GET", "POST"],
  //   credentials: true
  // }
})
export class GameGateWay {
  private logger = new Logger("GameGameWay");
  constructor(
    private readonly gameService: GameService,
    private readonly gamePlayerService: GamePlayerService,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(GamePlayers)
    private readonly gamePlayerRepository: Repository<GamePlayers>,
    private redisClient: Redis,
  ) {}

  handleRoomCreation(roomName: string) {
    throw new Error("Method not implemented.");
  }
  @WebSocketServer()
  server: Server;

  wsClients = [];

  afterInit() {
    this.logger.debug(`Socket Server Init`);
  }
  handleConnection(Socket: Socket) {}

  handleDisconnect(Socket: Socket) {}

  //----------------------------------------------
  @SubscribeMessage("enter")
  async connectSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    const { game_title, user_id } = data;

    const roomStatus = await this.redisClient.lrange(game_title, 0, -1);

    try {
      if (!roomStatus) {
        await this.redisClient.rpush(game_title, user_id);
      } else if (roomStatus.length > 2) {
        throw new Error("방이 꽉 찼습니다.");
      } else if (roomStatus && roomStatus.includes(user_id)) {
        throw new Error("이미 방에 있습니다.");
      }
    } catch (error) {
      console.log(error);
    }

    console.log(`${user_id}님이 코드: ${game_title}방에 접속했습니다.`);
    console.log(`${user_id}님이 입장했습니다.`);
    const comeOn = `${user_id}님이 입장했습니다.`;
    this.server.emit("comeOn" + game_title, comeOn);
    this.wsClients.push(Socket);
  }

  @SubscribeMessage("leave")
  async leaveGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const { game_title, user_id } = data;

    await this.redisClient.lrem(game_title, 1, user_id);
    const leave = `${user_id}님이 퇴장했습니다.`;
    this.server.emit("leave" + game_title, leave);

    const roomStatus = await this.redisClient.lrange(game_title, 0, -1);
    if (!roomStatus) {
      this.redisClient.del(data.game_title);
    } else if (roomStatus.find((user) => user === user_id)) {
      this.redisClient.del(data.game_title);
    }
  }

  @SubscribeMessage("kick")
  async kickSomeone(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    const { game_title, user_id } = data;

    await this.redisClient.lrem(game_title, 1, user_id);
    const leave = `${user_id}님이 퇴장했습니다.`;
    this.server.emit("leave" + game_title, leave);

    const roomStatus = await this.redisClient.lrange(game_title, 0, -1);
    if (!roomStatus) {
      this.redisClient.del(data.game_title);
    }
  }

  @SubscribeMessage("start")
  async startGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const newGame = {
      type: data.type, // 게임 타입
      mode: data.mode, // 게임 모드
      status: Status.INGAME, // 게임 상태
      minimum_speed: null, // 최소 속도
      average_speed: null, // 평균 속도
      maximum_speed: null, // 최대 속도
      number_of_rounds: data.number_of_rounds, // 라운드 수
      number_of_bounces: null, // 횟수
      created_at: new Date(), // 게임 생성 시간
      ended_at: null, // 게임 종료 시간
    };

    const game = await this.gameRepository.save(newGame);
    this.redisClient.del(data.game_title);

    this.server.emit("msgToClient", "시자ㅏㅏㅏㅏㅏㅏㅏ악 하겠습니다");
    //게임에 대한 id 보내기
    return game.id;
  }

  @SubscribeMessage("win")
  async winGame(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const { game_id, user_id } = data;

    const game = await this.gameRepository.findOne({
      where: { id: game_id },
    });

    game.status = Status.DONE;
    game.ended_at = new Date();

    await this.gameRepository.save(game);

    const gamePlayer = {
      game_id: game_id,
      user_id: user_id,
      score: 5,
      role: Role.WINNER,
    };

    await this.gamePlayerRepository.save(gamePlayer);

    this.server.emit("msgToClient", "게임이 종료되었습니다.");
  }

  @SubscribeMessage("timeout")
  async timeOut(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const { game_id, user_id } = data;

    const game = await this.gameRepository.findOne({
      where: { id: game_id },
    });

    game.status = Status.DONE;
    game.ended_at = new Date();

    await this.gameRepository.save(game);

    const gamePlayer = {
      game_id: game_id,
      user_id: user_id,
      score: 0,
      role: Role.LOSER,
    };

    await this.gamePlayerRepository.save(gamePlayer);

    this.server.emit("msgToClient", "게임이 종료되었습니다.");
  }

  @SubscribeMessage("dropout")
  async dropOut(@MessageBody() data: any, @ConnectedSocket() Socket: Socket) {
    const { game_id, user_id } = data;

    const game = await this.gameRepository.findOne({
      where: { id: game_id },
    });

    game.status = Status.DONE;
    game.ended_at = new Date();

    await this.gameRepository.save(game);

    const gamePlayer = {
      game_id: game_id,
      user_id: user_id,
      score: 0,
      role: Role.LOSER,
    };

    await this.gamePlayerRepository.save(gamePlayer);

    this.server.emit("msgToClient", "게임이 종료되었습니다.");
  }

  @SubscribeMessage("finish")
  async finishGame(
    @MessageBody() data: any,
    @ConnectedSocket() Socket: Socket,
  ) {
    const game = await this.gameRepository.findOne({
      where: { id: data.game_id },
    });

    game.minimum_speed = data.minimum_speed;
    game.average_speed = data.average_speed;
    game.maximum_speed = data.maximum_speed;
    game.number_of_bounces = data.number_of_bounces;
    game.status = Status.DONE;
    game.ended_at = new Date();

    await this.gameRepository.save(game);

    const redPlayer = {
      game_id: data.game_id,
      user_id: data.redPlayer,
      score: data.redScore,
      role: data.redScore > data.blueScore ? Role.WINNER : Role.LOSER,
    };

    const bluePlayer = {
      game_id: data.game_id,
      user_id: data.bluePlayer,
      score: data.blueScore,
      role: data.redScore > data.blueScore ? Role.WINNER : Role.LOSER,
    };

    await this.gamePlayerRepository.save(redPlayer);
    await this.gamePlayerRepository.save(bluePlayer);

    this.server.emit("msgToClient", "게임이 종료되었습니다.");
  }

  private broadcast(event, client, message: any) {
    for (let c of this.wsClients) {
      if (client.id == c.id) continue;
      c.emit(event, message);
    }
  }

  @SubscribeMessage("send")
  sendMessage(@MessageBody() data: string, @ConnectedSocket() client) {
    console.log("data", data);
    const [room, nickname, message] = data;
    console.log("----------------------");
    console.log(`${client.id} : ${data}`);
    console.log("room", room);
    console.log("nickname", nickname);
    console.log("message", message);
    console.log("----------------------");
    this.broadcast(room, client, [nickname, message]);
  }
}
