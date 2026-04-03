import { describe, expect, it } from "vitest";
import { Redactor } from "./redact.js";

const redactor = new Redactor();

describe("Redactor", () => {
  describe("tier 1 patterns", () => {
    const cases = [
      {
        name: "Grafana cloud token",
        input: "glc_abcdefghijklmnopqrstuvwxyz1234",
        id: "grafana-cloud-token",
      },
      {
        name: "Grafana SA token",
        input: "glsa_abcdefghijklmnopqrstuvwxyz1234",
        id: "grafana-service-account-token",
      },
      {
        name: "AWS access key",
        input: "AKIAIOSFODNN7EXAMPLE",
        id: "aws-access-token",
      },
      {
        name: "GitHub PAT",
        input: "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl",
        id: "github-pat",
      },
      {
        name: "Slack token",
        input: "xoxb-1234567890-abcdefghij",
        id: "slack-token",
      },
      {
        name: "Stripe test key",
        input: "sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZab",
        id: "stripe-key",
      },
      {
        name: "npm token",
        input: "npm_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij",
        id: "npm-token",
      },
      {
        name: "GCP API key",
        input: "AIzaSyBExaMpLeKeY_0123456789abcdefghijk",
        id: "gcp-api-key",
      },
      {
        name: "connection string",
        input: "postgres://user:pass@host:5432/db",
        id: "connection-string",
      },
      {
        name: "bearer token",
        input: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.abc",
        id: "bearer-token",
      },
    ];

    for (const { name, input, id } of cases) {
      it(`redacts ${name}`, () => {
        const result = redactor.redact(`Found: ${input}`);
        expect(result).not.toContain(input);
        expect(result).toContain(`[REDACTED:${id}]`);
      });

      it(`redactLightweight catches ${name}`, () => {
        const result = redactor.redactLightweight(`Found: ${input}`);
        expect(result).not.toContain(input);
        expect(result).toContain(`[REDACTED:${id}]`);
      });
    }
  });

  describe("tier 2 patterns", () => {
    it("redact() catches env-style secrets", () => {
      const result = redactor.redact("PASSWORD=super-secret-value");
      expect(result).not.toContain("super-secret-value");
      expect(result).toContain("[REDACTED:env-secret-value]");
    });

    it("redactLightweight() does NOT catch env-style secrets", () => {
      const result = redactor.redactLightweight("PASSWORD=super-secret-value");
      expect(result).toContain("super-secret-value");
    });

    it("redact() catches JSON secret fields", () => {
      const cases = [
        { input: '{"password":"my-secret"}', field: "password" },
        { input: '{"api_key":"abc123"}', field: "api_key" },
        { input: '{"apiKey":"abc123"}', field: "apiKey" },
        { input: '{"client_secret":"xyz"}', field: "client_secret" },
        { input: '{"auth_token":"tok"}', field: "auth_token" },
        { input: '{"secret":"s3cr3t"}', field: "secret" },
      ];
      for (const { input, field } of cases) {
        const result = redactor.redact(input);
        expect(result, `should redact value for "${field}"`).toContain(
          "[REDACTED:json-secret-field]",
        );
        expect(result).toContain(`"${field}"`);
      }
    });

    it("redactLightweight() does NOT catch JSON secret fields", () => {
      const result = redactor.redactLightweight('{"password":"my-secret"}');
      expect(result).toContain("my-secret");
    });
  });

  describe("safe text", () => {
    it("leaves normal text unchanged", () => {
      const text = "This is a normal message about code review";
      expect(redactor.redact(text)).toBe(text);
      expect(redactor.redactLightweight(text)).toBe(text);
    });
  });
});
