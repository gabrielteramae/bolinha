import { COLS, ROWS, TUNNEL } from "../maze.ts";
import type { Dir, Game, Ghost } from "../types.ts";
import type { Palette } from "./palette.ts";

function dirAngle(dir: Dir | null): number {
  if (dir === "down") return Math.PI / 2;
  if (dir === "left") return Math.PI;
  if (dir === "up") return -Math.PI / 2;
  return 0;
}

function paintBothTunnels(
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

function paintEyes(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  radius: number,
  cream: string,
  ink: string,
): void {
  for (const side of [-1, 1]) {
    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.arc(px + side * radius * 0.32, py, Math.max(1.2, radius * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(px + side * radius * 0.32, py, Math.max(0.8, radius * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }
}

function traceShape(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, id: number, dir: Dir | null): void {
  if (id === 0) {
    ctx.moveTo(px, py - radius);
    ctx.lineTo(px + radius * 0.86, py);
    ctx.lineTo(px, py + radius);
    ctx.lineTo(px - radius * 0.86, py);
    ctx.closePath();
    return;
  }
  if (id === 1) {
    const angle = dirAngle(dir);
    ctx.moveTo(px + Math.cos(angle) * radius, py + Math.sin(angle) * radius);
    ctx.lineTo(px + Math.cos(angle + 2.45) * radius * 0.92, py + Math.sin(angle + 2.45) * radius * 0.92);
    ctx.lineTo(px + Math.cos(angle - 2.45) * radius * 0.92, py + Math.sin(angle - 2.45) * radius * 0.92);
    ctx.closePath();
    return;
  }
  if (id === 2) {
    const side = radius * 0.78;
    ctx.rect(px - side, py - side, side * 2, side * 2);
    return;
  }
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = px + Math.cos(angle) * radius;
    const y = py + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function paintMouth(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, angle: number, mouth: number, ink: string): void {
  const open = mouth * 0.72;
  if (open <= 0.05 || radius <= 1) return;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, radius * 0.98, angle - open, angle + open);
  ctx.closePath();
  ctx.fill();
}

function paintCheeks(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, angle: number, ink: string): void {
  const fx = Math.cos(angle);
  const fy = Math.sin(angle);
  const sx = -fy;
  const sy = fx;
  ctx.fillStyle = ink;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      px - fx * radius * 0.12 + sx * side * radius * 0.28,
      py - fy * radius * 0.12 + sy * side * radius * 0.28,
      Math.max(1, radius * 0.13),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

export function drawPlayer(
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
  paintBothTunnels(ctx, player.x, player.y, cell, (px, py) => {
    const radius = cell * 0.42 * shrink;
    const angle = dirAngle(player.dir ?? player.lastDir) + spin;
    ctx.fillStyle = pal.amber;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    paintMouth(ctx, px, py, radius, angle, mouth, pal.ink);
    paintCheeks(ctx, px, py, radius, angle, pal.ink);
  });
}

function paintFrightFace(ctx: CanvasRenderingContext2D, px: number, py: number, radius: number, ink: string): void {
  ctx.fillStyle = ink;
  ctx.fillRect(px - radius * 0.28, py - radius * 0.05, radius * 0.16, radius * 0.16);
  ctx.fillRect(px + radius * 0.12, py - radius * 0.05, radius * 0.16, radius * 0.16);
}

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: Ghost,
  cell: number,
  pal: Palette,
  time: number,
  reduce: boolean,
): void {
  const bob = ghost.state === "pen" && !reduce ? Math.sin(time * 0.005 + ghost.id) * cell * 0.06 : 0;
  paintBothTunnels(ctx, ghost.x, ghost.y + bob / cell, cell, (px, py) => {
    const radius = cell * 0.36;
    if (ghost.state === "eaten") {
      paintEyes(ctx, px, py - radius * 0.05, radius, pal.cream, pal.ink);
      return;
    }
    const frightened = ghost.fright > 0 && ghost.state === "out";
    const flash = frightened && ghost.fright < 1.8 && !reduce && Math.floor(ghost.fright * 8) % 2 === 0;
    ctx.fillStyle = flash ? pal.cream : frightened ? pal.wall : pal.coral;
    ctx.beginPath();
    traceShape(ctx, px, py, radius, ghost.id, ghost.dir);
    ctx.fill();
    if (frightened) paintFrightFace(ctx, px, py, radius, pal.ink);
    else paintEyes(ctx, px, py - radius * 0.08, radius * 0.72, pal.cream, pal.ink);
  });
}
