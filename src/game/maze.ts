export const COLS = 19;
export const ROWS = 21;

const RAW_ROWS = [
  "###################",
  "#o#...........#..o#",
  "#.#.#.###.#####.#.#",
  "#.#.....#.......#.#",
  "#.#######.#######.#",
  "#.......#.#.#...#.#",
  "#####.#.#.#.#.#.#.#",
  "#.#.....#...#.#...#",
  "#.#.#####=###.#####",
  "#...#.##GGG##.....#",
  "#.###.##GGG##.###.#",
  "#.#...#######...#.#",
  "#.#.#.########.##.#",
  "#.#.#...........#.#",
  "#.#.#.#####.###.#.#",
  " ................. ",
  "#.#.####...##.#.#.#",
  "#.#.#....P#.....#.#",
  "#.###.#####.#####.#",
  "#o....#..........o#",
  "###################",
];

function rows(): string[] {
  return RAW_ROWS.map((row, y) => {
    const chars = row.padEnd(COLS, " ").slice(0, COLS).split("");
    if (y !== 15) return chars.join("");
    for (let x = 1; x < COLS - 1; x++) if (chars[x] === " ") chars[x] = ".";
    return chars.join("");
  });
}

export type Tile = "wall" | "floor" | "pen" | "gate";

const built = rows();

export const TILES: Tile[][] = built.map((row) =>
  [...row].map((ch) => {
    if (ch === "#") return "wall";
    if (ch === "G") return "pen";
    if (ch === "=") return "gate";
    return "floor";
  }),
);

export const PELLET_TEMPLATE: number[][] = built.map((row) =>
  [...row].map((ch) => (ch === "." ? 1 : ch === "o" ? 2 : 0)),
);

export const TUNNEL: boolean[] = TILES.map((row) => row[0] !== "wall" && row[COLS - 1] !== "wall");

function cells(ch: string): { x: number; y: number }[] {
  const found: { x: number; y: number }[] = [];
  built.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === ch) found.push({ x, y });
    });
  });
  return found;
}

const playerCell = cells("P")[0] ?? { x: 9, y: 17 };
export const PLAYER_START = { x: playerCell.x + 0.5, y: playerCell.y + 0.5 };

const penCells = cells("G").sort((a, b) => a.y - b.y || a.x - b.x);
const spawnCells = [penCells[0], penCells[1], penCells[2], penCells[4]].filter(Boolean);
export const GHOST_SPAWNS = spawnCells.map((cell) => ({ x: cell.x + 0.5, y: cell.y + 0.5 }));

const gateCell = cells("=")[0] ?? { x: 9, y: 8 };
export const GATE = { x: gateCell.x, y: gateCell.y };

const fruitCandidates = [
  { x: 9, y: 13 },
  { x: 9, y: 14 },
  { x: 5, y: 13 },
  { x: 9, y: 5 },
  { x: 3, y: 19 },
];
export const FRUIT_CELL =
  fruitCandidates.find((cell) => built[cell.y]?.[cell.x] === ".") ?? { x: playerCell.x, y: Math.max(1, playerCell.y - 1) };

export const SCATTER = [
  { x: COLS - 2, y: 1 },
  { x: 1, y: 1 },
  { x: COLS - 2, y: ROWS - 2 },
  { x: 1, y: ROWS - 2 },
];

export function clonePellets(): number[][] {
  return PELLET_TEMPLATE.map((row) => row.slice());
}

export function countPellets(pellets: number[][]): number {
  let n = 0;
  for (const row of pellets) for (const cell of row) if (cell) n++;
  return n;
}
