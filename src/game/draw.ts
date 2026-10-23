import type { Game } from "./types.ts";
import { drawGhost, drawPlayer } from "./render/actors.ts";
import { paintFloaters, paintParticles } from "./render/fx.ts";
import { paintFruit, paintGates, paintPellets, paintRooms, paintStage, paintWallLips, paintWalls, shakeCamera } from "./render/maze.ts";
import type { Palette } from "./render/palette.ts";

export type { Palette };
export { FALLBACK, paletteFromCss } from "./render/palette.ts";

export function draw(
  ctx: CanvasRenderingContext2D,
  game: Game,
  cell: number,
  time: number,
  pal: Palette,
  reduce: boolean,
): void {
  paintStage(ctx, cell, pal);
  ctx.save();
  shakeCamera(ctx, game.shake, cell, reduce);
  paintRooms(ctx, cell, pal);
  paintWalls(ctx, cell, pal);
  paintWallLips(ctx, cell, pal);
  paintGates(ctx, cell, pal);
  paintPellets(ctx, game, cell, time, pal, reduce);
  paintFruit(ctx, game, cell, pal);
  for (const ghost of game.ghosts) drawGhost(ctx, ghost, cell, pal, time, reduce);
  drawPlayer(ctx, game, cell, time, pal, reduce);
  paintParticles(ctx, game, cell, pal);
  paintFloaters(ctx, game, cell, pal);
  ctx.restore();
}
