# Project structure

Mirrors [t3code](https://github.com/pingdotgg/t3code): cross-boundary types in `packages/contracts` (one flat file per feature, literal unions instead of `enum`), the Electron bridge typed once as `DesktopBridge` nested by feature, `main.ts` kept thin with IPC handlers in `ipc/` (one file per feature, channel names in `ipc/channels.ts`). Harness is one app, so packages become folders.

```
src/
  contracts/            types shared by main, preload, and renderer
    chat.ts             Message, MessageRole
    ipc.ts              DesktopBridge, nested by feature: desktop.chat.*, desktop.auth.*
    index.ts            barrel
  ipc/                  main-process IPC handlers
    channels.ts         channel name constants, used by preload and handlers
    chat.ts             registerChat(ipcMain)
    auth.ts             registerAuth(ipcMain)
  databse/
    prisma.ts           openDatabase(path) builds PrismaClient + libsql adapter, db() getter
    threads.ts          upsertThread, appendMessage; the only place that calls db() for chat
  generated/prisma/     `prisma generate` output, gitignored
  agent/                copied from pi (github.com/earendil-works/pi, packages/agent/src/harness)
    loop.ts             runAgent(): model call -> run tool_use blocks -> feed results back, until stop
    tools/              bash, read, write, edit (+ edit-diff, path-utils, mutation queue), verbatim
    env/nodejs.ts       NodeExecutionEnv over node:fs + child_process, verbatim
    utils/              truncate, output-capture (publishes unthrottled, see below)
    types.ts, context.ts  trimmed to what tools/env/utils import
  claude-auth.ts        auth service (OAuth), called by ipc/auth.ts
  main.ts               window + registerX(ipcMain) calls, nothing else
  preload.ts            implements DesktopBridge via Channels
  renderer/             React, calls window.desktop.<feature>.<method>
```

Adding a feature `foo`:

1. `src/contracts/foo.ts` for its shared types, exported from `index.ts`. Literal unions, no `enum`, no imports from electron/react/renderer.
2. Add `foo: { ... }` to `DesktopBridge` in `src/contracts/ipc.ts`.
3. Add `foo*` channel names to `src/ipc/channels.ts`.
4. `src/ipc/foo.ts` exporting `registerFoo(ipc: IpcMain)`; call it from `main.ts`.
5. Add `foo: { ... }` to `api` in `preload.ts`. Typecheck fails until it matches the bridge.
6. Renderer calls `window.desktop.foo.*`.

Databse modules are split per aggregate, not per table or per feature: one file per root entity plus the rows that only exist through it (`threads.ts` covers threads and their messages). IPC handlers never call `db()` directly; they import from `databse/`.

Keep it flat. When a feature's service code outgrows one file, give it a folder (`src/ipc/foo/`), as t3code does for `orchestration/`.

## Database

Prisma 7 + `@prisma/adapter-libsql` on SQLite (`node:sqlite`/`bun:sqlite` are not usable: Electron
main is Node 22, and Prisma needs a driver adapter; libsql is N-API so it loads in Electron without a
rebuild). Schema in `prisma/schema.prisma`, models `@@map` onto t3code's column names. Datasource URL
lives in `prisma.config.ts` and points at Electron's userData dir; `DATABASE_URL` overrides it.
`bun run db:migrate` (= `prisma migrate dev`) after editing the schema. Migrations are applied by the
CLI only; the packaged app does not migrate itself yet.

## Left out of the pi port

Copied from pi's `packages/agent/src/harness`, then removed because nothing in harness uses them yet.
Do not reinvent these; copy them back from pi when the need shows up.

- `utils/adaptive-publisher.ts` - generic throttle that emits the latest state as a diff: first emit
  after idle is immediate, each emit then earns a delay proportional to its byte size (target
  100 KB/s, 100 ms floor), one trailing timer guarantees eventual delivery. `OutputCapture` used it to
  rate-limit streamed shell output. Needed once tool output is streamed live to the renderer; until
  then `OutputCapture.flush()` publishes on every write.
- `tools/image.ts` - magic-byte sniffing (jpeg, png minus animated, gif, webp, bmp) plus a dependency-
  free base64 encoder. `read.ts` used it to return images as `image` content blocks instead of decoded
  bytes; pi's read tool also took an optional `imageProcessor` for resizing and BMP conversion. Needed
  once the read tool should show the model screenshots or other image files.
