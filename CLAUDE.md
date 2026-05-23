# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

Design docs in `doc/` define product requirements and API behavior:
- `doc/SRS.md` — product requirements, feature specs, business rules
- `doc/API.md` — REST API contract, error codes, request/response schemas
- `doc/UI_STYLE_GUIDE.md` — design tokens, layout, component conventions
- `doc/TECH_STACK.md` — full technology stack with install commands

## Hard constraints

- **Never modify** `gqs-backend/go.mod`, `gqs-backend/go.sum`, `gqs-frontend/package.json`, or `gqs-frontend/pnpm-lock.yaml`.
- **Never run** dependency-mutating commands: `pnpm install`, `pnpm add`, `npm i`, `go get`, `go mod tidy`, etc. The user installs dependencies manually.
- When a new dependency is needed, reply with both (a) name + one-line reason, and (b) the exact install command for the user to run.
- **Database is read-only** for Claude-run operations: schema inspection and `SELECT` are fine; no writes, live `AutoMigrate`, or seeds. Emit migration files / SQL for the user to apply.
- **Never hardcode secrets**. Use env vars such as `JWT_SECRET`, `DB_DSN`, `MINIO_*`, `SMTP_*`, `BASE_URL`.

## Repository layout

`gqs-backend/` and `gqs-frontend/` are independent projects. There is no root workspace, Makefile, or Docker setup tying them together. Run commands from inside the relevant project directory.

Backend serves on `:8080`; frontend dev server on `:3000`. The frontend proxies `/api/*` to `http://localhost:8080/api/*` via `next.config.ts` rewrites, and redirects `/` to `/text`.

## Backend (`gqs-backend/`) — Go 1.26.2

Module: `github.com/rainbrookx/go-qrcode-saas`.

Commands:
```
go build ./...
go vet ./...
go test ./...
go test -run TestName ./internal/...   # single test
```

Architecture:
- `cmd/server/main.go` wires config, MySQL, repositories, handlers, middleware, and Gin routes.
- `internal/config/` loads `.env` plus environment variables with Viper.
- `internal/database/` initializes GORM MySQL; schema changes should be SQL/migrations, not runtime `AutoMigrate`.
- `internal/model/` holds GORM models for users, refresh tokens, email codes, URL dynamic codes, articles, attachments, forms, submissions, and access stats.
- `internal/repository/` is the data access layer. Keep DB queries here rather than in handlers.
- `internal/handler/` contains Gin handlers by domain: auth, dynamic URL, article, form, upload, public article/form, redirects, code listing.
- `internal/middleware/` handles CORS and JWT auth; authenticated handlers read `user_id` from Gin context.
- `internal/auth/` handles password hashing, JWT issuing/parsing, and email sending.
- `internal/shortcode/` generates fixed 8-character non-sequential short codes.
- `internal/storage/` wraps MinIO upload and presigned URL behavior.
- `internal/response/` defines the API envelope `{ "code": 0, "message": "ok", "data": ... }` and error codes.

Routing pattern:
- API routes live under `/api/v1`.
- Public auth: `/api/v1/auth/register`, `/login`, `/verify-code`, `/reset-password`, `/refresh`.
- Protected auth/user: `/api/v1/auth/change-password`, `/auth/me`, `/user/quota`.
- Protected CRUD domains: `/api/v1/urldyn`, `/article`, `/form`, `/upload`, `/codes`.
- Public short links use no API prefix: `/u/:code`, `/a/:code`, `/f/:code`.
- Public read/submit handlers exist for article/form (`/public/article/:code`, `/public/form/:code`, `/public/form/:code/submit`) and should stay unauthenticated.
- Uploaded files are served at `/api/v1/files/*key` — the backend proxies MinIO so port 9000 is never exposed to the browser.

## Frontend (`gqs-frontend/`)

Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind v4 via `@tailwindcss/postcss`, Ant Design 6, Zustand, Axios, TipTap, form-render, qrcode.react, jsqr. Package manager is **pnpm**; never use npm/yarn.

Commands:
```
pnpm dev                         # dev server
pnpm build                       # production build and typecheck
pnpm start                       # serve production build
pnpm lint                        # ESLint
pnpm exec tsc --noEmit           # quick typecheck if needed
```

Architecture:
- App Router files live directly under `app/`; there is no `src/` directory.
- TS path alias `@/*` maps to `./*`, rooted at `gqs-frontend/`.
- Main authenticated/public tool pages are grouped under `app/(main)/` and share `app/(main)/layout.tsx` with `Header` and `Footer`.
- Public render pages for short links are `app/u/[code]/page.tsx`, `app/a/[code]/page.tsx`, and `app/f/[code]/page.tsx`.
- Auth pages are `app/login/page.tsx` and `app/forgot-password/page.tsx`.
- Shared UI lives in `components/` (`QRPreview`, `QRDecoder`, `UrlDynForm`, `ArticleEditor`, `AttachmentUpload`, `FormBuilder`, `CodeList`, layout components).
- `lib/api.ts` owns the Axios client, `/api/v1` base path, bearer token injection, and refresh-token retry flow.
- `lib/store.ts` owns Zustand auth state and calls auth APIs.
- ESLint uses flat config (`eslint.config.mjs`); do not add `.eslintrc*`.
- Tailwind v4 does not use `tailwind.config.js`; also follow `doc/UI_STYLE_GUIDE.md` when changing UI.

## Product rules to preserve

Open-source QR-code SaaS — no paid features and no admin backend in MVP.

| Tab | Code | Login | Persistence |
|---|---|---|---|
| 文本 | `text` | No | Frontend-only QR generation, never stored |
| 网址静态码 | `url` | No | Frontend-only QR generation, never stored |
| 网址跳转码 | `urldyn` | Yes | Backend short link `/u/<code>`, editable, stats |
| 文章 | `article` | Yes | Backend short link `/a/<code>`, TipTap content, MinIO attachments, stats |
| 表单 | `form` | Yes | Backend short link `/f/<code>`, anonymous submissions, stats |
| 解码 | `deqr` | No | Frontend-only QR decode, never stored |

Key business rules:
- `text`, `url`, and `deqr` must not call persistence APIs or touch the database.
- User quota is 100 active codes total across `urldyn`, `article`, and `form`.
- Short codes are Base62-like, fixed 8 chars, lowercase/non-confusing/non-sequential; banned chars include `0 O o 1 I l`, punctuation listed in SRS, whitespace, CJK, emoji, and backslash.
- Short-link validity defaults to 30 days and is configurable from 1–60 days.
- Updating `expires_in` recalculates from current time rather than stacking on the original expiry.
- Articles cap body content at 50,000 chars; video + file attachments are at most 1 total; block `.exe`, `.bat`, `.js`, `.php`, `.py`.
- Forms cap at 50 fields; submissions are anonymous; public submit is rate-limited; export supports CSV and xlsx.
- QR output is standard-style PNG at 200×200px display with no style customization.

## Verification before declaring work done

- Frontend changes: run `pnpm lint` then `pnpm build` from `gqs-frontend/`. For UI changes, also run the app and check the flow in a browser.
- Backend changes: run `go vet ./...` then `go test ./...` from `gqs-backend/`.

## Environment

Windows host with bash available. Use forward slashes and Unix-style shell syntax (`/dev/null`, not `NUL`). Quote paths containing spaces.
