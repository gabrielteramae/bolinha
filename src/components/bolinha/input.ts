import type { Dir } from "@/game/sim";

const SWIPE_MIN = 28;

export function dirFromKey(key: string): Dir | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

export function dirFromSwipe(dx: number, dy: number): Dir | null {
  if (Math.hypot(dx, dy) < SWIPE_MIN) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
