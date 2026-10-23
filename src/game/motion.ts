import { canAdvance, laneIsOpen, nearCenter, wrapTunnel } from "./board.ts";
import { DIR_VECTOR, opposite } from "./direction.ts";
import type { ActorKind, Dir, GhostState, Mover } from "./types.ts";

function snapToLane(actor: Mover, dx: number, dy: number): void {
  if (dx) actor.x = Math.floor(actor.x) + 0.5;
  if (dy) actor.y = Math.floor(actor.y) + 0.5;
}

function steerStillWorks(actor: Mover, kind: ActorKind, state: GhostState, blocked: Dir): boolean {
  return Boolean(actor.dir && actor.dir !== blocked && canAdvance(kind, state, actor.x, actor.y, actor.dir));
}

export function moveMover(
  actor: Mover,
  distance: number,
  kind: ActorKind,
  state: GhostState,
  steer: () => void,
): void {
  let left = distance;
  while (left > 1e-6) {
    steer();
    const dir = actor.dir;
    if (!dir) break;
    const step = Math.min(0.05, left);
    const [dx, dy] = DIR_VECTOR[dir];
    const nextX = actor.x + dx * step;
    const nextY = actor.y + dy * step;
    if (!canAdvance(kind, state, nextX, nextY, dir)) {
      snapToLane(actor, dx, dy);
      steer();
      if (steerStillWorks(actor, kind, state, dir)) continue;
      break;
    }
    actor.x = nextX;
    actor.y = nextY;
    wrapTunnel(actor);
    left -= step;
  }
}

function takeQueuedTurn(player: Mover, next: Dir): void {
  if (!player.dir) {
    if (laneIsOpen("player", "out", player.x, player.y, next)) player.dir = next;
    return;
  }
  if (next === opposite(player.dir)) {
    player.dir = next;
    return;
  }
  if (next === player.dir) return;
  const centered = nearCenter(player.x) && nearCenter(player.y);
  if (centered && laneIsOpen("player", "out", player.x, player.y, next)) {
    player.x = Math.floor(player.x) + 0.5;
    player.y = Math.floor(player.y) + 0.5;
    player.dir = next;
  }
}

export function steerPlayer(player: Mover): void {
  if (!player.nextDir) return;
  takeQueuedTurn(player, player.nextDir);
}
