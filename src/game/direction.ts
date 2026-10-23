import type { Dir } from "./types.ts";

export const DIR_VECTOR: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

export function opposite(dir: Dir): Dir {
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  if (dir === "up") return "down";
  return "up";
}

export function speedForLevel(level: number): number {
  return Math.min(1.28, 1 + (level - 1) * 0.055);
}
