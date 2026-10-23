import type { Game, Particle } from "../types.ts";
import type { Palette } from "./palette.ts";

function colorOf(kind: Particle["kind"], pal: Palette): string {
  if (kind === "amber") return pal.amber;
  if (kind === "coral") return pal.coral;
  return pal.cream;
}

export function paintParticles(ctx: CanvasRenderingContext2D, game: Game, cell: number, pal: Palette): void {
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = colorOf(particle.kind, pal);
    ctx.fillRect(particle.x * cell, particle.y * cell, Math.max(2, cell * 0.12), Math.max(2, cell * 0.12));
    ctx.globalAlpha = 1;
  }
}

export function paintFloaters(ctx: CanvasRenderingContext2D, game: Game, cell: number, pal: Palette): void {
  ctx.fillStyle = pal.amber;
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.max(12, cell * 0.72)}px Syne, Outfit, sans-serif`;
  for (const floater of game.floats) {
    ctx.globalAlpha = Math.max(0, floater.life / floater.max);
    ctx.fillText(floater.text, floater.x * cell, floater.y * cell);
    ctx.globalAlpha = 1;
  }
}
