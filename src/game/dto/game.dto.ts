import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  GameType,
  GameMode,
  GameChannelPolicy,
  GameStatus,
  GameUserRole,
  GameResult,
} from "../enum/game.enum";
import { Server, Socket } from "socket.io";
import { GameService } from "../game.service";

/**
 * @description 게임유저의 기본 정보를 담은 DTO
 *
 * @param {string} nickname - 게임유저의 닉네임
 * @param {string | null} avatar - 게임유저의 프로필 사진 Base64 값
 */

export class gameUserInfoDto {
  @IsString()
  nickname: string;

  @IsOptional()
  avatar: string | null;
}

/**
 * @description 게임채널 생성 시 필요한 DTO
 *
 * @param {string} title - 게임채널의 제목
 * @param {GameChannelPolicy} channelPolicy - 게임채널의 입장 권한 (PUBLIC/PRIVATE)
 * @param {string | null} password - 게임채널의 비밀번호
 * @param {GameUserInfoDto} creator - 게임채널의 생성자 정보
 */

export class gameChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(12)
  title: string;

  @IsEnum(GameChannelPolicy)
  channelPolicy: GameChannelPolicy;

  @IsOptional()
  password: string | null;

  @IsObject()
  creator: gameUserInfoDto;
}

/**
 * @description 게임채널 입장 시 필요한 DTO
 *
 * @Param {number} id - 게임채널의 ID
 * @param {string} title - 게임채널의 제목
 * @param {GameChannelPolicy} channelPolicy - 게임채널의 입장 권한 (PUBLIC/PRIVATE)
 * @param {string | null} password - 게임채널의 비밀번호
 * @param {number} createId - 게임채널의 생성자 정보
 * @param {GameType} gameType - 게임채널의 게임 타입 (NORMAL/LADDER)
 * @param {GameMode} gameMode - 게임채널의 게임 모드 (NORMAL/SPEED)
 * @param {GameStatus} gameStatus - 게임채널의 게임 상태 (READY/INGAME/DONE)
 */

// 게임채널 리스트 보여줄 시
export class gameChannelListDto {
  @IsOptional()
  id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title: string;

  @IsEnum(GameChannelPolicy)
  gameChannelPolicy: GameChannelPolicy;

  @IsOptional()
  password: string | null;

  @IsNumber()
  creatorId: number;

  curUser: number;

  maxUser: number;

  @IsEnum(GameType)
  gameType: GameType;

  @IsEnum(GameMode)
  gameMode: GameMode;

  gameStatus: GameStatus;
}

/**
 * @description 게임채널 입장 시 필요한 DTO
 *
 * @param {string} title - 게임채널의 제목
 * @param {string | null} password - 게임채널의 비밀번호
 * @param {string} nickname - 게임유저의 닉네임
 */

// 게임채널 입장 시
export class gameUserVerifyDto {
  @IsNumber()
  gameId: number;

  @IsOptional()
  @IsString()
  password: string | null;

  @IsNumber()
  @IsNotEmpty()
  myInfoId: number;
}

/**
 * @description 게임채널 입장 시 필요한 DTO
 *
 * @param {string} nickname - 게임유저의 닉네임
 * @param {GameUserRole} gameStatus - 게임유저의 게임 결과 (WIN/LOSE)
 * @param {GameType} gameUserType - 게임 타입 (NORMAL/LADDER)
 * @param {GameMode} gameUserMode  - 게임 모드 (NORMAL/SPEED)
 * @param {Date} date - 게임 날짜
 */

export class gameRecordDto {
  @IsString()
  nickname: string;

  @IsEnum(GameUserRole)
  gameUserRole: GameResult;

  @IsEnum(GameType)
  gameType: GameType;

  @IsEnum(GameMode)
  gameMode: GameMode;

  @IsDate()
  date: Date;
}

/**
 * @description 프로필 유저 게임 통계를 담은 DTO
 *
 * @param {string} nickname - 게임유저의 닉네임
 * @param {string} longestGame - 게임유저의 최장 게임 시간
 * @param {string} shortestGame - 게임유저의 최단 게임 시간
 * @param {string} averageGameTime - 게임유저의 평균 게임 시간
 * @param {string} totalpointScored - 게임유저의 총 점수
 * @param {string} averageScorePerGame - 게임유저의 총 게임 평균 점수
 * @param {string} avserageScorePerWin - 게임유저의 승리 게임 평균 점수
 */

export class gameStatsDto {
  @IsString()
  nickname: string;

  @IsString()
  longestGame: string;

  @IsString()
  shortestGame: string;

  @IsString()
  averageGameTime: string;

  @IsNumber()
  totalPointScored: string;

  @IsNumber()
  averageScorePerGame: string;

  @IsNumber()
  averageScorePerWin: string;
}

export class homeInfoDto {
  dy: number;

  y: number;

  score: number;
}

export class awayInfoDto {
  dy: number;

  y: number;

  score: number;
}

export class gameInfoDto {
  ballX: number;

  ballY: number;

  ballDx: number;

  ballDy: number;

  ballSize: number;

  width: number;

  height: number;

  map: string;

  paddleWidth: number;

  paddleHeight: number;

  numberOfRounds: number;

  numberOfBounces: number;

  awayInfo: awayInfoDto;

  homeInfo: homeInfoDto;

  cnt: number;

  currentCnt: number;
}

export class gameDictionaryDto {
  gameInfo: gameInfoDto;

  gameLoop: Function;

  homeUserSocket: Socket;

  awayUserSocket: Socket;

  server: Server;
}

export class gameConnectDto {
  socket: Socket;

  gameId: number;

  title: string;
}
