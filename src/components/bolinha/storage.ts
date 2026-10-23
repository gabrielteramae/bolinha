export const BEST_KEY = "bolinha-best";
export const MUTE_KEY = "bolinha-mute";

export function readStoredNumber(key: string): number {
  try {
    const value = Number(localStorage.getItem(key) || "0");
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}
