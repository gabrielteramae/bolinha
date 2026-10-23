export type Palette = {
  ink: string;
  cream: string;
  amber: string;
  coral: string;
  wall: string;
  wallHi: string;
  line: string;
  muted: string;
};

export const FALLBACK: Palette = {
  ink: "#090b10",
  cream: "#f3ead2",
  amber: "#f0a020",
  coral: "#e85d4c",
  wall: "#234a8a",
  wallHi: "#3e6ec4",
  line: "#2c291f",
  muted: "#a39880",
};

export function paletteFromCss(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick("--color-ink", FALLBACK.ink),
    cream: pick("--color-cream", FALLBACK.cream),
    amber: pick("--color-amber", FALLBACK.amber),
    coral: pick("--color-coral", FALLBACK.coral),
    wall: pick("--color-wall", FALLBACK.wall),
    wallHi: pick("--color-wall-hi", FALLBACK.wallHi),
    line: pick("--color-line", FALLBACK.line),
    muted: pick("--color-muted", FALLBACK.muted),
  };
}
