#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

count_files() {
  find . \
    -path './.git' -prune -o \
    -type f \
    ! -path './.git/*' \
    | wc -l \
    | tr -d ' '
}

has_plugin_manifest=0
has_package_json=0
has_dist_dir=0
has_node_modules=0

[[ -f openclaw.plugin.json ]] && has_plugin_manifest=1
[[ -f package.json ]] && has_package_json=1
[[ -d dist ]] && has_dist_dir=1
[[ -d node_modules ]] && has_node_modules=1

tracked_changes="$(git status --short)"
file_count="$(count_files)"

branch_name="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo "detached-or-unborn")"

cat <<EOF
repo=$ROOT_DIR
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
branch=$branch_name
file_count=$file_count
has_package_json=$has_package_json
has_plugin_manifest=$has_plugin_manifest
has_dist_dir=$has_dist_dir
has_node_modules=$has_node_modules
EOF

echo "status_begin"
if [[ -n "$tracked_changes" ]]; then
  printf '%s\n' "$tracked_changes"
else
  echo "clean"
fi
echo "status_end"

if [[ "$has_package_json" -eq 0 || "$has_plugin_manifest" -eq 0 ]]; then
  echo "assessment=blocked:no_plugin_skeleton"
  exit 0
fi

node scripts/verify_paths.js

if [[ "$has_node_modules" -eq 0 ]]; then
  echo "assessment=in_progress:dependencies_not_installed"
  exit 0
fi

if node scripts/verify_runtime.js; then
  node scripts/verify_gateway_flow.js
  echo "assessment=healthy:installed_registered_and_flow_verified"
  exit 0
fi

if [[ "$has_dist_dir" -eq 0 ]]; then
  echo "assessment=in_progress:runtime_not_verified"
  exit 0
fi

echo "assessment=in_progress:runtime_or_flow_not_verified"
