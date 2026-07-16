# rambam

A desktop app for visualizing health data from the Open Wearables API. Select multiple users, toggle metrics, and view interactive charts with per-unit Y-axes. Export AI summaries to clipboard.

Built with Tauri + React + Chart.js.

## Development

```bash
bun install
bun run desktop
```

## Build

```bash
bun run desktop:build
```

## Release

Push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will build installers for macOS and Windows and create a draft release.
