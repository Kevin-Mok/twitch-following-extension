#!/usr/bin/env bash
set -euo pipefail
plain="${CLI_PLAIN:-0}"
if [[ "${1:-}" == '--plain' ]]; then plain=1; shift; fi
say() { if [[ "$plain" == 1 ]]; then printf '%s\n' "$2"; else printf '%s %s\n' "$1" "$2"; fi; }
case "${1:-}" in
  install) url='chrome://extensions/'; message='Load this folder unpacked, then open extension setup and register its exact callback.' ;;
  fortnite) url='https://www.twitch.tv/directory/category/fortnite?sort=RELEVANCE'; message='Choose Sort by > Following, then verify cards, filters, and native sort restoration.' ;;
  navigation) url='https://www.twitch.tv/directory/category/just-chatting?sort=RELEVANCE'; message='Choose Following; use Back/Forward and Videos/Clips to verify restoration and fresh category results.' ;;
  *) say '⚠️' 'Usage: scripts/open-verification.sh [--plain] install|fortnite|navigation' >&2; exit 2 ;;
esac
say '🔎' "$message"
exec "${TWITCH_VERIFY_BROWSER:-google-chrome}" "$url"
