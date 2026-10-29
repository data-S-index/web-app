#!/usr/bin/env bash
# Usage: notify-discord.sh <title> <description> <success|warning|failure>
# Posts an embed to DISCORD_WEBHOOK_URL. No-op when the webhook is not set.
set -uo pipefail

[ -z "${DISCORD_WEBHOOK_URL:-}" ] && exit 0

case "${3:-success}" in
  failure) color=15158332 ;;
  warning) color=15844367 ;;
  *) color=3066993 ;;
esac

run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"

payload=$(jq -n \
  --arg title "$1" \
  --arg description "$2" \
  --argjson color "$color" \
  --arg url "$run_url" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{embeds: [{title: $title, description: $description, color: $color, url: $url, timestamp: $timestamp}]}')

curl -fsS -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK_URL" \
  || echo "::warning::Failed to post to Discord"
