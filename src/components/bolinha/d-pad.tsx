import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { Dir } from "@/game/sim";
import type { Hud } from "./hud.ts";

const PADS: { dir: Dir; label: string; icon: typeof ChevronUp; place: string }[] = [
  { dir: "up", label: "Cima", icon: ChevronUp, place: "col-start-2 row-start-1" },
  { dir: "left", label: "Esquerda", icon: ChevronLeft, place: "col-start-1 row-start-2" },
  { dir: "right", label: "Direita", icon: ChevronRight, place: "col-start-3 row-start-2" },
  { dir: "down", label: "Baixo", icon: ChevronDown, place: "col-start-2 row-start-3" },
];

export function DPad({ hud, onDir }: { hud: Hud; onDir: (dir: Dir) => void }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2">
      {PADS.map((pad) => {
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
              onDir(pad.dir);
            }}
          >
            <Icon className="size-7" />
          </button>
        );
      })}
    </div>
  );
}
