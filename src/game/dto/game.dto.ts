import {
  IsNotEmpty,
  IsNumber,
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
} from "../enum/game.enum";

/**
 * @description 게임유저의 기본 정보를 담은 DTO
 *
 * @param {string} nickname - 게임유저의 닉네임
 * @param {string} avatar - 게임유저의 프로필 사진 Base64 값
 */

export class GameUserInfoDto {
  nickname: string;
  avatar: string;
}

/**
 * @description 게임채널 생성 시 필요한 DTO
 *
 * @param {string} title - 게임채널의 제목
 * @param {GameChannelPolicy} channelPolicy - 게임채널의 입장 권한
 * @param {string | null} password - 게임채널의 비밀번호
 * @param {GameUserInfoDto} creator - 게임채널의 생성자 정보
 */

export class GameChannelDto {
  title: string;
  channelPolicy: GameChannelPolicy;
  password: string | null;
  creator: GameUserInfoDto;
}

/**
 * @description 게임채널 입장 시 필요한 DTO
 *
 * @Param {number} id - 게임채널의 ID
 * @param {string} title - 게임채널의 제목
 * @param {string | null} password - 게임채널의 비밀번호
 * @param {string} nickname - 게임유저의 닉네임
 * @param {GameUserInfoDto} creator - 게임채널의 생성자 정보
 * @param {GameType} gameType - 게임채널의 게임 타입
 * @param {GameMode} gameMode - 게임채널의 게임 모드
 * @param {GameStatus} gameStatus - 게임채널의 게임 상태
 */

// 게임채널 리스트 보여줄 시
export class GameChannelListDto {
  id: number;
  title: string;
  channelPolicy: GameChannelPolicy;
  password: string | null;
  creator: GameUserInfoDto;
  gameType: GameType;
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
export class GameUserVerifyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title: string;

  @IsOptional()
  @IsString()
  password: string | null;

  @IsString()
  @IsNotEmpty()
  nickname: string;
}

/**
 * @description 게임채널 입장 시 필요한 DTO
 *
 * @param {string} nickname - 게임유저의 닉네임
 * @param {string} longestGame - 게임유저의 최장 게임 시간
 * @param {string} shortestGame - 게임유저의 최단 게임 시간
 * @param {string} averageGameTime - 게임유저의 평균 게임 시간
 * @param {number} totalpointScored - 게임유저의 총 점수
 * @param {number} averageScorePerGame - 게임유저의 총 게임 평균 점수
 * @param {number} avserageScorePerWin - 게임유저의 승리 게임 평균 점수
 * @param {number} winStreaks - 게임유저의 연승 횟수
 * @param {number} averageSpeed - 게임유저의 평균 속도
 * @param {number} fatestGame - 게임유저의 최단 게임 시간
 */

export class GameRecordDto {
  @IsString()
  nickname: string;

  @IsString()
  longestGame: string;

  @IsString()
  shortestGame: string;

  @IsString()
  averageGameTime: number;

  @IsNumber()
  totalPointScored: number;

  @IsNumber()
  averageScorePerGame: number;

  @IsNumber()
  averageScorePerWin: number;

  @IsNumber()
  winStreaks: number;

  @IsNumber()
  averageSpeed: number;

  @IsNumber()
  fatestGame: number;
}
