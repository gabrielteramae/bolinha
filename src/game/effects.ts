import type { Game, Particle } from "./types.ts";

const PARTICLE_CAP = 90;

export function burst(game: Game, x: number, y: number, count: number, kind: Particle["kind"]): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.38,
      max: 0.38,
      kind,
    });
  }
  if (game.particles.length > PARTICLE_CAP) game.particles.splice(0, game.particles.length - PARTICLE_CAP);
}

export function floatScore(game: Game, x: number, y: number, text: string, life: number): void {
  game.floats.push({ x, y, text, life, max: life });
}

function ageParticles(game: Game, dt: number): void {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  if (game.particles.some((particle) => particle.life <= 0)) {
    game.particles = game.particles.filter((particle) => particle.life > 0);
  }
}

function ageFloaters(game: Game, dt: number): void {
  for (const floater of game.floats) {
    floater.life -= dt;
    floater.y -= dt * 0.65;
  }
  if (game.floats.some((floater) => floater.life <= 0)) {
    game.floats = game.floats.filter((floater) => floater.life > 0);
  }
}

export function tickEffects(game: Game, dt: number): void {
  game.shake = Math.max(0, game.shake - dt * 1.5);
  ageParticles(game, dt);
  ageFloaters(game, dt);
}
