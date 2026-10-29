#!/bin/bash
# Double-click to finish production setup (Neon trusted domains + real account test).
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install
node scripts/finish-setup.mjs
echo
read -r -p "Press Enter to close this window…"
