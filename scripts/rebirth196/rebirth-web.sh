#!/bin/sh
# sh rebirth-web.sh <repo> <map-id> -> <repo>/maps/rebirth196/<id>.glb + .nav.json (+ world.json via build_catalog)
set -e
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
HERE="$(cd "$(dirname "$0")" && pwd)";REPO="$1";M="$2"
"$B" -b "$HERE/$M/$M-v7.blend" --python "$REPO/scripts/optimize-scenes-v2.py" -- "$REPO/maps/rebirth196/$M.glb" 2>&1 | grep -E "OPTIMIZE|Error" | cut -c1-200 || true
"$B" -b "$HERE/$M/$M-v7.blend" --python "$REPO/scripts/bake-nav-v2.py" -- "$HERE/$M/nav-new.json" 2>&1 | grep -E "^NAV|Error" || true
node "$HERE/rebirth-nav.mjs" "$REPO" "$M"
echo GLB $(stat -c %s "$REPO/maps/rebirth196/$M.glb") bytes
