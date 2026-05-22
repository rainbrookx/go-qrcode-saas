# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state

Early skeleton. `gqs-backend/` — Go module with `go.mod` only, no code yet. `gqs-frontend/` — scaffolded Next.js App Router with default starter page, no custom code yet. Architecture is being established as features land — when you make a load-bearing structural choice, update this file so it stays accurate.

Design docs in `doc/` are the source of truth for product requirements and architecture decisions:
- `doc/SRS.md` — product requirements, feature specs, business rules
- `doc/API.md` — REST API contract, error codes, request/response schemas
- `doc/UI_STYLE_GUIDE.md` — design tokens, layout, component conventions
- `doc/TECH_STACK.md` — full technology stack with install commands

## Hard constraints

- **Never modify** `gqs-backend/go.mod`, `gqs-backend/go.sum`, `gqs-frontend/package.json`, or `gqs-frontend/pnpm-lock.yaml`.
- **Never run** dependency-mutating commands: `pnpm install`, `pnpm add`, `npm i`, `go get`, `go mod tidy`, etc. The user installs all deps manually.
- When a new dep is needed, reply with both (a) name + one-line reason, and (b) the exact install command (e.g. `pnpm add foo@^1.2`, `go get github.com/x/y`) for the user to run.
- **Database is read-only**: `SELECT` / schema inspection is fine; no writes, no `AutoMigrate` against the live DB, no running seeds. Emit migration files / SQL for the user to apply.
- **Never hardcode secrets**. Use env vars: `JWT_SECRET`, `DB_DSN`, `MINIO_*`, `SMTP_*`.

## Two independent projects, no root workspace

`gqs-backend/` and `gqs-frontend/` are separate — no Makefile, no Docker, no root tool ties them together. Run commands from inside the relevant subdirectory.

### Backend (`gqs-backend/`) — Go 1.26.2

Module: `github.com/rainbrookx/go-qrcode-saas`. See `doc/TECH_STACK.md` for the full dependency list.

Standard layout: `cmd/server/main.go` entrypoint, `internal/` for app-private packages, `pkg/` only for code intended for external import.

Key internal packages:
- `internal/model/` — GORM models
- `internal/repository/` — data access layer
- `internal/handler/` — Gin route handlers (grouped by domain: auth, urldyn, article, form, upload)
- `internal/middleware/` — auth (JWT validation), CORS, rate limiting
- `internal/auth/` — JWT claims, token issuers
- `internal/shortcode/` — Base62 short code generation (8 chars, shuffled, non-sequential)

Emit schema changes as SQL migration files — do not call `AutoMigrate` from agent-run code.

Commands:
```
go build ./...
go vet ./...
go test ./...
go test -run TestName ./internal/...   # single test
```

### Frontend (`gqs-frontend/`)

Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.js` — v3 patterns do not apply). Package manager is **pnpm** — never use npm/yarn.

- TS path alias `@/*` → `./*`, rooted at `gqs-frontend/`. **There is no `src/` directory.**
- ESLint uses **flat config** (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals` + `/typescript`. Do not add `.eslintrc*`.
- No standalone typecheck script — use `pnpm build`, or `pnpm exec tsc --noEmit` for a quick check.
- `pnpm-workspace.yaml` exists only to approve `sharp` / `unrs-resolver` builds — leave it alone.
- See `doc/UI_STYLE_GUIDE.md` for design tokens, spacing, component conventions — apply these when building UI.

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

## Product summary

Open-source QR-code SaaS — **no paid features**. No admin backend in the MVP. Six tabs (full details in `doc/SRS.md`):

| Tab | Code | Login | Persisted |
|---|---|---|---|
| 文本 | `text` | No | No — frontend-only QR generation, never stored |
| 网址静态码 | `url` | No | No — same, with `http(s)://` placeholder |
| 网址跳转码 | `urldyn` | Yes | Yes — backend short link `/u/<code>`, editable, stats |
| 文章 | `article` | Yes | Yes — short link `/a/<code>`, TipTap rich text, MinIO attachments, stats |
| 表单 | `form` | Yes | Yes — short link `/f/<code>`, drag-built form, anonymous submissions, stats |
| 解码 | `deqr` | No | No — frontend-only QR decode, never stored |

### Key business rules

- **`text` / `url` / `deqr` are purely frontend** — never hit the database, even for logged-in users.
- User quota: **100 active codes** total (urldyn + article + form).
- Short codes: Base62, **8 chars fixed**, all lowercase, shuffled (non-sequential). Banned chars: `0 O o 1 I l`, `_ - ~ ! @ # $ % ^ & * ( )`, whitespace, CJK, emoji, backslash. See `doc/SRS.md` §7.
- Short links default validity **30 days**, user-configurable **1–60 days**.
- `expires_in` on update recalculates from current time, not stacked on original.
- Article: max 50,000 chars body, attachments to MinIO. Video + file attachments: at most 1 total. Block `.exe` `.bat` `.js` `.php` `.py`.
- Form: max 50 fields, anonymous submissions only, rate limit 1/10s per IP. Export as CSV or xlsx.
- QR output: standard-style PNG, 200×200px display, **no style customization**.
- No save/history for text/url/deqr — one-shot only.

### Auth (full spec in `doc/API.md` §1, `doc/SRS.md` §6)

- Register/login by email + password, or email verification code.
- JWT HS256, secret from `JWT_SECRET` env.
- **Access Token**: 24h expiry. **Refresh Token**: 3-day expiry from login, single-use, rotated on each refresh. Old refresh token invalidated immediately.
- Refresh token storage: MySQL `refresh_tokens` table.
- Password change does not invalidate existing tokens (MVP simplification).
- API response envelope: `{ "code": 0, "message": "ok", "data": { } }`. Error code ranges in `doc/API.md`.

### API routing pattern

Authenticated CRUD routes under `/api/v1/`:
- `/auth/*` — register, login, refresh, reset/change password, me
- `/urldyn`, `/urldyn/:id` — URL redirect codes
- `/article`, `/article/:id` — articles
- `/form`, `/form/:id` — forms, + `/form/:id/submissions`, `/form/:id/submissions/export`
- `/upload` — file upload to MinIO
- `/codes` — cross-type active codes list
- `/user/quota` — quota check

Public short-link routes (no `/api/v1` prefix):
- `GET /u/:code` — redirect to target URL
- `GET /a/:code` — article page
- `GET /f/:code` — form fill page
- `GET /public/article/:code`, `GET /public/form/:code`, `POST /public/form/:code/submit`

## Environment

Windows host, bash shell available. Use forward slashes in paths and Unix-style commands (`/dev/null`, not `NUL`). Quote paths containing spaces.