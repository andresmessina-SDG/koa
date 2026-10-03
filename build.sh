#!/bin/sh
# Builds index.html from the files in src. Run it after you change anything in src.
set -e
cd "$(dirname "$0")"
{
  cat src/head.html src/body.html
  echo "<script>"
  for f in src/js/*.js; do cat "$f"; done
} > index.html
# Name the offline cache after the files, so phones that have Koa notice the new build.
v=$(cat index.html manifest.webmanifest icon.svg *.png fonts/*.woff2 | sha256sum | cut -c1-10)
sed -i "s/^const CACHE = .*/const CACHE = 'koa-$v';/" sw.js
echo "Built index.html, cache koa-$v"
