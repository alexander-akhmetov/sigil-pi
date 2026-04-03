# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pi agent extension that sends LLM generation metrics to Grafana Sigil. Runs inside the [Pi](https://github.com/badlogic/pi) coding agent runtime. By default only metrics are sent (tokens, cost, model, tools, durations) — no conversation content unless `contentCapture` is enabled.

Depends on `@grafana/sigil-sdk-js` which is linked from `../sigil-sdk/js` (file dependency). Build the SDK first if its `dist/` is missing: `cd ../sigil-sdk/js && npx tsc --project tsconfig.build.json --rootDir src`.

## Commands

```bash
npm test              # vitest run (all tests)
npm test -- src/config.test.ts   # single test file
npm run build         # typecheck + esbuild bundle → dist/index.js
npm run typecheck     # tsc --noEmit only
```

Build bundles everything (SDK + OTel) but externalizes Pi runtime packages (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, `@sinclair/typebox`).

## Architecture

The extension registers Pi lifecycle hooks (`session_start`, `turn_start`, `tool_execution_start/end`, `turn_end`, `session_shutdown`) and translates Pi events into Sigil generations.

- **`index.ts`** — Extension entry point. Registers all Pi event handlers, manages per-session and per-turn state. Every handler is wrapped in try/catch to never break the host agent.
- **`config.ts`** — Loads config from `~/.config/sigil-pi/config.json` with full env var override support (`SIGIL_PI_*`). Token values support `${ENV_VAR}` interpolation. Returns a disabled config on any failure.
- **`client.ts`** — Creates a `SigilClient` from the SDK, wiring up auth and optional OTel tracer/meter.
- **`mappers.ts`** — Converts Pi's `AssistantMessage`/`ToolResult` types into Sigil's `GenerationStart`/`GenerationResult` types. Also maps tool timing metadata. Pi types are declared locally (not imported) since they're external at runtime.
- **`redact.ts`** — Two-tier secret redaction. Tier 1 (definite patterns like API keys, PEM keys, connection strings) applies everywhere. Tier 2 (heuristic env patterns like `PASSWORD=...`) applies only to tool args/results via `redact()`. Assistant text uses `redactLightweight()` (tier 1 only).
- **`telemetry.ts`** — Sets up OTel `MeterProvider` + `TracerProvider` with OTLP/HTTP exporters when `otlp` config is present.
