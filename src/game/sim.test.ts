import assert from "node:assert/strict";
import test from "node:test";
import { COLS, PLAYER_START, ROWS, TILES, TUNNEL, clonePellets, countPellets } from "./maze.ts";
import { begin, createGame, setDirection, step } from "./sim.ts";

function frames(game: ReturnType<typeof createGame>, n: number) {
  for (let i = 0; i < n; i++) step(game, 1 / 60);
}

test("maze is closed, dotted, and leaves the pen", () => {
  assert.equal(TILES.length, ROWS);
  assert.ok(TILES.every((row) => row.length === COLS));
  const pellets = clonePellets();
  assert.ok(countPellets(pellets) > 100);
  const sx = Math.floor(PLAYER_START.x);
  const sy = Math.floor(PLAYER_START.y);
  const seen = new Set<string>([`${sx},${sy}`]);
  const q = [[sx, sy]];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const cur = q.pop();
    if (!cur) break;
    const [x, y] = cur;
    for (const [dx, dy] of dirs) {
      let nx = x + dx;
      const ny = y + dy;
      if (ny < 0 || ny >= ROWS) continue;
      if (nx < 0 || nx >= COLS) {
        if (TILES[y][0] !== "wall" && TILES[y][COLS - 1] !== "wall") nx = (nx + COLS) % COLS;
        else continue;
      }
      const tile = TILES[ny][nx];
      if (tile !== "floor") continue;
      const key = `${nx},${ny}`;
      if (!seen.has(key)) {
        seen.add(key);
        q.push([nx, ny]);
      }
    }
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (pellets[y][x]) assert.ok(seen.has(`${x},${y}`), `pellet ${x},${y}`);
    }
  }
});

test("walls stop the muncher", () => {
  const game = createGame();
  game.phase = "playing";
  game.player.x = 1.5;
  game.player.y = 2.5;
  game.player.dir = "right";
  game.player.nextDir = "right";
  frames(game, 60);
  assert.ok(Math.abs(game.player.x - 1.5) < 0.08);
  assert.equal(game.player.y, 2.5);
});

test("eats a power pellet and frightens the chase", () => {
  const game = createGame();
  game.phase = "playing";
  game.player.x = 1.5;
  game.player.y = 2.5;
  game.player.dir = "up";
  game.player.nextDir = "up";
  frames(game, 30);
  assert.ok(game.player.y < 2);
  assert.ok(game.frightLeft > 0);
  assert.ok(game.score >= 50);
});

test("wraps through the side tunnel", () => {
  const game = createGame();
  game.phase = "playing";
  const tunnel = TUNNEL.findIndex(Boolean);
  game.player.x = 0.45;
  game.player.y = tunnel + 0.5;
  game.player.dir = "left";
  game.player.nextDir = "left";
  frames(game, 20);
  assert.ok(game.player.x > COLS - 3, `x ${game.player.x}`);
});

test("a chaser leaving the pen reaches the maze", () => {
  const game = createGame();
  game.phase = "playing";
  frames(game, 60 * 6);
  assert.equal(game.ghosts[0].state, "out");
});

test("contact ends the run, frightened contact scores", () => {
  const game = createGame();
  game.phase = "playing";
  const ghost = game.ghosts[0];
  ghost.state = "out";
  ghost.x = game.player.x;
  ghost.y = game.player.y;
  ghost.dir = "left";
  game.player.dir = "left";
  ghost.fright = 0;
  game.frightLeft = 0;
  step(game, 1 / 60);
  assert.equal(game.phase, "dying");

  const hunt = createGame();
  hunt.phase = "playing";
  const edible = hunt.ghosts[0];
  edible.state = "out";
  edible.x = hunt.player.x;
  edible.y = hunt.player.y;
  edible.dir = "left";
  hunt.player.dir = "left";
  edible.fright = 4;
  hunt.frightLeft = 4;
  const before = hunt.score;
  step(hunt, 1 / 60);
  assert.equal(hunt.phase, "playing");
  assert.equal(edible.state, "eaten");
  assert.ok(hunt.score >= before + 200);
});

test("queued direction and a fresh run", () => {
  const game = createGame();
  game.phase = "ready";
  setDirection(game, "left");
  assert.equal(game.player.nextDir, "left");
  game.score = 40;
  begin(game);
  assert.equal(game.score, 0);
  assert.equal(game.phase, "ready");
  assert.equal(game.player.nextDir, null);
});
