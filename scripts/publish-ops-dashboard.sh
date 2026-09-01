#!/usr/bin/env bash
# Build DBS Safety and add it to a local clone of ops-dashboard.
# Then push from a machine that is logged into GitHub (gh auth login).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$ROOT/../ops-dashboard}"

cd "$ROOT"
npm run export:pages

if [ ! -f "$DEST/index.html" ]; then
  echo "Clone ops-dashboard first:"
  echo "  git clone https://github.com/drawerboxspecialties-ops/ops-dashboard.git $DEST"
  exit 1
fi

rm -rf "$DEST/safety"
mkdir -p "$DEST/safety"
cp -a "$ROOT/out/." "$DEST/safety/"
touch "$DEST/safety/.nojekyll"

python3 - "$DEST/index.html" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
marker = "        const VERCEL_APPS = [\n            {\n                name: 'cutflow',"
card = """        const VERCEL_APPS = [
            {
                name: 'dbs-safety',
                title: 'DBS Safety',
                description: 'Shop safety meetings: PPE and material handling talks, sign-in, and training record.',
                url: 'https://drawerboxspecialties-ops.github.io/ops-dashboard/safety/',
                host: 'Pages',
                cta: 'Open',
                alongsidePages: true,
                extraLinks: [
                    { label: 'Sign-in', url: 'https://drawerboxspecialties-ops.github.io/ops-dashboard/safety/meetings/sign-in/' },
                    { label: 'Talk', url: 'https://drawerboxspecialties-ops.github.io/ops-dashboard/safety/meetings/' }
                ],
                updated_at: '2026-09-01T00:00:00.000Z'
            },
            {
                name: 'cutflow',"""
if "name: 'dbs-safety'" in text:
    print("Card already present in index.html")
else:
    if marker not in text:
        raise SystemExit("Could not find VERCEL_APPS cutflow marker in index.html")
    path.write_text(text.replace(marker, card, 1))
    print("Inserted DBS Safety card")
PY

echo "Ready in $DEST"
echo "Review, then: cd $DEST && git add index.html safety && git commit -m 'Add DBS Safety' && git push"
