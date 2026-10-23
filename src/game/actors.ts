import { GHOST_SPAWNS, PLAYER_START } from "./maze.ts";
import type { Ghost, Mover } from "./types.ts";

function releaseDelay(level: number): number {
  return Math.max(1.7, 2.8 - (level - 1) * 0.22);
}

export function makePlayer(): Mover {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    dir: null,
    nextDir: null,
    lastDir: "left",
    committed: false,
  };
}

export function makeGhosts(level: number): Ghost[] {
  const gap = releaseDelay(level);
  return GHOST_SPAWNS.map((spot, id) => ({
    id,
    x: spot.x,
    y: spot.y,
    dir: "up" as const,
    nextDir: null,
    lastDir: "up" as const,
    committed: false,
    state: "pen" as const,
    release: 0.85 + id * gap,
    rest: 0,
    fright: 0,
  }));
}
