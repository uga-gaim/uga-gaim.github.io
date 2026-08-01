#!/bin/zsh
# Usage: ./compress-images.sh <folder|file>
# Compresses a single image or all images in a folder to max 1200px, in place.

if [ -z "$1" ]; then
    echo "Usage: $0 <folder|file>"
    exit 1
fi

compress_file() {
    local f="$1"
    case "${f:l}" in
        *.png|*.jpg|*.jpeg|*.webp)
            sips -Z 1200 "$f" --out "$f" > /dev/null 2>&1
            echo "Compressed: $f"
            ;;
        *)
            echo "Skipped (unsupported type): $f"
            ;;
    esac
}

if [ -f "$1" ]; then
    compress_file "$1"
elif [ -d "$1" ]; then
    find "$1" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) | while read f; do
        compress_file "$f"
    done
else
    echo "Error: '$1' is not a file or directory."
    exit 1
fi

echo "Done."
