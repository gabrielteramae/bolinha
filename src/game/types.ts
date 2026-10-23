export type Dir = "left" | "right" | "up" | "down";
export type Phase = "title" | "ready" | "playing" | "dying" | "levelclear" | "paused" | "over";
export type GhostState = "pen" | "leaving" | "out" | "eaten" | "rest";
export type Mode = "scatter" | "chase";
export type ActorKind = "player" | "ghost";

export type GameEvent =
  | { t: "dot" }
  | { t: "power" }
  | { t: "ghost"; pts: number }
  | { t: "death" }
  | { t: "over" }
  | { t: "go" }
  | { t: "level" }
  | { t: "fruit"; pts: number }
  | { t: "life" };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "amber" | "cream" | "coral";
};

export type Floater = { x: number; y: number; text: string; life: number; max: number };

export type Mover = {
  x: number;
  y: number;
  dir: Dir | null;
  nextDir: Dir | null;
  lastDir: Dir;
  committed: boolean;
};

export type Ghost = Mover & {
  id: number;
  state: GhostState;
  release: number;
  rest: number;
  fright: number;
};

export type Fruit = { x: number; y: number; left: number; value: number };

export type Game = {
  phase: Phase;
  level: number;
  score: number;
  best: number;
  lives: number;
  nextLife: number;
  pellets: number[][];
  remaining: number;
  eaten: number;
  player: Mover;
  ghosts: Ghost[];
  mode: Mode;
  modeIndex: number;
  modeT: number;
  frightLeft: number;
  chain: number;
  playTime: number;
  readyT: number;
  deathT: number;
  clearT: number;
  fruit: Fruit | null;
  fruitStage: number;
  shake: number;
  particles: Particle[];
  floats: Floater[];
  events: GameEvent[];
};
