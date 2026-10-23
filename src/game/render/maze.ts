import { COLS, ROWS, TILES } from "../maze.ts";
import type { Game } from "../types.ts";
import type { Palette } from "./palette.ts";

export function paintStage(ctx: CanvasRenderingContext2D, cell: number, pal: Palette): void {
  const width = COLS * cell;
  const height = ROWS * cell;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(0, 0, width, height);
}

export function shakeCamera(ctx: CanvasRenderingContext2D, shake: number, cell: number, reduce: boolean): void {
  if (reduce || shake <= 0.02) return;
  const mag = shake * cell * 0.28;
  ctx.translate((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag);
}

function paintTileFill(ctx: CanvasRenderingContext2D, cell: number, color: string, accept: (tile: string) => boolean): void {
  ctx.fillStyle = color;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!accept(TILES[y][x])) continue;
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }
  }
}

export function paintRooms(ctx: CanvasRenderingContext2D, cell: number, pal: Palette): void {
  paintTileFill(ctx, cell, pal.line, (tile) => tile === "pen" || tile === "gate");
}

export function paintWalls(ctx: CanvasRenderingContext2D, cell: number, pal: Palette): void {
  ctx.fillStyle = pal.wall;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TILES[y][x] !== "wall") continue;
      ctx.fillRect(x * cell, y * cell, cell + 0.55, cell + 0.55);
    }
  }
}

export function paintWallLips(ctx: CanvasRenderingContext2D, cell: number, pal: Palette): void {
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
}

export function paintGates(ctx: CanvasRenderingContext2D, cell: number, pal: Palette): void {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (TILES[y][x] !== "gate") continue;
      ctx.fillStyle = pal.wall;
      ctx.fillRect(x * cell, y * cell + cell * 0.12, cell, Math.max(2, cell * 0.16));
    }
  }
}

function paintOnePellet(
  ctx: CanvasRenderingContext2D,
  pellet: number,
  x: number,
  y: number,
  cell: number,
  pal: Palette,
  pulse: number,
): void {
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

export function paintPellets(
  ctx: CanvasRenderingContext2D,
  game: Game,
  cell: number,
  time: number,
  pal: Palette,
  reduce: boolean,
): void {
  const pulse = reduce ? 1 : 0.78 + Math.sin(time * 0.006) * 0.22;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const pellet = game.pellets[y][x];
      if (!pellet) continue;
      paintOnePellet(ctx, pellet, x, y, cell, pal, pulse);
    }
  }
}

export function paintFruit(ctx: CanvasRenderingContext2D, game: Game, cell: number, pal: Palette): void {
  if (!game.fruit || game.phase === "title") return;
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
