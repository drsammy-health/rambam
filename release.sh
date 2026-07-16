#!/bin/bash
set -euo pipefail

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh 0.2.0"
  exit 1
fi

echo "Bumping version to $VERSION..."

# Update package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
rm -f package.json.bak

# Update tauri.conf.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.bak

echo "Committing..."
git add -A
git commit -m "chore: bump version to $VERSION"

echo "Creating tag v$VERSION..."
git tag "v$VERSION"

echo "Pushing..."
git push origin main
git push origin "v$VERSION"

echo "Done! Release workflow started at:"
echo "https://github.com/$(git remote get-url origin | sed 's/.*github.com\///' | sed 's/\.git$//')/actions"
