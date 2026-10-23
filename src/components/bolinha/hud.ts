import type { Dir, Game, Phase } from "@/game/sim";

export type Hud = {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  level: number;
  dir: Dir | null;
};

export function snapshot(game: Game): Hud {
  return {
    phase: game.phase,
    score: game.score,
    best: game.best,
    lives: game.lives,
    level: game.level,
    dir: game.player.nextDir ?? game.player.dir,
  };
}

export function hudSignature(hud: Hud): string {
  return `${hud.phase}|${hud.score}|${hud.best}|${hud.lives}|${hud.level}|${hud.dir}`;
}
