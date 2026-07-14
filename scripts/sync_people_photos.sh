#!/usr/bin/env bash
#
# Downloads the People sheet's photos (Google Drive links) into
# assets/people/cache/<FILE_ID>.jpg so the site can serve them locally.
#
# Google Drive rate-limits hotlinked images, which makes them load
# unreliably in the browser. Serving a local copy fixes that. Re-run this
# whenever you add or change a photo in the People sheet:
#
#     ./scripts/sync_people_photos.sh
#
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SHEET="https://docs.google.com/spreadsheets/d/18qyd5031XPflj8yAxMd0R3CJAkj8tQMtb8-9AS-1tzs/gviz/tq?tqx=out:csv"
OUT="$REPO/assets/people/cache"

mkdir -p "$OUT"

# Pull Drive file IDs out of the Photo column (matches /d/<id> and id=<id>).
ids=$(curl -sL "$SHEET" \
    | grep -oE 'drive\.google\.com/[^",]*' \
    | grep -oE '(/d/|id=)[A-Za-z0-9_-]+' \
    | sed -E 's#(/d/|id=)##' \
    | sort -u)

if [ -z "$ids" ]; then
    echo "No Google Drive photos found in the sheet."
    exit 0
fi

count=0
echo "$ids" | while read -r id; do
    [ -z "$id" ] && continue
    dest="$OUT/$id.jpg"
    curl -sL -o "$dest" "https://drive.google.com/thumbnail?id=$id&sz=w1000"
    if file "$dest" | grep -qiE 'image data|JPEG|PNG'; then
        echo "  cached $id.jpg"
        count=$((count + 1))
    else
        echo "  WARN: $id did not return an image (is the Drive file shared publicly?). Skipping."
        rm -f "$dest"
    fi
done

echo "Done. Photos cached in assets/people/cache/"
