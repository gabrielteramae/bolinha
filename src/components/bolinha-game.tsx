import { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { setMuted, unlockAudio } from "@/game/audio";
import { begin, createGame, setDirection, togglePause, type Dir, type Game } from "@/game/sim";
import { DPad } from "./bolinha/d-pad";
import { hudSignature, snapshot, type Hud } from "./bolinha/hud";
import { dirFromSwipe } from "./bolinha/input";
import { PhaseOverlay, scoreFmt } from "./bolinha/screens";
import { BEST_KEY, MUTE_KEY, writeStored } from "./bolinha/storage";
import { useSession } from "./bolinha/use-session";

export function BolinhaGame() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = createGame(0, 1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef(16);
  const dprRef = useRef(1);
  const signatureRef = useRef("");
  const bestSaved = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [hud, setHud] = useState<Hud>(snapshot(gameRef.current));
  const [silent, setSilent] = useState(false);
  const silentRef = useRef(false);
  silentRef.current = silent;

  function game(): Game {
    if (!gameRef.current) gameRef.current = createGame(0, 1);
    return gameRef.current;
  }

  function publish() {
    const current = game();
    const next = snapshot(current);
    const signature = hudSignature(next);
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      setHud(next);
    }
    if (current.best > bestSaved.current) {
      bestSaved.current = current.best;
      writeStored(BEST_KEY, String(current.best));
    }
  }

  function arm(dir?: Dir) {
    unlockAudio();
    setMuted(silentRef.current);
    const current = game();
    if (current.phase === "title" || current.phase === "over") begin(current);
    if (dir) setDirection(current, dir);
    publish();
  }

  function pause() {
    unlockAudio();
    togglePause(game());
    publish();
  }

  useSession({ game, publish, arm, bestSaved, setSilent, canvasRef, slotRef, cellRef, dprRef });

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
              writeStored(MUTE_KEY, next ? "1" : "0");
            }}
          >
            {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-cream disabled:opacity-40"
            aria-label={hud.phase === "paused" ? "Continuar" : "Pausar"}
            disabled={hud.phase !== "playing" && hud.phase !== "paused"}
            onClick={pause}
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
              const dir = dirFromSwipe(event.clientX - origin.x, event.clientY - origin.y);
              if (dir) arm(dir);
            }}
          />
        </div>
        <PhaseOverlay hud={hud} actions={{ arm: () => arm(), game, publish }} />
      </div>
      <footer className="safe-bottom flex justify-center px-4 pt-2">
        <DPad hud={hud} onDir={arm} />
      </footer>
    </main>
  );
}
