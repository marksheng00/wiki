#!/bin/sh
# Make the 256px portraits the knowledge graph draws (assets/images/graph/).
# Run from the repo root after adding or replacing entity images:
#   sh tools/make-graph-thumbs.sh
# Uses sips on macOS, ImageMagick elsewhere. The full images stay as they are.
set -e
out=assets/images/graph
mkdir -p "$out"
node -e '
  global.window = {};
  eval(require("fs").readFileSync("data/wiki_store.js", "utf8").replace(/^﻿/, ""));
  const nodes = Object.values(window.WIKI_STORE.master.knowledge_graph.all_nodes);
  const files = new Set(nodes.filter((n) => n.imageUrl).map((n) => n.imageUrl.split("/").pop()));
  console.log([...files].join("\n"));
' | while read -r f; do
  if command -v sips >/dev/null 2>&1; then
    sips -Z 256 -s formatOptions 80 "assets/images/$f" --out "$out/$f" >/dev/null
  else
    convert "assets/images/$f" -resize 256x256 -strip -quality 80 -sampling-factor 4:2:0 "$out/$f"
  fi
done
echo "Wrote $(ls "$out" | wc -l | tr -d ' ') portraits to $out"
