import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SigilPiConfig } from "./config.js";

const { SigilClientMock } = vi.hoisted(() => ({
  SigilClientMock: vi.fn(),
}));

vi.mock("@grafana/sigil-sdk-js", () => ({
  SigilClient: SigilClientMock,
}));

import { createSigilClient } from "./client.js";

function makeConfig(overrides?: Partial<SigilPiConfig>): SigilPiConfig {
  return {
    enabled: true,
    endpoint: "http://localhost:8080/api/v1/generations:export",
    auth: { mode: "none" },
    agentName: "pi",
    contentCapture: false,
    debug: false,
    ...overrides,
  };
}

describe("createSigilClient", () => {
  beforeEach(() => {
    SigilClientMock.mockReset();
    SigilClientMock.mockImplementation(function () {
      return {};
    });
  });

  it("creates sdk client with tenant auth", () => {
    const client = createSigilClient(
      makeConfig({ auth: { mode: "tenant", tenantId: "t-1" } }),
    );

    expect(client).toEqual({});
    expect(SigilClientMock).toHaveBeenCalledTimes(1);
    expect(SigilClientMock).toHaveBeenCalledWith({
      generationExport: {
        protocol: "http",
        endpoint: "http://localhost:8080/api/v1/generations:export",
        auth: { mode: "tenant", tenantId: "t-1" },
      },
    });
  });

  it("maps basic auth to sdk format with tenantId", () => {
    createSigilClient(
      makeConfig({
        auth: {
          mode: "basic",
          user: "12345",
          password: "pass",
          tenantId: "12345",
        },
      }),
    );

    expect(SigilClientMock).toHaveBeenCalledWith({
      generationExport: {
        protocol: "http",
        endpoint: "http://localhost:8080/api/v1/generations:export",
        auth: {
          mode: "basic",
          basicUser: "12345",
          basicPassword: "pass",
          tenantId: "12345",
        },
      },
    });
  });

  it("returns null when sdk constructor throws", () => {
    SigilClientMock.mockImplementationOnce(function () {
      throw new Error("boom");
    });

    const client = createSigilClient(makeConfig());
    expect(client).toBeNull();
  });
});
