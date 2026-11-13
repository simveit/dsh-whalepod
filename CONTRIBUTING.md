# Contributing

Bug reports, questions and ideas are very welcome as GitHub issues. At this early stage we do not accept pull requests: this is a side project, and the maintainer wants to keep the design focused and does not have the capacity to review contributions. A pull request will be closed without review, so please open an issue instead. This may change later.

## Reporting an issue

These details help:

- the DeepSeek Harness version (`dsh --version`) and the profile (`desktop`, `web` or another);
- the plugin version;
- your operating system;
- what you did, what you expected, and what happened instead;
- the host log lines that start with `[dsh-coordinator]` (the log prefix keeps the plugin's earlier name), if there are any.

Never paste credentials, API keys or tokens, and remove private paths, names and session content you do not want to publish.

Security problems go through [SECURITY.md](SECURITY.md), not a public issue.

## Building the plugin locally or forking it

These notes are for people who build the plugin themselves or keep a fork. The code is MIT licensed, so forks are fine.

### Setting up

Either toolchain works:

- **The app's own Node and pnpm**, as described in the Development section of the [README](README.md#development). Nothing is installed globally.
- **Node 24 and pnpm 11** from anywhere else, for example on Linux or in CI. Use the same lockfile: `pnpm install --frozen-lockfile`.

The build always runs tsdown on rolldown's WebAssembly binding (`NAPI_RS_FORCE_WASI=true` in the `build` script), so both toolchains produce the same `lib/`.

Before you use a build, run:

```sh
pnpm check   # typecheck, tests, build and a pack dry run
```

To try a change in a running app, `scripts/dev.sh` links this folder into a separate dev home and starts `dsh web`. It never touches `~/.dsh`. `dev/mock-llm.mjs` gives you a scripted model, so you need no model credentials. The README explains both.

### Conventions

- `lib/` is committed as a release build, so that `github:` installs need no build step. Run `pnpm run build` (not `scripts/dev.sh`) and commit `lib/` with every change to `src/`. CI checks that the committed `lib/` matches a fresh build.
- Keep the three READMEs (`README.md`, `README.zh-CN.md`, `README.de.md`) in step.
- User-facing strings live in `src/client/locales.ts`, in `en` and `zh`. The plugin title and description in `locale/` and the READMEs exist in three languages.
- `src/client/remote.ts` is a hand-written copy of the Remote spec. Keep it in sync with the `@Remote` methods in `src/index.ts`.
- A security-relevant change updates [docs/security.md](docs/security.md). A design choice gets an entry in [docs/decisions.md](docs/decisions.md).
- Files that contain code derived from dsh-superagent-prototype carry an attribution header. Keep it, and add one to any new file that copies prototype or dsh code. See [docs/superagent-prototype.md](docs/superagent-prototype.md).
- Add a line to [CHANGELOG.md](CHANGELOG.md) under the next version.
