# AGENTS.md

Whalepod (package `dsh-whalepod`) is a DeepSeek Harness (dsh) plugin. It adds coordinator chats that delegate work to independent Executor Sessions, follow them and report back, plus a Coordinator page, a pane and sidebar rows in the web client. Read [docs/architecture.md](docs/architecture.md) before changing `src/host/` and [docs/security.md](docs/security.md) before changing anything a model or an Executor Session can reach.

## Repository layout

```
src/index.ts      plugin entry: host service, config and the `coordinator` Remote methods (@Remote)
src/types.ts      wire types shared by host and client
src/host/         host code: coordinators and executors (threads.ts), tools, folder guard, fence, state file
src/client/       web client: page, pane, sidebar rows, store, locales.ts, remote.ts
prompts/          coordinator.md and thread.md (the Lead prompt), shipped in the package
cordis.patch.yml  bundle patch dsh applies when the plugin is installed
locale/           plugin title and description per language (en, zh, de); en and zh name the Plugins page text
docs/plugin-page*.md  that page text (shipped; the German page falls back to English)
tests/            node:test specs; harness.ts fakes the dsh host, folders go to tests/_scratch/
dev/              mock-llm.mjs (scripted local model), rpc.mjs (calls Remote methods of a local dsh web)
scripts/          dev.sh (dev server), mock-model.patch.yml (overlay for the mock model)
docs/             design, architecture, security, decisions, dsh API notes (docs/README.md lists them)
lib/              release build, committed so that a `github:` install needs no build step
```

## Commands

Nothing is on PATH. Node and pnpm come from the DeepSeek Harness app bundle:

```sh
R="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/primary-runtime/dependencies"
export PATH="$R/node/bin:$PATH"
pnpm() { node "$R/pnpm/bin/pnpm.cjs" "$@"; }

pnpm install --frozen-lockfile
pnpm run typecheck       # host and client tsconfigs, no emit
pnpm test                # node --test tests/*.test.ts
pnpm run build           # tsc for the host (lib/), tsdown for the client (lib/client.js)
pnpm check               # typecheck, test, build and pack --dry-run; must be green before a change is done
pnpm pack                # writes dsh-whalepod-<version>.tgz
```

`lib/` is committed as a release build. Rebuild it with `pnpm run build` (never `scripts/dev.sh`) before every commit that changes `src/`, and commit it with the change. CI fails when the committed `lib/` differs from a fresh build or contains the development fake data source (`grep -c -e coordinatorSource -e dco-fake lib/client.js` must print 0).

Node 24 with pnpm 11 from elsewhere (Linux, CI) also works with the same lockfile. The build forces rolldown's WebAssembly binding (`NAPI_RS_FORCE_WASI=true`), because the app's Node refuses native addons from other vendors.

To try a change in a running app, `scripts/dev.sh` builds with `DSH_COORDINATOR_DEV=1`, links this folder into the `web` profile of the dev home `.dsh-home` in this repo and starts `dsh web` on 127.0.0.1:4317. New coordinators and their Executor Sessions go to `dev-threads/`. Its development build overwrites the committed `lib/`, so run `pnpm run build` again afterwards. To run without model credentials:

```sh
node dev/mock-llm.mjs --port 4319 &
DSH_COORDINATOR_MOCK_URL=http://127.0.0.1:4319/v1 scripts/dev.sh
```

A client change needs a rebuild and a page reload; a host change needs a restart. The script header lists the other dev-only variables.

## The real dsh home

Never read, write or point `DSH_HOME` at the real dsh home (`~/.dsh`). It holds `.credentials.yaml`, every Session log and the user's profiles. `scripts/dev.sh` refuses it; tests use `tests/_scratch/`. Never commit credentials, `.dsh-home/`, `dev-threads/` or a development build of `lib/client.js`.

## Conventions

- **Keep the security invariants** listed in [docs/security.md](docs/security.md), and update that page with any security-relevant change:
  - Output of Executor Sessions is untrusted data. It reaches a coordinator only through `src/host/fence.ts` and never counts as the user's instruction.
  - Coordinators have no shell, write, edit, network or browser tools (`COORDINATOR_NEVER` in `src/host/coordinator-tools.ts`).
  - Scoping per coordinator is enforced in the host (`src/host/scope.ts`), not by prompts. One coordinator cannot see or reach another's executors.
  - No model-callable tool changes a coordinator's folder, the allowed folders or the executor permission mode. Only the user does, on the Coordinator page or through the folder confirmation.
- **Keep `src/client/remote.ts` in sync** with the `@Remote` methods in `src/index.ts`. It is a hand-written copy of the spec the dsh generator would emit.
- **Keep the config in one shape:** a new or changed config key goes into `DEFAULT_CONFIG` and `parseConfig` (`src/host/ids.ts`), `CONFIG_FIELDS` (`src/host/config-schema.ts`), the Plugins page fields (`src/client/settings-fields.ts`, with labels in `locales.ts`) and the README tables. `tests/config-schema.test.ts` checks that they agree. Every field stays loose, and the host sanitizes each value on read through `liveConfig`.
- **User-facing terms:** Coordinator, Executor Session, Assignment, Report. Internal identifiers still say thread and brief (`threads.ts`, `ThreadService`, `ThreadInfo`, `thread*` config keys); do not rename them in passing.
- **UI strings** live in `src/client/locales.ts`, in `en` and `zh` (`zh` is typed against the `en` keys).
- **Stay compatible with persisted data.** The state file is version 2 and upgrades version 1 (`src/host/store.ts`); log marks such as `dsh-coordinator:role:<id>` and `dsh-coordinator:brief:` request ids are read back from existing Session logs. Changing a stored format needs a new version and an upgrade path, as described under Persistence and restart in [docs/architecture.md](docs/architecture.md). The package is `dsh-whalepod` (in `package.json`, the bundle row's `name` in `cordis.patch.yml`, the client module id in `tsdown.config.ts`, the Remote spec's `package` and the Plugins page slot key), while everything installed data depends on keeps the historical name `dsh-coordinator`: the plugin entry id (it keys the user's settings row), the storage folder and lock, the log marks, the message source kind and the host log prefix. Never rename those with the package.
- **Tests accompany host changes.** Add or extend a spec in `tests/` that drives `ThreadService` through `tests/harness.ts`.
- **Docs accompany code changes:** [docs/architecture.md](docs/architecture.md) for behaviour, [docs/decisions.md](docs/decisions.md) for a design choice, [docs/dsh-api-notes.md](docs/dsh-api-notes.md) for a dsh API the plugin relies on, and a line in [CHANGELOG.md](CHANGELOG.md) under the next version.
- **Three READMEs:** `README.md`, `README.zh-CN.md` and `README.de.md` stay in step.
- **Attribution headers:** files with code derived from dsh-superagent-prototype or dsh keep their header; add one to any new file that copies such code ([docs/superagent-prototype.md](docs/superagent-prototype.md)).
- [CONTRIBUTING.md](CONTRIBUTING.md) has the project's policy (issues welcome, no pull requests for now) and the notes for building the plugin locally or in a fork.

## Editing these instructions

`CLAUDE.md` is a symlink to `AGENTS.md`; edit `AGENTS.md`. Keep this file to orientation and rules, and link the docs for detail.
