# kindle-screensaver

Standalone Node.js service for generating a Kindle-friendly weather screensaver PNG.

The dashboard defaults to Fahrenheit display, uses Lucide static SVG icons, and includes moon rise and moon set alongside sunrise and sunset.

## Requirements

- Node.js 22+
- Yarn 4

## Install

```bash
yarn install
yarn playwright install chromium
```

## Run

Render one image:

```bash
yarn render:once
```

Start the service:

```bash
yarn start
```

## Routes

- `/dashboard`
  - Returns the live HTML dashboard used for rendering.
- `/dashboard?orientation=landscape`
  - Returns a landscape preview for layout experimentation.
- `/kindle/latest.png`
  - Stable image route for the latest generated Kindle PNG.
- `/kindle/latest.png?redirect=1`
  - Static URL that redirects to the current versioned image URL.
- `/kindle/latest-<version>.png`
  - Cache-busting image route for Kindle clients that keep stale image responses.
- `/healthz`
  - Lightweight health response.
- `/status`
  - Detailed render, scheduler, startup, image, and UI metadata.
  - `image.url` returns the latest versioned image URL.
  - `image.redirectUrl` returns the stable redirect URL.
- `/render`
  - Triggers a manual render.

## Weather Source

Default live source:

```text
http://svc-01.home.arpa:8787/weather/home
```

Use the local fixture instead:

```bash
WEATHER_SOURCE=fixture yarn render:once
```

```powershell
$env:WEATHER_SOURCE="fixture"
yarn render:once
```

## Environment

### Core

- `HOST`
- `PORT`
- `WEATHER_API_URL`
- `WEATHER_SOURCE`
- `WEATHER_FIXTURE_PATH`
- `OUTPUT_PATH`
- `TEMP_OUTPUT_PATH`
- `RENDER_TIMEOUT_MS`
- `RENDER_INTERVAL_MS`
- `RENDER_STALE_AFTER_MS`
- `TEMPERATURE_UNIT`
  - `fahrenheit` by default
  - set to `celsius` to switch the display unit back

### Layout

- `RENDER_ORIENTATION`
  - `portrait` by default
  - set to `landscape` to experiment with a rotated layout and output size
- `RENDER_WIDTH`
- `RENDER_HEIGHT`

### Optional output tuning

These remain off by default and should only be enabled after real-device testing:

- `RENDER_OUTPUT_NORMALIZE=1`
- `RENDER_OUTPUT_SHARPEN_SIGMA=1.2`

## Current Render Behavior

- HTML is rendered with Playwright
- PNG is post-processed with Sharp
- output is flattened to white and converted to grayscale
- the dashboard shows weather condition and astronomy icons with `lucide-static`
- the dashboard includes sunrise, sunset, moon rise, and moon set
- image responses use no-cache headers and expose a versioned URL through `/status`
- the previous good image is preserved if a render fails
- scheduled rendering runs in-process with overlap protection
- startup is non-blocking and triggers a background render only when needed

## Verification

### Phase 1

```bash
yarn render:once
```

Confirm `data/latest.png` exists and matches the expected Kindle dimensions.

### Phase 2 and 3

Start the service and check:

- `http://localhost:8788/dashboard`
- `http://localhost:8788/kindle/latest.png`
- `http://localhost:8788/healthz`
- `http://localhost:8788/status`

Confirm `/status` includes image freshness, render lifecycle, and scheduler metadata.
If the Kindle keeps an old image, try `http://localhost:8788/kindle/latest.png?redirect=1` first. If the Kindle downloader does not follow redirects, use a refresh script that reads `/status` and downloads the current `image.url` value before applying the PNG.

### Phase 4

Compare portrait and landscape previews:

- `http://localhost:8788/dashboard`
- `http://localhost:8788/dashboard?orientation=landscape`

Optional tuning pass after device testing:

```bash
RENDER_OUTPUT_NORMALIZE=1 yarn render:once
RENDER_OUTPUT_SHARPEN_SIGMA=1.2 yarn render:once
```

```powershell
$env:RENDER_OUTPUT_NORMALIZE="1"
yarn render:once

$env:RENDER_OUTPUT_SHARPEN_SIGMA="1.2"
yarn render:once
```

Keep `RENDER_OUTPUT_NORMALIZE` and `RENDER_OUTPUT_SHARPEN_SIGMA` disabled unless the device test shows they are helpful.
