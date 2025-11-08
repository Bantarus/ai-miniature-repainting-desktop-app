# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + Spectrum UI; feature panels stay in `src/components`, shared logic in `src/hooks`, IPC helpers in `src/services`, and theme entrypoints in `src/styles`.
- `src-tauri/` is the Rust shell; `src-tauri/src/commands.rs` exposes Tauri commands while `python_bridge.rs` manages the PyO3 bridge—mirror any new IPC surface in both places.
- `python/` hosts the sidecar orchestration layer; keep model-facing code behind wrappers (`comfyui_wrapper.py`, `diffusers_wrapper.py`) so the Rust bridge interacts with a single `inference.py` façade.
- `public/` serves static assets, `docs/` tracks architecture decisions, and `models/` is a placeholder for large local checkpoints that should stay out of Git.

## Build, Test, and Development Commands
- `npm install` installs the front-end, Tauri CLI, and shared tooling.
- `npm run dev` starts the Vite dev server for UI-only work; `npm run tauri dev` launches the full desktop shell with the Rust backend.
- `npm run build` runs `tsc` type-checking plus a production Vite build; follow with `npm run tauri build` when you need platform bundles.
- Use `PYTHONPATH=python python python/inference.py --dry-run` to smoke-test backend plumbing before wiring it through Tauri.

## Coding Style & Naming Conventions
- TypeScript is strict-mode; prefer typed hooks/components and keep props/interfaces next to their owners.
- Follow 2-space indentation, single quotes in TSX/TS, and PascalCase for components (`MiniatureGallery`), camelCase for hooks/utilities (`useBridgeEvents`), and snake_case for Python.
- Keep React code declarative, store shared layout primitives under `src/components/layout`, and route all IPC calls through `src/services` rather than `window.__TAURI__` imports.

## Testing Guidelines
- Front-end tests should live alongside the code in `__tests__` folders (e.g., `src/components/AppShell/__tests__/AppShell.test.tsx`) and use Vitest + React Testing Library; run them with `npx vitest run --coverage` once added, aiming for 80% statements on UI-heavy modules.
- Python logic should be covered with `pytest` (e.g., `pytest python/tests -k bridge`) and should stub GPU-heavy paths via fixtures.
- Name tests after the behavior (`renders-loading-state.spec.tsx`, `test_launches_sidecar_process.py`) so failure output maps back to UX flows.

## Commit & Pull Request Guidelines
- Follow the existing imperative, present-tense style (`Implement PyO3 bridge`, `Fix spectrum shell layout`), keep subjects under ~72 characters, and reference issues with `(#123)` when applicable.
- Each PR should describe the motivation, list runnable verification steps (`npm run tauri dev`, `pytest python/tests`), and attach screenshots or terminal logs for UI or bridge changes; cross-link related docs in `docs/`.

## Security & Configuration Tips
- Never commit generated icons or large checkpoints; regenerate icons locally via `npx @tauri-apps/cli icon path/to/base.svg`.
- Store secrets (API keys, ComfyUI endpoints) in a local `.env` loaded through `tauri.conf.json`—treat `.env*` as untracked files.
- When touching `tauri.conf.json` or Python entrypoints, document new ports or permissions in `docs/TECHNICAL_STACK_DEFINITION.md` so reviewers can reproduce the environment.
