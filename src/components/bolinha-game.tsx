import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { playEvent, resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import { draw, paletteFromCss } from "@/game/draw";
import { COLS, ROWS } from "@/game/maze";
import { begin, createGame, setDirection, step, togglePause, type Dir, type Game, type Phase } from "@/game/sim";

const BEST_KEY = "bolinha-best";
const MUTE_KEY = "bolinha-mute";
const STEP = 1 / 60;

const scoreFmt = new Intl.NumberFormat("pt-BR");

type Hud = {
  phase: Phase;
  score: number;
  best: number;
  lives: number;
  level: number;
  dir: Dir | null;
};

function snapshot(game: Game): Hud {
  return {
    phase: game.phase,
    score: game.score,
    best: game.best,
    lives: game.lives,
    level: game.level,
    dir: game.player.nextDir ?? game.player.dir,
  };
}

function dirFromKey(key: string): Dir | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

export function BolinhaGame() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = createGame(0, 1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef(16);
  const dprRef = useRef(1);
  const sigRef = useRef("");
  const bestSaved = useRef(0);
  const [hud, setHud] = useState<Hud>(snapshot(gameRef.current));
  const [silent, setSilent] = useState(false);
  const silentRef = useRef(false);
  silentRef.current = silent;

  function game(): Game {
    if (!gameRef.current) gameRef.current = createGame(0, 1);
    return gameRef.current;
  }

  function publish() {
    const g = game();
    const next = snapshot(g);
    const sig = `${next.phase}|${next.score}|${next.best}|${next.lives}|${next.level}|${next.dir}`;
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setHud(next);
    }
    if (g.best > bestSaved.current) {
      bestSaved.current = g.best;
      try {
        localStorage.setItem(BEST_KEY, String(g.best));
      } catch {
        /* ignore private mode */
      }
    }
  }

  function arm(dir?: Dir) {
    unlockAudio();
    setMuted(silentRef.current);
    const g = game();
    if (g.phase === "title" || g.phase === "over") begin(g);
    if (dir) setDirection(g, dir);
    publish();
  }

  useEffect(() => {
    try {
      const best = Number(localStorage.getItem(BEST_KEY) || "0");
      if (Number.isFinite(best) && best > 0) {
        game().best = best;
        bestSaved.current = best;
      }
      const mute = localStorage.getItem(MUTE_KEY) === "1";
      setSilent(mute);
      setMuted(mute);
    } catch {
      /* ignore */
    }
    publish();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => {
      const slot = slotRef.current;
      const canvas = canvasRef.current;
      if (!slot || !canvas) return;
      const rect = slot.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cell = Math.max(8, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
      cellRef.current = cell;
      dprRef.current = dpr;
      canvas.width = Math.max(1, Math.floor(COLS * cell * dpr));
      canvas.height = Math.max(1, Math.floor(ROWS * cell * dpr));
      canvas.style.width = `${COLS * cell}px`;
      canvas.style.height = `${ROWS * cell}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (slotRef.current) observer.observe(slotRef.current);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const g = game();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        step(g, STEP);
        for (const event of g.events) playEvent(event);
        g.events.length = 0;
        acc -= STEP;
        guard += 1;
      }
      if (guard >= 5) acc = 0;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        const dpr = dprRef.current;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(ctx, g, cellRef.current, now, paletteFromCss(), reduce);
      }
      publish();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (event: KeyboardEvent) => {
      const dir = dirFromKey(event.key);
      if (dir) {
        event.preventDefault();
        arm(dir);
        return;
      }
      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        event.preventDefault();
        const g = game();
        if (g.phase === "playing" || g.phase === "paused") {
          unlockAudio();
          togglePause(g);
          publish();
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        const g = game();
        if (g.phase === "title" || g.phase === "over") {
          event.preventDefault();
          arm();
        } else if (g.phase === "playing" || g.phase === "paused") {
          event.preventDefault();
          unlockAudio();
          togglePause(g);
          publish();
        }
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const swipe = useRef<{ x: number; y: number } | null>(null);

  const pads: { dir: Dir; label: string; icon: typeof ChevronUp; place: string }[] = [
    { dir: "up", label: "Cima", icon: ChevronUp, place: "col-start-2 row-start-1" },
    { dir: "left", label: "Esquerda", icon: ChevronLeft, place: "col-start-1 row-start-2" },
    { dir: "right", label: "Direita", icon: ChevronRight, place: "col-start-3 row-start-2" },
    { dir: "down", label: "Baixo", icon: ChevronDown, place: "col-start-2 row-start-3" },
  ];

  return (
    <main className="flex h-dvh flex-col bg-ink text-cream touch-none select-none">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div>
          <h1 className="font-display text-xl leading-none tracking-tight">Bolinha</h1>
          <p className="mt-1 text-xs text-muted">nível {hud.level}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-1 flex gap-1" aria-label={`${hud.lives} vidas`}>
            {Array.from({ length: Math.max(hud.lives, 0) }, (_, i) => (
              <span key={i} className="size-2.5 rounded-full bg-amber" />
            ))}
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-cream"
            aria-label={silent ? "Ligar som" : "Silenciar"}
            onClick={() => {
              const next = !silent;
              setSilent(next);
              setMuted(next);
              try {
                localStorage.setItem(MUTE_KEY, next ? "1" : "0");
              } catch {
                /* ignore */
              }
            }}
          >
            {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-cream disabled:opacity-40"
            aria-label={hud.phase === "paused" ? "Continuar" : "Pausar"}
            disabled={hud.phase !== "playing" && hud.phase !== "paused"}
            onClick={() => {
              unlockAudio();
              togglePause(game());
              publish();
            }}
          >
            {hud.phase === "paused" ? <Play className="size-5" /> : <Pause className="size-5" />}
          </button>
        </div>
      </header>
      <div className="flex items-end justify-between px-4 pb-2">
        <p className="font-display text-2xl leading-none tabular-nums">{scoreFmt.format(hud.score)}</p>
        <p className="text-xs text-muted tabular-nums">recorde {scoreFmt.format(hud.best)}</p>
      </div>
      <div ref={slotRef} className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex items-start justify-center">
          <canvas
            ref={canvasRef}
            aria-label="Labirinto da Bolinha"
            onPointerDown={(event) => {
              swipe.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => {
              const origin = swipe.current;
              swipe.current = null;
              if (!origin) return;
              const dx = event.clientX - origin.x;
              const dy = event.clientY - origin.y;
              if (Math.hypot(dx, dy) < 28) return;
              const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
              arm(dir);
            }}
          />
        </div>
        {hud.phase === "title" ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:inset-0 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
              <p className="font-display text-3xl leading-none tracking-tight">Come as luzes.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Desvie das figuras. O ponto grande inverte a caça. Uma semente vale bônus.
              </p>
              <button
                type="button"
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber font-display text-lg text-ink"
                onClick={() => arm()}
              >
                <Play className="size-5" />
                Jogar
              </button>
              <p className="mt-3 text-center text-xs text-muted">Setas, deslize ou o direcional. P pausa.</p>
            </div>
          </div>
        ) : null}
        {hud.phase === "ready" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="rounded-full bg-ink/80 px-4 py-2 font-display text-3xl text-amber">Vai!</p>
          </div>
        ) : null}
        {hud.phase === "levelclear" ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="rounded-full bg-ink/80 px-4 py-2 font-display text-3xl text-amber">Limpo</p>
          </div>
        ) : null}
        {hud.phase === "paused" ? (
          <div className="absolute inset-0 grid place-items-center bg-ink/70 p-4">
            <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center">
              <p className="font-display text-3xl">Pausa</p>
              <button
                type="button"
                className="mt-4 h-12 w-full rounded-full bg-amber font-display text-lg text-ink"
                onClick={() => {
                  unlockAudio();
                  togglePause(game());
                  publish();
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        ) : null}
        {hud.phase === "over" ? (
          <div className="absolute inset-0 grid place-items-center bg-ink/75 p-4">
            <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center">
              <p className="text-xs tracking-widest text-muted uppercase">Fim de jogo</p>
              <p className="mt-2 font-display text-4xl tabular-nums">{scoreFmt.format(hud.score)}</p>
              <p className="mt-1 text-sm text-muted">recorde {scoreFmt.format(hud.best)}</p>
              <button
                type="button"
                className="mt-5 h-12 w-full rounded-full bg-amber font-display text-lg text-ink"
                onClick={() => arm()}
              >
                De novo
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <footer className="safe-bottom flex justify-center px-4 pt-2">
        <div className="grid grid-cols-3 grid-rows-3 gap-2">
          {pads.map((pad) => {
            const Icon = pad.icon;
            const on = hud.dir === pad.dir && (hud.phase === "playing" || hud.phase === "ready");
            return (
              <button
                key={pad.dir}
                type="button"
                aria-label={pad.label}
                className={`${pad.place} grid size-14 place-items-center rounded-2xl border border-line ${on ? "bg-amber text-ink" : "bg-surface text-cream"}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  arm(pad.dir);
                }}
              >
                <Icon className="size-7" />
              </button>
            );
          })}
        </div>
      </footer>
    </main>
  );
}
