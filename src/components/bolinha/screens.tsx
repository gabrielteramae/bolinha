import { Play } from "lucide-react";
import { unlockAudio } from "@/game/audio";
import { togglePause, type Game } from "@/game/sim";
import type { Hud } from "./hud.ts";

const scoreFmt = new Intl.NumberFormat("pt-BR");

type Actions = {
  arm: () => void;
  game: () => Game;
  publish: () => void;
};

export function TitleCard({ arm }: { arm: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:inset-0 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <p className="font-display text-3xl leading-none tracking-tight">Come as luzes.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Desvie das figuras. O ponto grande inverte a caça. Uma semente vale bônus.
        </p>
        <button
          type="button"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber font-display text-lg text-ink"
          onClick={arm}
        >
          <Play className="size-5" />
          Jogar
        </button>
        <p className="mt-3 text-center text-xs text-muted">Setas, deslize ou o direcional. P pausa.</p>
      </div>
    </div>
  );
}

export function ReadyBanner() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <p className="rounded-full bg-ink/80 px-4 py-2 font-display text-3xl text-amber">Vai!</p>
    </div>
  );
}

export function ClearBanner() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <p className="rounded-full bg-ink/80 px-4 py-2 font-display text-3xl text-amber">Limpo</p>
    </div>
  );
}

export function PauseCard({ game, publish }: Actions) {
  return (
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
  );
}

export function OverCard({ hud, arm }: { hud: Hud; arm: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/75 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="text-xs tracking-widest text-muted uppercase">Fim de jogo</p>
        <p className="mt-2 font-display text-4xl tabular-nums">{scoreFmt.format(hud.score)}</p>
        <p className="mt-1 text-sm text-muted">recorde {scoreFmt.format(hud.best)}</p>
        <button type="button" className="mt-5 h-12 w-full rounded-full bg-amber font-display text-lg text-ink" onClick={arm}>
          De novo
        </button>
      </div>
    </div>
  );
}

export function PhaseOverlay({ hud, actions }: { hud: Hud; actions: Actions }) {
  if (hud.phase === "title") return <TitleCard arm={actions.arm} />;
  if (hud.phase === "ready") return <ReadyBanner />;
  if (hud.phase === "levelclear") return <ClearBanner />;
  if (hud.phase === "paused") return <PauseCard {...actions} />;
  if (hud.phase === "over") return <OverCard hud={hud} arm={actions.arm} />;
  return null;
}

export { scoreFmt };
