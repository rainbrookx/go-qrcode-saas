# AGENTS.md

Repo state: early skeleton. `gqs-backend/` is an empty Go module; `gqs-frontend/` is a freshly scaffolded Next.js app. Architecture is not yet established — establish it as you go and keep this file updated.

## Hard constraints (persistent, do not violate)
- Do NOT modify `gqs-backend/go.mod`, `gqs-frontend/package.json`, `pnpm-lock.yaml`, or any other lockfile / `go.sum`.
- Do NOT run dependency install or mutation commands: `pnpm install`, `pnpm add`, `npm i`, `go get`, `go mod tidy`, etc. The user installs all deps manually.
- When new deps are needed, in your reply provide **both**: (a) name + version + one-line reason, and (b) the exact install command (e.g. `pnpm add foo@^1.2 -D` or `go get github.com/x/y@v1.2.3`).
- Database: **read-only inspection OK** (`SELECT`, `\dt`, etc.), **no writes**, no running migrations or seeds. Emit migration files / SQL for the user to apply.

## Layout
- `gqs-backend/` — Go module `github.com/rainbrookx/go-qrcode-saas`, **Go 1.26.2**. Empty.
- `gqs-frontend/` — Next.js 16.2.6 App Router, React 19.2.4, Tailwind v4, TS 5, **pnpm**.
- No root workspace tool ties the two together.

## Backend (`gqs-backend/`) — intended direction
- **Go 1.26.2** (recent; verify any stdlib/API assumptions against this version, not older Go).
- Web framework: **Gin**. Use standard project layout: `cmd/server/main.go` for the entrypoint, `internal/` for app-private packages, `pkg/` only for code intended for external import.
- Commands once code exists: `go build ./...`, `go vet ./...`, `go test ./...`. Single test: `go test -run TestName ./internal/...`.
- Never run `go mod tidy` (mutates `go.mod` and creates `go.sum`).

## Frontend (`gqs-frontend/`)
- Package manager: **pnpm** (lockfile `pnpm-lock.yaml`). Always `pnpm <script>`, never npm/yarn.
- Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.
- Typecheck: no standalone script — rely on `pnpm build`, or `pnpm exec tsc --noEmit` for a quick check.
- ESLint: **flat config** (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `/typescript`. Do not add `.eslintrc*`.
- Tailwind **v4** via `@tailwindcss/postcss` (no `tailwind.config.js` by default; v3 patterns do not apply).
- TS path alias: `@/*` → `./*` (rooted at `gqs-frontend/`; there is no `src/` directory).
- `pnpm-workspace.yaml` configures `sharp` / `unrs-resolver` build approvals — leave it alone.

## Verification before declaring a task done
- Frontend: `pnpm lint` then `pnpm build`.
- Backend (once code exists): `go vet ./...` then `go test ./...`.

## Environment
- Host: Windows, `pwsh`. Prefer cross-platform commands; quote paths with spaces.
- No `opencode.json`, `CLAUDE.md`, `.cursorrules`, or CI configs exist — this file is the single source of agent guidance.
