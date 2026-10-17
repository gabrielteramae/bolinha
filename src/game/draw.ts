import { COLS, ROWS, TILES, TUNNEL } from "./maze.ts";
import type { Dir, Game, Particle } from "./sim.ts";

export type Palette = {
  ink: string;
  cream: string;
  amber: string;
  coral: string;
  wall: string;
  wallHi: string;
  line: string;
  muted: string;
};

export const FALLBACK: Palette = {
  ink: "#090b10",
  cream: "#f3ead2",
  amber: "#f0a020",
  coral: "#e85d4c",
  wall: "#234a8a",
  wallHi: "#3e6ec4",
  line: "#2c291f",
  muted: "#a39880",
};

export function paletteFromCss(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fb: string) => style.getPropertyValue(name).trim() || fb;
  return {
    ink: pick("--color-ink", FALLBACK.ink),
    cream: pick("--color-cream", FALLBACK.cream),
    amber: pick("--color-amber", FALLBACK.amber),
    coral: pick("--color-coral", FALLBACK.coral),
    wall: pick("--color-wall", FALLBACK.wall),
    wallHi: pick("--color-wall-hi", FALLBACK.wallHi),
    line: pick("--color-line", FALLBACK.line),
    muted: pick("--color-muted", FALLBACK.muted),
  };
}

function dirAngle(dir: Dir | null): number {
  if (dir === "down") return Math.PI / 2;
  if (dir === "left") return Math.PI;
  if (dir === "up") return -Math.PI / 2;
  return 0;
}

function inkOf(kind: Particle["kind"], pal: Palette): string {
  if (kind === "amber") return pal.amber;
  if (kind === "coral") return pal.coral;
  return pal.cream;
}

export function draw(
  ctx: CanvasRenderingContext2D,
  game: Game,
  cell: number,
  time: number,
  pal: Palette,
  reduce: boolean,
): void {
  const w = COLS * cell;
  const h = ROWS * cell;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (!reduce && game.shake > 0.02) {
    const mag = game.shake * cell * 0.28;
    ctx.translate((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag);
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = TILES[y][x];
      if (tile === "pen" || tile === "gate") {
        ctx.fillStyle = pal.line;
        ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
      }
    }
  }

  ctx.fillStyle = pal.wall;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TILES[y][x] !== "wall") continue;
      ctx.fillRect(x * cell, y * cell, cell + 0.55, cell + 0.55);
    }
  }

  const lip = Math.max(1, cell * 0.11);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TILES[y][x] !== "wall") continue;
      const up = y > 0 && TILES[y - 1][x] === "wall";
      const left = x > 0 && TILES[y][x - 1] === "wall";
      ctx.fillStyle = pal.wallHi;
      if (!up) ctx.fillRect(x * cell, y * cell, cell, lip);
      if (!left) ctx.fillRect(x * cell, y * cell, lip, cell);
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TILES[y][x] !== "gate") continue;
      ctx.fillStyle = pal.wall;
      ctx.fillRect(x * cell, y * cell + cell * 0.12, cell, Math.max(2, cell * 0.16));
    }
  }

  const pulse = reduce ? 1 : 0.78 + Math.sin(time * 0.006) * 0.22;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const pellet = game.pellets[y][x];
      if (!pellet) continue;
      const cx = (x + 0.5) * cell;
      const cy = (y + 0.5) * cell;
      ctx.beginPath();
      if (pellet === 2) {
        ctx.fillStyle = pal.amber;
        ctx.arc(cx, cy, cell * 0.2 * pulse, 0, Math.PI * 2);
      } else {
        ctx.fillStyle = pal.cream;
        ctx.arc(cx, cy, Math.max(1.4, cell * 0.085), 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  if (game.fruit && game.phase !== "title") {
    const fx = game.fruit.x * cell;
    const fy = game.fruit.y * cell;
    ctx.fillStyle = pal.amber;
    ctx.beginPath();
    ctx.moveTo(fx, fy - cell * 0.22);
    ctx.lineTo(fx + cell * 0.2, fy);
    ctx.lineTo(fx, fy + cell * 0.22);
    ctx.lineTo(fx - cell * 0.2, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.cream;
    ctx.fillRect(fx - cell * 0.05, fy - cell * 0.34, cell * 0.1, cell * 0.14);
  }

  for (const ghost of game.ghosts) drawGhost(ctx, ghost, cell, pal, time, reduce);
  drawPlayer(ctx, game, cell, time, pal, reduce);

  for (const p of game.particles) {
    const alpha = Math.max(0, p.life / p.max);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = inkOf(p.kind, pal);
    ctx.fillRect(p.x * cell, p.y * cell, Math.max(2, cell * 0.12), Math.max(2, cell * 0.12));
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = pal.amber;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.max(12, cell * 0.72)}px Syne, Outfit, sans-serif`;
  for (const f of game.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillText(f.text, f.x * cell, f.y * cell);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function paintCopy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  drawAt: (px: number, py: number) => void,
): void {
  drawAt(x * cell, y * cell);
  const ty = Math.floor(y);
  if (ty < 0 || ty >= ROWS || !TUNNEL[ty]) return;
  if (x < 1.3) drawAt((x + COLS) * cell, y * cell);
  if (x > COLS - 1.3) drawAt((x - COLS) * cell, y * cell);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  game: Game,
  cell: number,
  time: number,
  pal: Palette,
  reduce: boolean,
): void {
  const player = game.player;
  const dying = game.phase === "dying";
  const moving = game.phase === "playing" && player.dir;
  const mouth = reduce ? 0.35 : moving ? Math.abs(Math.sin(time * 0.018)) : 0.18 + Math.sin(time * 0.004) * 0.08;
  const shrink = dying ? Math.max(0.15, 1 - game.deathT / 0.85) : 1;
  const spin = dying ? game.deathT * 9 : 0;
  paintCopy(ctx, player.x, player.y, cell, (px, py) => {
    const r = cell * 0.42 * shrink;
    const ang = dirAngle(player.dir ?? player.lastDir) + spin;
    ctx.fillStyle = pal.amber;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    const open = mouth * 0.72;
    if (open > 0.05 && r > 1) {
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, r * 0.98, ang - open, ang + open);
      ctx.closePath();
      ctx.fill();
    }
    const fx = Math.cos(ang);
    const fy = Math.sin(ang);
    const sx = -fy;
    const sy = fx;
    ctx.fillStyle = pal.ink;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(px - fx * r * 0.12 + sx * side * r * 0.28, py - fy * r * 0.12 + sy * side * r * 0.28, Math.max(1, r * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: Game["ghosts"][number],
  cell: number,
  pal: Palette,
  time: number,
  reduce: boolean,
): void {
  const bob = ghost.state === "pen" && !reduce ? Math.sin(time * 0.005 + ghost.id) * cell * 0.06 : 0;
  paintCopy(ctx, ghost.x, ghost.y + bob / cell, cell, (px, py) => {
    const r = cell * 0.36;
    if (ghost.state === "eaten") {
      eyePair(ctx, px, py - r * 0.05, r, pal.cream, pal.ink);
      return;
    }
    const fright = ghost.fright > 0 && ghost.state === "out";
    const flash = fright && ghost.fright < 1.8 && !reduce && Math.floor(ghost.fright * 8) % 2 === 0;
    ctx.fillStyle = flash ? pal.cream : fright ? pal.wall : pal.coral;
    ctx.beginPath();
    shape(ctx, px, py, r, ghost.id, ghost.dir);
    ctx.fill();
    if (fright) {
      ctx.fillStyle = pal.ink;
      ctx.fillRect(px - r * 0.28, py - r * 0.05, r * 0.16, r * 0.16);
      ctx.fillRect(px + r * 0.12, py - r * 0.05, r * 0.16, r * 0.16);
    } else {
      eyePair(ctx, px, py - r * 0.08, r * 0.72, pal.cream, pal.ink);
    }
  });
}

function eyePair(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  r: number,
  cream: string,
  ink: string,
): void {
  for (const side of [-1, 1]) {
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.arc(px + side * r * 0.32, py, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(px + side * r * 0.32, py, Math.max(0.8, r * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }
}

function shape(ctx: CanvasRenderingContext2D, px: number, py: number, r: number, id: number, dir: Dir | null): void {
  if (id === 0) {
    ctx.moveTo(px, py - r);
    ctx.lineTo(px + r * 0.86, py);
    ctx.lineTo(px, py + r);
    ctx.lineTo(px - r * 0.86, py);
    ctx.closePath();
    return;
  }
  if (id === 1) {
    const a = dirAngle(dir);
    ctx.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
    ctx.lineTo(px + Math.cos(a + 2.45) * r * 0.92, py + Math.sin(a + 2.45) * r * 0.92);
    ctx.lineTo(px + Math.cos(a - 2.45) * r * 0.92, py + Math.sin(a - 2.45) * r * 0.92);
    ctx.closePath();
    return;
  }
  if (id === 2) {
    const s = r * 0.78;
    ctx.rect(px - s, py - s, s * 2, s * 2);
    return;
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = px + Math.cos(a) * r;
    const y = py + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
