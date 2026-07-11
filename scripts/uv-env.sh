# Article Flow — uv 缓存与 sync（由 start.sh / start-tauri.sh source）
# shellcheck shell=bash

article_flow_uv_cache_dir() {
  if [ -n "${UV_CACHE_DIR:-}" ]; then
    printf '%s\n' "$UV_CACHE_DIR"
    return 0
  fi
  printf '%s\n' "${HOME}/.cache/uv-article-flow"
}

# 避免 Cursor/Agent 注入只读 XDG_CACHE_HOME 导致 uv sync 失败
article_flow_prepare_uv() {
  local backend_dir="$1"
  export UV_CACHE_DIR
  UV_CACHE_DIR="$(article_flow_uv_cache_dir)"
  mkdir -p "$UV_CACHE_DIR"

  if [ -n "${XDG_CACHE_HOME:-}" ] && [ ! -w "${XDG_CACHE_HOME}" ] 2>/dev/null; then
    echo "  uv: 跳过不可写的 XDG_CACHE_HOME (${XDG_CACHE_HOME})"
    unset XDG_CACHE_HOME
  fi

  if ! command -v uv >/dev/null 2>&1; then
    return 1
  fi

  echo "  uv: cache=${UV_CACHE_DIR}"
  if ! (cd "$backend_dir" && uv sync --quiet 2>/dev/null); then
    (cd "$backend_dir" && uv sync)
  fi
  return 0
}
