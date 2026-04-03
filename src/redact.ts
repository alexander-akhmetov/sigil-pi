/**
 * Secret redaction for Sigil content capture.
 *
 * ~20 high-confidence patterns from Gitleaks. Two tiers:
 *   - Tier 1: definite secret formats — used by both redact() and redactLightweight()
 *   - Tier 2: heuristic env patterns — used only by redact()
 */

interface SecretPattern {
  id: string;
  regex: RegExp;
  tier: 1 | 2;
}

const TIER1_PATTERNS: SecretPattern[] = [
  { id: "grafana-cloud-token", regex: /\bglc_[A-Za-z0-9_-]{20,}/g, tier: 1 },
  {
    id: "grafana-service-account-token",
    regex: /\bglsa_[A-Za-z0-9_-]{20,}/g,
    tier: 1,
  },
  {
    id: "aws-access-token",
    regex: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/g,
    tier: 1,
  },
  { id: "github-pat", regex: /\bghp_[A-Za-z0-9_]{36,}/g, tier: 1 },
  { id: "github-oauth", regex: /\bgho_[A-Za-z0-9_]{36,}/g, tier: 1 },
  { id: "github-app-token", regex: /\bghs_[A-Za-z0-9_]{36,}/g, tier: 1 },
  {
    id: "github-fine-grained-pat",
    regex: /\bgithub_pat_[A-Za-z0-9_]{82}/g,
    tier: 1,
  },
  {
    id: "anthropic-api-key",
    regex: /\bsk-ant-api03-[a-zA-Z0-9_-]{93}AA/g,
    tier: 1,
  },
  {
    id: "anthropic-admin-key",
    regex: /\bsk-ant-admin01-[a-zA-Z0-9_-]{93}AA/g,
    tier: 1,
  },
  {
    id: "openai-api-key",
    regex: /\bsk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}/g,
    tier: 1,
  },
  { id: "openai-project-key", regex: /\bsk-proj-[a-zA-Z0-9_-]{40,}/g, tier: 1 },
  {
    id: "openai-svcacct-key",
    regex: /\bsk-svcacct-[a-zA-Z0-9_-]{40,}/g,
    tier: 1,
  },
  { id: "gcp-api-key", regex: /\bAIza[A-Za-z0-9_-]{35}/g, tier: 1 },
  {
    id: "private-key",
    regex:
      /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
    tier: 1,
  },
  {
    id: "connection-string",
    regex: /(?:postgres|mysql|mongodb|redis|amqp):\/\/[^\s'"]+@[^\s'"]+/g,
    tier: 1,
  },
  {
    id: "bearer-token",
    regex: /[Bb]earer\s+[A-Za-z0-9_.\-~+/]{20,}={0,3}/g,
    tier: 1,
  },
  { id: "slack-token", regex: /\bxox[bporas]-[A-Za-z0-9-]{10,}/g, tier: 1 },
  {
    id: "stripe-key",
    regex: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}/g,
    tier: 1,
  },
  {
    id: "sendgrid-api-key",
    regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    tier: 1,
  },
  { id: "twilio-api-key", regex: /\bSK[a-f0-9]{32}/g, tier: 1 },
  { id: "npm-token", regex: /\bnpm_[A-Za-z0-9]{36}/g, tier: 1 },
  { id: "pypi-token", regex: /\bpypi-[A-Za-z0-9_-]{50,}/g, tier: 1 },
];

const TIER2_PATTERNS: SecretPattern[] = [
  {
    id: "env-secret-value",
    regex:
      /(?<=(?:PASSWORD|SECRET|TOKEN|KEY|CREDENTIAL|API_KEY|PRIVATE_KEY|ACCESS_KEY)\s*[=:]\s*)\S+/gi,
    tier: 2,
  },
  {
    id: "json-secret-field",
    regex:
      /(?<="(?:password|secret|token|credential|api_?key|private_?key|access_?key|client_?secret|auth_?token|secret_?key)"\s*:\s*")[^"]+/gi,
    tier: 2,
  },
];

export class Redactor {
  private tier1 = TIER1_PATTERNS;
  private tier2 = TIER2_PATTERNS;

  /** Full redaction: tier 1 + tier 2. For tool call args and tool results. */
  redact(text: string): string {
    let result = text;
    for (const pattern of this.tier1) {
      pattern.regex.lastIndex = 0;
      result = result.replace(pattern.regex, `[REDACTED:${pattern.id}]`);
    }
    for (const pattern of this.tier2) {
      pattern.regex.lastIndex = 0;
      result = result.replace(pattern.regex, `[REDACTED:${pattern.id}]`);
    }
    return result;
  }

  /** Lightweight redaction: tier 1 only. For assistant text and reasoning. */
  redactLightweight(text: string): string {
    let result = text;
    for (const pattern of this.tier1) {
      pattern.regex.lastIndex = 0;
      result = result.replace(pattern.regex, `[REDACTED:${pattern.id}]`);
    }
    return result;
  }
}
