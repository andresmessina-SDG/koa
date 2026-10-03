#!/bin/sh
# Builds index.html from the files in src. Run it after you change anything in src.
set -e
cd "$(dirname "$0")"
{
  cat src/head.html src/body.html
  echo "<script>"
  for f in src/js/*.js; do cat "$f"; done
} > index.html
echo "Built index.html"
