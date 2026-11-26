# GTAVI Web Game — Leonida Run

A 2D Vice Beach getaway car racing game built with **Vite**, **React**, **TypeScript**, **Tailwind CSS**, and an isolated **HTML5 Canvas** 60fps simulation engine.

## Features

- **3 Playable Modes**: `Getaway 4.5km` (escape across Ocean Beach Strip, Keys Causeway, and Vice Expressway), `Daily Seed` (shared daily seed), and `Endless Heat`.
- **3 Leonida Rides**: `Cheetah Classic`, `Banshee GT`, and `Comet S2` with distinct speed, drift grip, nitro, and armor stats.
- **5-Star Pursuit & Stunts**: Near-miss combo chains, handbrake drift boosts, flatbed jump ramps, telegraphed roadblocks and spike strips, chopper spotlights, and nitro side-slam cop takedowns.
- **Procedural Web Audio**: Synthesized engine purr, tire screech, sirens, near-miss chimes, and crash effects with mute toggle (`M`).
- **Viral Sharing Tools**: Exports a `1200×675` PNG Bounty Card and generates deterministic `?seed=...&target=...&car=...` challenge URLs.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Production Build

```bash
npm run lint
npm run build
npm run preview
```

## Controls

- `A` / `D` or `Left` / `Right`: Steer (or on-screen touch pads on mobile)
- `W` / `Up`: Accelerate
- `S` / `Down`: Brake
- `Space`: Drift / Handbrake
- `Shift` / `N`: Nitro Boost
- `Esc`: Pause
- `R`: Quick Restart
- `M`: Mute / Unmute Audio
