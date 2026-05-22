# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state

Early skeleton. `gqs-backend/` is an empty Go module (no code yet beyond `go.mod`). `gqs-frontend/` is a freshly scaffolded Next.js App Router app with only the default starter page. Architecture is being established as features land — when you make a load-bearing structural choice, update `AGENTS.md` (the canonical agent-instruction file) so it stays accurate.

`AGENTS.md` at the repo root is the source of truth for agent constraints and intended direction. Read it before any non-trivial change. The rules below mirror its hard constraints — if anything here conflicts with `AGENTS.md`, `AGENTS.md` wins.

## Hard constraints

- **Never modify** `gqs-backend/go.mod`, `gqs-backend/go.sum`, `gqs-frontend/package.json`, or `gqs-frontend/pnpm-lock.yaml`.
- **Never run** dependency-mutating commands: `pnpm install`, `pnpm add`, `npm i`, `go get`, `go mod tidy`, etc. The user installs all deps manually.
- When a new dep is needed, reply with both (a) name + version + one-line reason, and (b) the exact install command (e.g. `pnpm add foo@^1.2 -D`, `go get github.com/x/y@v1.2.3`) for the user to run.
- **Database is read-only**: `SELECT` / schema inspection is fine; no writes, no `AutoMigrate` against the live DB, no running seeds. Emit migration files / SQL for the user to apply.

## Two independent projects, no root workspace

`gqs-backend/` and `gqs-frontend/` are separate — no Makefile, no Docker, no root tool ties them together. Run commands from inside the relevant subdirectory.

### Backend (`gqs-backend/`) — Go 1.26.2

Module: `github.com/rainbrookx/go-qrcode-saas`. **Go 1.26.2 is recent** — verify stdlib/API assumptions against this version, not older Go.

Intended stack (per `AGENTS.md`, not yet implemented):
- **Gin** web framework with standard layout: `cmd/server/main.go` entrypoint, `internal/` for app-private packages, `pkg/` only for code intended for external import.
- **GORM** (`gorm.io/gorm` + `gorm.io/driver/mysql`) against **MySQL**. Models under `internal/model/`, queries under `internal/repository/`. Emit schema changes as SQL migration files — do not call `AutoMigrate` from agent-run code.
- **JWT** via `github.com/golang-jwt/jwt/v5`, HS256, secret from `JWT_SECRET` env. Middleware at `internal/middleware/auth.go`, claims under `internal/auth/`. Never hardcode secrets.

Commands (once code exists):
```
go build ./...
go vet ./...
go test ./...
go test -run TestName ./internal/...   # single test
```

### Frontend (`gqs-frontend/`)

Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind **v4** via `@tailwindcss/postcss` (no `tailwind.config.js` — v3 patterns do not apply). Package manager is **pnpm** — never use npm/yarn.

- TS path alias `@/*` → `./*`, rooted at `gqs-frontend/`. **There is no `src/` directory.**
- ESLint uses **flat config** (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals` + `/typescript`. Do not add `.eslintrc*`.
- No standalone typecheck script — use `pnpm build`, or `pnpm exec tsc --noEmit` for a quick check.
- `pnpm-workspace.yaml` exists only to approve `sharp` / `unrs-resolver` builds — leave it alone.

Commands:
```
pnpm dev      # dev server
pnpm build    # production build (also typechecks)
pnpm start    # serve production build
pnpm lint     # ESLint
```

## Verification before declaring a task done

- Frontend: `pnpm lint` then `pnpm build`.
- Backend (once code exists): `go vet ./...` then `go test ./...`.

## Product context (`doc/SRS.md`)

Open-source QR-code SaaS — **no paid features**. No admin backend in the MVP. Frontend uses **Ant Design**. Six tabs:

| Tab | Code | Behavior | Login | Persisted? |
|---|---|---|---|---|
| 文本 (Text) | `text` | Plain text → QR | No | **No — one-shot, never stored (even when logged in)** |
| 网址静态码 (URL static) | `url` | URL → QR with `http(s)://` placeholder | No | **No — one-shot, never stored (even when logged in)** |
| 网址跳转码 (URL redirect) | `urldyn` | Backend-issued short link `/u/<code>` that redirects | Yes | Yes — editable target, access stats |
| 文章 (Article) | `article` | Short link `/a/<code>` to a TipTap rich-text article (image / video / audio / file, with size & length limits) | Yes | Yes — editable, access stats |
| 表单 (Form) | `form` | Short link `/f/<code>` to a drag-built form; JSON config; **anonymous submissions only** | Yes (to create) | Yes — editable, submission stats |
| 解码 (Decode) | `deqr` | Decode an uploaded QR image (≤5 MB) | No | **No — one-shot, never stored** |

Rules of thumb:
- **`text` / `url` / `deqr` are generated entirely on the frontend and never hit the database** — no save endpoint, no history, even for logged-in users.
- **`urldyn` / `article` / `form` go through the backend**: short link + persisted resource + access stats. Default link validity 30 days, user-configurable up to 60 days. User quota: **100 active codes** total across these three.
- Short codes: Base62, 8 chars, all lowercase, unguessable (shuffled, not sequential). Banned chars: `0 O o 1 I l`, `_ - ~ ! @ # $ % ^ & * ( )`, whitespace, CJK, emoji, backslash. See `doc/SRS.md` §7 for full rules.
- QR output is always standard-style PNG — **no style customization**.
- Article attachments are stored in **MinIO**; executables (`.exe`/`.bat`) and scripts (`.js`/`.php`/`.py`) are rejected.

## Environment

Windows host, bash shell available. Use forward slashes in paths and Unix-style commands (`/dev/null`, not `NUL`). Quote paths containing spaces.
