import { useEffect, useRef, type RefObject } from "react";
import { playEvent, resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import { draw, paletteFromCss } from "@/game/draw";
import { COLS, ROWS } from "@/game/maze";
import { step, togglePause, type Dir, type Game } from "@/game/sim";
import { dirFromKey } from "./input.ts";
import { BEST_KEY, MUTE_KEY, readStoredNumber } from "./storage.ts";

const STEP = 1 / 60;

type Session = {
  game: () => Game;
  publish: () => void;
  arm: (dir?: Dir) => void;
  bestSaved: RefObject<number>;
  setSilent: (muted: boolean) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  slotRef: RefObject<HTMLDivElement | null>;
  cellRef: RefObject<number>;
  dprRef: RefObject<number>;
};

function readMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function fitCanvas(slot: HTMLDivElement, canvas: HTMLCanvasElement, cellRef: RefObject<number>, dprRef: RefObject<number>): void {
  const rect = slot.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cell = Math.max(8, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
  cellRef.current = cell;
  dprRef.current = dpr;
  canvas.width = Math.max(1, Math.floor(COLS * cell * dpr));
  canvas.height = Math.max(1, Math.floor(ROWS * cell * dpr));
  canvas.style.width = `${COLS * cell}px`;
  canvas.style.height = `${ROWS * cell}px`;
}

function paintFrame(canvas: HTMLCanvasElement | null, game: Game, cell: number, dpr: number, now: number, reduce: boolean): void {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx, game, cell, now, paletteFromCss(), reduce);
}

function onKey(event: KeyboardEvent, session: Session): void {
  const dir = dirFromKey(event.key);
  if (dir) {
    event.preventDefault();
    session.arm(dir);
    return;
  }
  const current = session.game();
  const canPause = current.phase === "playing" || current.phase === "paused";
  if (event.key === "p" || event.key === "P" || event.key === "Escape") {
    event.preventDefault();
    if (!canPause) return;
    unlockAudio();
    togglePause(current);
    session.publish();
    return;
  }
  if (event.key !== "Enter" && event.key !== " ") return;
  if (current.phase === "title" || current.phase === "over") {
    event.preventDefault();
    session.arm();
    return;
  }
  if (!canPause) return;
  event.preventDefault();
  unlockAudio();
  togglePause(current);
  session.publish();
}

export function useSession(session: Session): void {
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const live = () => sessionRef.current;
    const storedBest = readStoredNumber(BEST_KEY);
    if (storedBest > 0) {
      live().game().best = storedBest;
      live().bestSaved.current = storedBest;
    }
    const muted = readMute();
    live().setSilent(muted);
    setMuted(muted);
    live().publish();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => {
      const slot = live().slotRef.current;
      const canvas = live().canvasRef.current;
      if (!slot || !canvas) return;
      fitCanvas(slot, canvas, live().cellRef, live().dprRef);
    };
    fit();
    const observer = new ResizeObserver(fit);
    const slot = live().slotRef.current;
    if (slot) observer.observe(slot);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const current = live().game();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        step(current, STEP);
        for (const event of current.events) playEvent(event);
        current.events.length = 0;
        acc -= STEP;
        guard += 1;
      }
      if (guard >= 5) acc = 0;
      paintFrame(live().canvasRef.current, current, live().cellRef.current ?? 16, live().dprRef.current ?? 1, now, reduce);
      live().publish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const keyListener = (event: KeyboardEvent) => onKey(event, live());
    const onVisible = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    window.addEventListener("keydown", keyListener);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", keyListener);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
