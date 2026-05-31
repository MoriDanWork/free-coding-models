# 📦 free-coding-models-web

This directory contains the shared React SPA (Single Page Application) dashboard for `free-coding-models`.

## 🌐 Architecture

The frontend is a single SPA that is served in two distinct scenarios:
1. **Web Dashboard / Docker Mode (`--daemon`):** Served directly by the local Node.js `router-daemon` process on `http://localhost:19280/`.
2. **Desktop Mode (Tauri App):** Loaded locally inside Tauri's native webview from embedded assets in `web/dist/`, communicating via HTTP fetch to the background engine.

To maintain maximum code sharing, **95%+ of all components and logic are kept completely identical** between the two distributions.

---

## ⚡ API & Event Integration

The React app relies on HTTP and Server-Sent Events (SSE) to talk to the engine:
* `GET /api/models`: Fetches the live model catalog, complete with stability scores and latency details.
* `GET /api/config`: Retrieves active provider toggles (keys are masked).
* `POST /api/settings`: Updates API keys and provider preferences.
* `GET /api/events` / `EventSource`: Listens for real-time SSE updates broadcasted by the ping and benchmark loops.

---

## 🛠️ Development & Building

### Prerequisites
Make sure you have `pnpm` installed and dependencies initialized at the root of the project.

### 1. Dev Server (HMR)
To start the React frontend with Vite HMR (Hot Module Replacement):
```bash
cd web
pnpm dev
```
By default, the dev server runs on `http://localhost:5173/`. Ensure a background daemon is running on port `19280` so the API requests proxy correctly.

### 2. Production Build
To compile the production-ready SPA:
```bash
pnpm build
```
This bundles the HTML, JS, and CSS assets into the `web/dist/` directory, which is then embedded inside both the CLI daemon and the Tauri desktop app binary.
