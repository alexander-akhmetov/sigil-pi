# sigil-pi

[Pi](https://github.com/badlogic/pi) agent extension that sends generation metrics to Grafana Sigil (SDK: [@grafana/sigil-sdk-js](https://github.com/grafana/sigil-sdk/tree/main/js)).

By default, only metrics are sent (token counts, cost, model, tool names, durations). No conversation content is transmitted unless explicitly opted in.

## Install

```bash
pi install git:github.com/alexander-akhmetov/sigil-pi
```

Or from a local checkout:

```bash
pi install ~/projects/sigil-pi
```

`npm install` automatically builds the bundle via the `prepare` script. The Sigil JS SDK is vendored under `vendor/sigil-sdk-js/` — no external dependencies needed.

### Development

```bash
npm install    # installs deps + builds bundle
npm test       # unit tests (vitest)
npm run build  # rebuild manually
npx biome ci . # lint + format check
```

## Configuration

Create `~/.config/sigil-pi/config.json`:

```json
{
  "enabled": true,
  "endpoint": "https://sigil.example.com",
  "auth": {
    "mode": "basic",
    "user": "123456",
    "password": "${GRAFANA_CLOUD_TOKEN}"
  }
}
```

The endpoint automatically gets `/api/v1/generations:export` appended if not already present. In basic auth mode, `tenantId` defaults to `basicUser` (stack ID) and is sent as the `X-Scope-OrgID` header. The Pi agent version is auto-detected at runtime.

Token values support `${ENV_VAR}` interpolation.

### Auth modes

**basic** — HTTP Basic auth + X-Scope-OrgID (Grafana Cloud):
```json
{ "mode": "basic", "user": "123456", "password": "${GRAFANA_CLOUD_TOKEN}" }
```

**tenant** — X-Scope-OrgID header only:
```json
{ "mode": "tenant", "tenantId": "my-tenant" }
```

**bearer** — Authorization: Bearer header:
```json
{ "mode": "bearer", "bearerToken": "${SIGIL_TOKEN}" }
```

**none** — no auth (default):
```json
{ "mode": "none" }
```

### OTLP (metrics & traces)

To export OTel metrics and traces (e.g. to Grafana Cloud), add an `otlp` section:

```json
{
  "enabled": true,
  "endpoint": "https://sigil.example.com",
  "auth": {
    "mode": "basic",
    "user": "123456",
    "password": "${GRAFANA_CLOUD_TOKEN}"
  },
  "otlp": {
    "endpoint": "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
    "user": "123456",
    "password": "${GRAFANA_CLOUD_API_KEY}"
  }
}
```

This exports `gen_ai.client.operation.duration`, `gen_ai.client.token.usage`, `gen_ai.client.tool_calls_per_operation` histograms and per-generation trace spans via OTLP/HTTP.

Auth options for OTLP:
- **basicUser + basicPassword** — HTTP Basic auth (Grafana Cloud pattern: instance ID + API key)
- **bearerToken** — Bearer token auth
- **headers** — arbitrary headers object for custom setups

### All options

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Enable the extension |
| `endpoint` | — | Sigil base URL (`/api/v1/generations:export` auto-appended) |
| `auth` | `{ "mode": "none" }` | Authentication config (see auth modes above) |
| `agentName` | `"pi"` | Agent name reported to Sigil |
| `agentVersion` | auto-detected | Pi agent version (reads from Pi's package.json) |
| `contentCapture` | `false` | Send message content (with secret redaction) |
| `otlp.endpoint` | — | OTLP gateway URL (enables metrics + traces when set) |
| `otlp.basicUser` | — | Basic auth user (Grafana Cloud instance ID) |
| `otlp.basicPassword` | — | Basic auth password (Grafana Cloud API key) |
| `otlp.bearerToken` | — | Bearer token auth |
| `otlp.headers` | — | Custom headers object |

### Environment variable overrides

Every config field can be overridden via environment variable:

| Variable | Overrides |
|----------|-----------|
| `SIGIL_PI_ENABLED` | `enabled` (`1`/`true` to enable) |
| `SIGIL_PI_ENDPOINT` | `endpoint` |
| `SIGIL_PI_AUTH_MODE` | `auth.mode` |
| `SIGIL_PI_TENANT_ID` | `auth.tenantId` |
| `SIGIL_PI_BEARER_TOKEN` | `auth.bearerToken` |
| `SIGIL_PI_BASIC_USER` | `auth.user` |
| `SIGIL_PI_BASIC_PASSWORD` | `auth.password` |
| `SIGIL_PI_AGENT_NAME` | `agentName` |
| `SIGIL_PI_AGENT_VERSION` | `agentVersion` |
| `SIGIL_PI_CONTENT_CAPTURE` | `contentCapture` |
| `SIGIL_PI_OTLP_ENDPOINT` | `otlp.endpoint` |
| `SIGIL_PI_OTLP_BASIC_USER` | `otlp.basicUser` |
| `SIGIL_PI_OTLP_BASIC_PASSWORD` | `otlp.basicPassword` |
| `SIGIL_PI_OTLP_BEARER_TOKEN` | `otlp.bearerToken` |

## What gets sent

### Sigil generations (always)

Each LLM call produces a Sigil generation with:
- Model provider and name
- Token usage (input, output, cache read, cache write)
- Cost in USD
- Stop reason
- Tool names and execution durations
- Session ID as conversation ID
- Turn timing (start → completion)

No message text, tool arguments, or tool output is included (unless `contentCapture: true`).

### With contentCapture: true

Generations additionally include:
- Assistant text and thinking blocks
- Tool call arguments and results
- All content is passed through a secret redactor that strips API keys, tokens, connection strings, PEM keys, JSON secret fields, and env-file secrets before transmission.

### OTel metrics & traces (when otlp configured)

The Sigil SDK internally instruments each generation with:
- **Metrics**: `gen_ai.client.operation.duration`, `gen_ai.client.token.usage`, `gen_ai.client.tool_calls_per_operation` histograms with provider/model/agent labels
- **Traces**: one span per generation with token counts, model info, stop reason, and error attributes

These are exported via OTLP/HTTP every 15 seconds (metrics) and in batches (traces).

## Development

```bash
npm install
npm test          # run unit tests
npm run build     # typecheck + esbuild bundle
npx biome ci .    # lint + format check
```
