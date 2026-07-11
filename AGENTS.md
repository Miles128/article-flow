# AGENTS.md — Article-Flow

Desktop + web workflow for self-media article creation (hot topics → draft → review → format → illustrations → publish).

## Quick start

```bash
cd "/Users/sihai/Documents/My Projects/Article-Flow"
# Backend
cd backend && uv sync && uv run python run.py   # :5001
# Frontend / desktop
cd frontend && npm install && npm run dev                        # :3000
cd frontend && npm run tauri:dev                                 # Tauri desktop
```

## Verification

```bash
cd frontend && npm test
cd backend && pytest
```

## Architecture

```
backend/     Flask + LangChain, JSON storage
frontend/    Next.js 14 + Tauri desktop shell
```

## Gotchas

- Backend and frontend are separate processes (5001 vs 3000).
- Tauri dev wraps the Next.js frontend.

## Agent workflows

- UI changes: verify `npm test` + manual Tauri if touching desktop shell.
- Only commit when user asks.
