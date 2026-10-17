import type { GameEvent } from "./sim.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let waka = 0;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0 : 0.22, ctx.currentTime, 0.02);
}

export function unlockAudio(): void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!ctx) {
    ctx = new Ctx({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function resumeAudio(): void {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide?: number, when = 0): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide && slide > 0) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
  osc.onended = () => {
    osc.disconnect();
    amp.disconnect();
  };
}

export function playEvent(event: GameEvent): void {
  if (event.t === "dot") {
    waka ^= 1;
    tone(waka ? 540 : 400, 0.055, "square", 0.045);
    return;
  }
  if (event.t === "power") {
    tone(160, 0.26, "sawtooth", 0.07, 620);
    return;
  }
  if (event.t === "ghost") {
    tone(380, 0.16, "square", 0.07, 920);
    return;
  }
  if (event.t === "death") {
    tone(420, 0.42, "sawtooth", 0.07, 70);
    return;
  }
  if (event.t === "go") {
    tone(392, 0.09, "square", 0.05, undefined, 0);
    tone(523, 0.1, "square", 0.05, undefined, 0.09);
    tone(659, 0.14, "square", 0.05, undefined, 0.18);
    return;
  }
  if (event.t === "level") {
    tone(523, 0.12, "triangle", 0.07, 880);
    return;
  }
  if (event.t === "fruit") {
    tone(700, 0.14, "triangle", 0.07, 1040);
    return;
  }
  if (event.t === "life") {
    tone(660, 0.1, "square", 0.06, undefined, 0);
    tone(880, 0.14, "square", 0.05, undefined, 0.1);
  }
}
