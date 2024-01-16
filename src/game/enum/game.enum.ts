export enum GameChannelPolicy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export enum GameStatus {
  READY = "READY",
  INGAME = "INGAME",
  DONE = "DONE",
}

export enum GameType {
  NORMAL = "NORMAL",
  LADDER = "LADDER",
}

export enum GameMode {
  NORMAL = "NORMAL",
  SPEED = "SPEED",
}

export enum GameResult {
  WINNER = "WINNER",
  LOSER = "LOSER",
}

export enum GameTeam {
  HOME = "HOME",
  AWAY = "AWAY",
}

export enum GameUserRole {
  CREATOR = "CREATOR",
  USER = "USER",
}

export const GameComponent = {
  width: 1024,
  height: 600,
  map: {
    normal: "NORMAL",
  },
  paddleWidth: 20,
  paddleHeight: 100,
  ballSize: 10,
  paddleSpeed: 5,
};
