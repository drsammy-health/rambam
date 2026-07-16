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

Use the release script:

```bash
./release.sh 0.1.0
```

This bumps the version, commits, tags, and pushes. GitHub Actions will build installers for macOS and Windows and create a draft release.
