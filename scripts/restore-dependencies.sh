#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$ROOT/package.json" || ! -f "$ROOT/pnpm-workspace.yaml" ]]; then
  echo "Could not verify repository root: $ROOT" >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install Node.js 20.10+ and enable Corepack, then retry." >&2
  exit 1
fi

echo "Repository: $ROOT"
echo "pnpm version: $(pnpm --version)"
echo
echo "Removing root and direct workspace node_modules directories..."

remove_dependency_directory() {
  local target="$1"
  case "$target" in
    "$ROOT"/node_modules|"$ROOT"/apps/*/node_modules|"$ROOT"/packages/*/node_modules)
      if [[ -e "$target" || -L "$target" ]]; then
        echo "Removing $target"
        rm -rf -- "$target"
      fi
      ;;
    *)
      echo "Refusing to remove unexpected path: $target" >&2
      exit 1
      ;;
  esac
}

remove_dependency_directory "$ROOT/node_modules"
for group in apps packages; do
  if [[ -d "$ROOT/$group" ]]; then
    while IFS= read -r -d '' workspace; do
      remove_dependency_directory "$workspace/node_modules"
    done < <(find "$ROOT/$group" -mindepth 1 -maxdepth 1 -type d -print0)
  fi
done

echo
echo "Pruning the pnpm store configured in .npmrc..."
pnpm store prune --store-dir "$ROOT/.pnpm-store"

echo
echo "Restoring dependencies from pnpm-lock.yaml..."
pnpm install --frozen-lockfile

echo
echo "Dependencies restored. Run 'make verify-install' or the verification commands in the project instructions."
