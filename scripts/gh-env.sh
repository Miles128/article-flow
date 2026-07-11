# Article Flow — GitHub CLI 配置目录（Cursor 终端 XDG_CONFIG_HOME 可能只读）
# shellcheck shell=bash
# 用法: source scripts/gh-env.sh && article_flow_prepare_gh

article_flow_prepare_gh() {
  export GH_CONFIG_DIR="${GH_CONFIG_DIR:-${HOME}/.config/gh}"
  mkdir -p "$GH_CONFIG_DIR"

  if [ -n "${XDG_CONFIG_HOME:-}" ] && [ ! -w "${XDG_CONFIG_HOME}" ] 2>/dev/null; then
    echo "  gh: 跳过不可写的 XDG_CONFIG_HOME (${XDG_CONFIG_HOME})"
    unset XDG_CONFIG_HOME
  fi
}
