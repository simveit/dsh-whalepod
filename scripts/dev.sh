#!/bin/sh
# Build the plugin, link it into the dev home's `web` profile, and start `dsh web`.
#
# Environment (all optional):
#   DSH_HOME   dev home; defaults to .dsh-home inside this repo (gitignored). Never point it at ~/.dsh.
#   DSH_APP    DeepSeek Harness.app path; defaults to /Applications/DeepSeek Harness.app.
#   PORT       listen port; defaults to 4317. The server binds 127.0.0.1 only.
#   DSH_COORDINATOR_MOCK_URL=URL   DEV-ONLY: route the DeepSeek API-key provider to a local mock model
#                                  (dev/mock-llm.mjs), e.g. http://127.0.0.1:4319/v1, with a placeholder key. The
#                                  overlay scripts/mock-model.patch.yml then makes that route the default model, so
#                                  a dev home whose profile pins another provider never reaches a real model.
#   DSH_COORDINATOR_THREADS_ROOT   DEV-ONLY: the legacy threads root (overrides threadsRoot), which only names the
#                                  home of a coordinator migrated from a version 1 state file; defaults to
#                                  dev-threads inside this repo (gitignored). Not a dot folder: the plugin refuses
#                                  thread folders under one.
#   DSH_COORDINATOR_BASE           DEV-ONLY: where New coordinator makes its folders (overrides coordinatorBase);
#                                  defaults to dev-threads inside this repo, so a dev server never writes into
#                                  ~/Documents.
#   DSH_COORDINATOR_SKIP_BUILD=1   skip install and build (when lib/ is already built).
set -eu

# Telemetry stays off in development: no session-log or launcher upload from the dev home.
export DSH_TELEMETRY_MODE=DISABLED
export DSH_TELEMETRY_DISABLED=1

plugin_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
: "${DSH_HOME:=$plugin_dir/.dsh-home}"
: "${DSH_APP:=/Applications/DeepSeek Harness.app}"
: "${PORT:=4317}"
: "${DSH_COORDINATOR_THREADS_ROOT:=$plugin_dir/dev-threads}"
: "${DSH_COORDINATOR_BASE:=$plugin_dir/dev-threads}"
export DSH_HOME DSH_COORDINATOR_THREADS_ROOT DSH_COORDINATOR_BASE
mkdir -p "$DSH_COORDINATOR_THREADS_ROOT" "$DSH_COORDINATOR_BASE"

if [ -n "${DSH_COORDINATOR_MOCK_URL:-}" ]; then
  case "$DSH_COORDINATOR_MOCK_URL" in
    http://127.0.0.1:*|http://localhost:*) ;;
    *) echo "dev.sh: DSH_COORDINATOR_MOCK_URL must be a local http URL" >&2; exit 1 ;;
  esac
  export DEEPSEEK_BASE_URL="$DSH_COORDINATOR_MOCK_URL"
  export DEEPSEEK_API_KEY=mock-key-not-a-secret
  set -- --patch "$plugin_dir/scripts/mock-model.patch.yml"
  echo "dev.sh: mock model at $DEEPSEEK_BASE_URL (default model deepseek-official/deepseek-flash)"
else
  set --
fi

case "$DSH_HOME" in
  "$HOME/.dsh"|"$HOME/.dsh/"*) echo "dev.sh: refusing to use the real dsh home ($DSH_HOME)" >&2; exit 1 ;;
esac

runtime="$DSH_APP/Contents/Resources/runtime"
deps="$runtime/primary-runtime/dependencies"
dsh="$runtime/cli/bin/dsh"
node="$deps/node/bin/node"
pnpm() { "$node" "$deps/pnpm/bin/pnpm.cjs" "$@"; }
export PATH="$deps/node/bin:$PATH"

echo "dev.sh: DSH_HOME=$DSH_HOME"
echo "dev.sh: legacy threads root $DSH_COORDINATOR_THREADS_ROOT, new coordinators in $DSH_COORDINATOR_BASE"
echo "dev.sh: dsh $("$dsh" --version 2>/dev/null || echo '?')"

# 1. Build.
cd "$plugin_dir"
if [ "${DSH_COORDINATOR_SKIP_BUILD:-}" != 1 ]; then
  pnpm install --frozen-lockfile
  # Development build: includes the client's fake data source (?coordinatorSource=fake), which release builds drop.
  DSH_COORDINATOR_DEV=1 pnpm run build
fi

# 2. Link the plugin into the web profile once. `dsh plugin` runs pnpm in the profile directory; a local
#    folder becomes a `link:` dependency and the bundle is appended to dsh.profile.bundles.
profile="$DSH_HOME/profiles/web"
has_dep() {
  [ -f "$profile/package.json" ] && "$node" -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    process.exit(m.dependencies?.[process.argv[2]] ? 0 : 1)' "$profile/package.json" "$1"
}
if has_dep dsh-whalepod; then
  echo "dev.sh: dsh-whalepod already linked into the web profile"
else
  # The package was called dsh-coordinator before; both insert the row `dsh-coordinator`, so the old link goes first.
  if has_dep dsh-coordinator; then "$dsh" plugin --profile web remove dsh-coordinator; fi
  "$dsh" plugin --profile web add "link:$plugin_dir"
fi

# Auto mode needs no step here: the plugin's own bundle layer mounts the shipped auto-review row.

# 3. Serve.
echo "dev.sh: starting dsh web on http://127.0.0.1:$PORT"
exec "$dsh" web "$@" --no-open --host 127.0.0.1 --port "$PORT"
