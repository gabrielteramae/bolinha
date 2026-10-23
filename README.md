# Game Pac-Man — labirinto no navegador

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-1.168-FF4154?style=flat)

Labirinto rápido: a bolinha come as luzes, desvia das figuras e, no ponto grande, vira a caça. O recorde fica no `localStorage`. Não é o Pac-Man: mapa, nomes e desenho são próprios.

| Decisão | No código |
|---|---|
| Movimento | Grade contínua em `src/game/motion.ts`, regras em `src/game/rules.ts`, passo em `src/game/sim.ts`. Setas, A/D e o direcional da tela. A vai para a esquerda da tela. |
| Mapa | `src/game/maze.ts` e ocupação em `src/game/board.ts`. Túnel nas laterais, ponto grande e um bônus que some. |
| Caça | `src/game/ghosts.ts`. |
| Desenho | Canvas em `src/game/draw.ts`, separado em mapa, atores e efeitos em `src/game/render/`. Sem sprite de personagem com copyright. |
| Som | Osciladores em `src/game/audio.ts`. Dá para silenciar. |
| Tela | `src/components/bolinha/`. O recorde fica no `localStorage`. |

## Stack

- React 19 e TanStack Start
- Vite 8
- TypeScript
- Tailwind CSS 4
- Canvas 2D, sem engine

## Estrutura

```
test-game-pac-man/
├── src/game/          tipos, tabuleiro, movimento, caça, regras, sim.ts
├── src/game/render/   mapa, atores e efeitos no canvas
├── src/components/    bolinha-game.tsx e a pasta bolinha/ (tela, input, sessão)
├── src/routes/        página única
├── public/            favicon.svg, og.jpg
├── scripts/           dev, build e preview
└── package.json
```

`src/lib/` e `server/` são o esqueleto do app (preview e auth). A Bolinha não pede login.

## Como rodar

Pré-requisito: Node.js 22.

```bash
git clone https://github.com/gabrielteramae/test-game-pac-man.git
cd test-game-pac-man
npm install
npm run dev
```

Abre em `http://127.0.0.1:8080/`.

O teste da simulação:

```bash
node --experimental-strip-types --test src/game/sim.test.ts
```

`npm test` cobre o esqueleto do app (auth, preview, scripts), não o labirinto.

Build:

```bash
npm run build
```

---

© 2026 Gabriel Teramae Chan
