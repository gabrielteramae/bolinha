import {
  COLS,
  FRUIT_CELL,
  GATE,
  GHOST_SPAWNS,
  PLAYER_START,
  ROWS,
  SCATTER,
  TILES,
  TUNNEL,
  clonePellets,
  countPellets,
  type Tile,
} from "./maze.ts";

export type Dir = "left" | "right" | "up" | "down";
export type Phase = "title" | "ready" | "playing" | "dying" | "levelclear" | "paused" | "over";
export type GhostState = "pen" | "leaving" | "out" | "eaten" | "rest";
export type Mode = "scatter" | "chase";

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

type Mover = {
  x: number;
  y: number;
  dir: Dir | null;
  nextDir: Dir | null;
  lastDir: Dir;
  chose: boolean;
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

const VEC: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

const SCRIPT: [Mode, number][] = [
  ["scatter", 7],
  ["chase", 20],
  ["scatter", 7],
  ["chase", 20],
  ["scatter", 5],
  ["chase", 1e9],
];

const PLAYER_SPEED = 6.05;

export function opposite(dir: Dir): Dir {
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  if (dir === "up") return "down";
  return "up";
}

export function levelMul(level: number): number {
  return Math.min(1.28, 1 + (level - 1) * 0.055);
}

function releaseGap(level: number): number {
  return Math.max(1.7, 2.8 - (level - 1) * 0.22);
}

function passable(kind: "player" | "ghost", state: GhostState, tile: Tile): boolean {
  if (tile === "wall") return false;
  if (kind === "player") return tile === "floor";
  if (state === "out") return tile === "floor";
  return true;
}

function canEnter(kind: "player" | "ghost", state: GhostState, tx: number, ty: number): boolean {
  if (ty < 0 || ty >= ROWS) return false;
  let x = tx;
  if (TUNNEL[ty]) x = ((x % COLS) + COLS) % COLS;
  if (x < 0 || x >= COLS) return false;
  return passable(kind, state, TILES[ty][x]);
}

function cellOf(x: number, y: number): { tx: number; ty: number } | null {
  const ty = Math.floor(y);
  if (ty < 0 || ty >= ROWS) return null;
  let tx = Math.floor(x);
  if (TUNNEL[ty]) tx = ((tx % COLS) + COLS) % COLS;
  else if (tx < 0 || tx >= COLS) return null;
  return { tx, ty };
}

function nearCenter(v: number): boolean {
  const f = ((v % 1) + 1) % 1;
  return Math.abs(f - 0.5) <= 0.2;
}

function makePlayer(): Mover {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    dir: null,
    nextDir: null,
    lastDir: "left",
    chose: false,
  };
}

function makeGhosts(level: number): Ghost[] {
  const gap = releaseGap(level);
  return GHOST_SPAWNS.map((spot, id) => ({
    id,
    x: spot.x,
    y: spot.y,
    dir: "up" as Dir,
    nextDir: null,
    lastDir: "up" as Dir,
    chose: false,
    state: "pen" as GhostState,
    release: 0.85 + id * gap,
    rest: 0,
    fright: 0,
  }));
}

export function createGame(best = 0, level = 1): Game {
  const pellets = clonePellets();
  return {
    phase: "title",
    level,
    score: 0,
    best,
    lives: 3,
    nextLife: 10000,
    pellets,
    remaining: countPellets(pellets),
    eaten: 0,
    player: makePlayer(),
    ghosts: makeGhosts(level),
    mode: "scatter",
    modeIndex: 0,
    modeT: SCRIPT[0][1],
    frightLeft: 0,
    chain: 0,
    playTime: 0,
    readyT: 1.15,
    deathT: 0,
    clearT: 0,
    fruit: null,
    fruitStage: 0,
    shake: 0,
    particles: [],
    floats: [],
    events: [],
  };
}

export function begin(game: Game): void {
  const next = createGame(game.best, 1);
  next.phase = "ready";
  next.readyT = 1.15;
  Object.assign(game, next);
}

function placeRun(game: Game, level: number): void {
  game.player = makePlayer();
  game.ghosts = makeGhosts(level);
  game.mode = "scatter";
  game.modeIndex = 0;
  game.modeT = SCRIPT[0][1];
  game.frightLeft = 0;
  game.chain = 0;
  game.playTime = 0;
  game.fruit = null;
}

function refill(game: Game): void {
  game.pellets = clonePellets();
  game.remaining = countPellets(game.pellets);
  game.eaten = 0;
  game.fruitStage = 0;
  game.fruit = null;
}

export function togglePause(game: Game): void {
  if (game.phase === "playing") game.phase = "paused";
  else if (game.phase === "paused") game.phase = "playing";
}

export function setDirection(game: Game, dir: Dir): void {
  if (game.phase !== "playing" && game.phase !== "ready") return;
  game.player.nextDir = dir;
}

function openDir(kind: "player" | "ghost", state: GhostState, x: number, y: number, dir: Dir): boolean {
  const tx = Math.floor(x) + VEC[dir][0];
  const ty = Math.floor(y) + VEC[dir][1];
  return canEnter(kind, state, tx, ty);
}

function canAdvance(kind: "player" | "ghost", state: GhostState, x: number, y: number, dir: Dir): boolean {
  const [dx, dy] = VEC[dir];
  const noseX = x + dx * 0.501;
  const noseY = y + dy * 0.501;
  const cell = cellOf(noseX, noseY);
  if (!cell) return false;
  return passable(kind, state, TILES[cell.ty][cell.tx]);
}

function wrap(actor: Mover): void {
  const ty = Math.floor(actor.y);
  if (ty < 0 || ty >= ROWS || !TUNNEL[ty]) return;
  if (actor.x < 0) actor.x += COLS;
  else if (actor.x >= COLS) actor.x -= COLS;
}

function moveMover(actor: Mover, dist: number, kind: "player" | "ghost", state: GhostState, steer: () => void): void {
  let left = dist;
  while (left > 1e-6) {
    steer();
    const dir = actor.dir;
    if (!dir) break;
    const step = Math.min(0.05, left);
    const [dx, dy] = VEC[dir];
    const nx = actor.x + dx * step;
    const ny = actor.y + dy * step;
    if (!canAdvance(kind, state, nx, ny, dir)) {
      if (dx) actor.x = Math.floor(actor.x) + 0.5;
      if (dy) actor.y = Math.floor(actor.y) + 0.5;
      steer();
      if (actor.dir && actor.dir !== dir && canAdvance(kind, state, actor.x, actor.y, actor.dir)) {
        continue;
      }
      break;
    }
    actor.x = nx;
    actor.y = ny;
    wrap(actor);
    left -= step;
  }
}

function steerPlayer(player: Mover): void {
  const next = player.nextDir;
  if (!next) return;
  if (!player.dir) {
    if (openDir("player", "out", player.x, player.y, next)) player.dir = next;
    return;
  }
  if (next === opposite(player.dir)) {
    player.dir = next;
    return;
  }
  if (next === player.dir) return;
  if (nearCenter(player.x) && nearCenter(player.y) && openDir("player", "out", player.x, player.y, next)) {
    player.x = Math.floor(player.x) + 0.5;
    player.y = Math.floor(player.y) + 0.5;
    player.dir = next;
  }
}

function targetFor(ghost: Ghost, game: Game): { x: number; y: number } {
  const cell = cellOf(game.player.x, game.player.y);
  const pt = cell ?? { tx: 1, ty: 1 };
  const dir = game.player.dir ?? game.player.lastDir;
  const [dx, dy] = VEC[dir];
  if (ghost.state === "eaten") return { x: GATE.x, y: GATE.y };
  if (ghost.state === "leaving") return { x: GATE.x, y: GATE.y - 1 };
  if (game.mode === "scatter") return SCATTER[ghost.id];
  if (ghost.id === 0) return { x: pt.tx, y: pt.ty };
  if (ghost.id === 1) return { x: pt.tx + dx * 4, y: pt.ty + dy * 4 };
  if (ghost.id === 2) {
    const ahead = { x: pt.tx + dx * 2, y: pt.ty + dy * 2 };
    const lead = game.ghosts[0];
    const lc = cellOf(lead.x, lead.y) ?? { tx: lead.x, ty: lead.y };
    return { x: ahead.x * 2 - lc.tx, y: ahead.y * 2 - lc.ty };
  }
  const d = Math.hypot(pt.tx - ghost.x, pt.ty - ghost.y);
  return d > 6 ? { x: pt.tx, y: pt.ty } : SCATTER[3];
}

function chooseGhostDir(ghost: Ghost, game: Game): Dir {
  const tx = Math.floor(ghost.x);
  const ty = Math.floor(ghost.y);
  const allowReverse = ghost.state !== "out" || ghost.fright > 0;
  const order: Dir[] = ["up", "left", "down", "right"];
  const options = order.filter((dir) => {
    if (!allowReverse && ghost.dir && dir === opposite(ghost.dir)) return false;
    return canEnter("ghost", ghost.state, tx + VEC[dir][0], ty + VEC[dir][1]);
  });
  if (options.length === 0) {
    if (ghost.dir) {
      const back = opposite(ghost.dir);
      if (canEnter("ghost", ghost.state, tx + VEC[back][0], ty + VEC[back][1])) return back;
    }
    return ghost.dir ?? "up";
  }
  if (options.length === 1) return options[0];
  if (ghost.state === "out" && ghost.fright > 0) return options[(Math.random() * options.length) | 0];
  const target = targetFor(ghost, game);
  let best = options[0];
  let bestD = Infinity;
  for (const dir of order) {
    if (!options.includes(dir)) continue;
    const nx = tx + VEC[dir][0];
    const ny = ty + VEC[dir][1];
    const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
    if (dist < bestD - 1e-6) {
      bestD = dist;
      best = dir;
    }
  }
  return best;
}

function steerGhost(ghost: Ghost, game: Game): void {
  if (!nearCenter(ghost.x) || !nearCenter(ghost.y)) {
    ghost.chose = false;
    return;
  }
  if (ghost.chose) return;
  const next = chooseGhostDir(ghost, game);
  if (next !== ghost.dir) {
    ghost.x = Math.floor(ghost.x) + 0.5;
    ghost.y = Math.floor(ghost.y) + 0.5;
  }
  ghost.dir = next;
  ghost.lastDir = next;
  ghost.chose = true;
}

function ghostSpeed(ghost: Ghost, game: Game): number {
  const mul = levelMul(game.level) * (game.remaining < 36 && ghost.fright <= 0 ? 1.08 : 1);
  if (ghost.state === "eaten") return 9.2;
  if (ghost.state === "leaving") return 4.1;
  if (ghost.fright > 0) return 3.2 * levelMul(game.level);
  if (ghost.state === "out") return 5.02 * mul;
  return 0;
}

function burst(game: Game, x: number, y: number, n: number, kind: Particle["kind"]): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 5;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.38,
      max: 0.38,
      kind,
    });
  }
  if (game.particles.length > 90) game.particles.splice(0, game.particles.length - 90);
}

function updateFx(game: Game, dt: number): void {
  game.shake = Math.max(0, game.shake - dt * 1.5);
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  if (game.particles.some((p) => p.life <= 0)) game.particles = game.particles.filter((p) => p.life > 0);
  for (const f of game.floats) {
    f.life -= dt;
    f.y -= dt * 0.65;
  }
  if (game.floats.some((f) => f.life <= 0)) game.floats = game.floats.filter((f) => f.life > 0);
}

function reverseOut(game: Game): void {
  for (const ghost of game.ghosts) {
    if (ghost.state !== "out" || !ghost.dir) continue;
    ghost.dir = opposite(ghost.dir);
    ghost.chose = false;
  }
}

function bumpBest(game: Game): void {
  if (game.score > game.best) game.best = game.score;
}

function grantLife(game: Game): void {
  while (game.score >= game.nextLife) {
    game.lives = Math.min(5, game.lives + 1);
    game.nextLife += 10000;
    game.events.push({ t: "life" });
    burst(game, game.player.x, game.player.y, 10, "amber");
  }
}

function eatTiles(game: Game): void {
  const cell = cellOf(game.player.x, game.player.y);
  if (!cell) return;
  const pellet = game.pellets[cell.ty][cell.tx];
  if (pellet === 1) {
    game.pellets[cell.ty][cell.tx] = 0;
    game.remaining -= 1;
    game.eaten += 1;
    game.score += 10;
    game.events.push({ t: "dot" });
  } else if (pellet === 2) {
    game.pellets[cell.ty][cell.tx] = 0;
    game.remaining -= 1;
    game.eaten += 1;
    game.score += 50;
    game.chain = 0;
    game.frightLeft = Math.max(2, 6.4 - (game.level - 1) * 0.45);
    for (const ghost of game.ghosts) {
      if (ghost.state !== "out") continue;
      ghost.fright = game.frightLeft;
      if (ghost.dir) ghost.dir = opposite(ghost.dir);
      ghost.chose = false;
    }
    game.events.push({ t: "power" });
    burst(game, game.player.x, game.player.y, 12, "amber");
  }
  if (!game.fruit) {
    if (game.fruitStage === 0 && game.eaten >= 60) {
      game.fruit = { x: FRUIT_CELL.x + 0.5, y: FRUIT_CELL.y + 0.5, left: 9, value: 300 };
      game.fruitStage = 1;
    } else if (game.fruitStage === 1 && game.eaten >= 150) {
      game.fruit = { x: FRUIT_CELL.x + 0.5, y: FRUIT_CELL.y + 0.5, left: 9, value: 800 };
      game.fruitStage = 2;
    }
  } else if (Math.hypot(game.fruit.x - game.player.x, game.fruit.y - game.player.y) < 0.55) {
    game.score += game.fruit.value;
    game.events.push({ t: "fruit", pts: game.fruit.value });
    game.floats.push({
      x: game.fruit.x,
      y: game.fruit.y,
      text: String(game.fruit.value),
      life: 0.8,
      max: 0.8,
    });
    burst(game, game.fruit.x, game.fruit.y, 8, "amber");
    game.fruit = null;
  }
}

function finishDeath(game: Game): void {
  game.lives -= 1;
  if (game.lives <= 0) {
    game.phase = "over";
    game.events.push({ t: "over" });
    bumpBest(game);
    return;
  }
  placeRun(game, game.level);
  game.phase = "ready";
  game.readyT = 1.15;
  game.deathT = 0;
}

function advanceLevel(game: Game): void {
  game.level += 1;
  refill(game);
  placeRun(game, game.level);
  game.phase = "ready";
  game.readyT = 1.2;
  game.clearT = 0;
}

export function step(game: Game, dt: number): void {
  if (game.phase === "paused" || game.phase === "title" || game.phase === "over") return;
  updateFx(game, dt);
  if (game.phase === "ready") {
    game.readyT -= dt;
    if (game.readyT <= 0) {
      game.phase = "playing";
      game.events.push({ t: "go" });
    }
    return;
  }
  if (game.phase === "dying") {
    game.deathT += dt;
    if (game.deathT >= 0.85) finishDeath(game);
    return;
  }
  if (game.phase === "levelclear") {
    game.clearT += dt;
    if (game.clearT >= 1.2) advanceLevel(game);
    return;
  }

  game.playTime += dt;
  if (game.frightLeft > 0) {
    game.frightLeft -= dt;
    if (game.frightLeft <= 0) {
      game.frightLeft = 0;
      for (const ghost of game.ghosts) ghost.fright = 0;
      reverseOut(game);
    } else {
      for (const ghost of game.ghosts) if (ghost.state === "out") ghost.fright = game.frightLeft;
    }
  } else {
    game.modeT -= dt;
    if (game.modeT <= 0) {
      game.modeIndex = Math.min(SCRIPT.length - 1, game.modeIndex + 1);
      const next = SCRIPT[game.modeIndex];
      game.mode = next[0];
      game.modeT = next[1];
      reverseOut(game);
    }
  }

  if (game.fruit) {
    game.fruit.left -= dt;
    if (game.fruit.left <= 0) game.fruit = null;
  }

  const pSpeed = PLAYER_SPEED * levelMul(game.level);
  moveMover(game.player, pSpeed * dt, "player", "out", () => steerPlayer(game.player));
  if (game.player.dir) game.player.lastDir = game.player.dir;
  eatTiles(game);

  for (const ghost of game.ghosts) {
    if (ghost.state === "pen" && game.playTime >= ghost.release) ghost.state = "leaving";
    if (ghost.state === "rest") {
      ghost.rest -= dt;
      if (ghost.rest <= 0) ghost.state = "leaving";
      continue;
    }
    if (ghost.state === "pen") continue;
    const speed = ghostSpeed(ghost, game);
    moveMover(ghost, speed * dt, "ghost", ghost.state, () => steerGhost(ghost, game));
    const tile = cellOf(ghost.x, ghost.y);
    const kind = tile ? TILES[tile.ty][tile.tx] : "wall";
    if (ghost.state === "eaten" && kind === "pen") {
      ghost.state = "rest";
      ghost.rest = 0.45;
      ghost.fright = 0;
      ghost.chose = false;
    } else if (ghost.state === "leaving" && kind === "floor") {
      ghost.state = "out";
      ghost.fright = game.frightLeft;
      ghost.chose = false;
    }
  }

  for (const ghost of game.ghosts) {
    if (ghost.state !== "out") continue;
    if (Math.hypot(ghost.x - game.player.x, ghost.y - game.player.y) > 0.62) continue;
    if (ghost.fright > 0) {
      const pts = 200 * 2 ** Math.min(3, game.chain);
      game.chain += 1;
      game.score += pts;
      ghost.state = "eaten";
      ghost.fright = 0;
      ghost.chose = false;
      game.events.push({ t: "ghost", pts });
      game.floats.push({ x: ghost.x, y: ghost.y, text: String(pts), life: 0.7, max: 0.7 });
      game.shake = Math.max(game.shake, 0.4);
      burst(game, ghost.x, ghost.y, 10, "cream");
    } else {
      game.phase = "dying";
      game.deathT = 0;
      game.events.push({ t: "death" });
      game.shake = 0.75;
      burst(game, game.player.x, game.player.y, 14, "amber");
      break;
    }
  }

  if (game.phase === "playing" && game.remaining <= 0) {
    game.score += 100 * game.level;
    game.phase = "levelclear";
    game.clearT = 0;
    game.events.push({ t: "level" });
    game.shake = Math.max(game.shake, 0.3);
  }

  grantLife(game);
  bumpBest(game);
}
