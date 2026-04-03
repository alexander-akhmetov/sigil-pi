import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadConfigMock, createSigilClientMock } = vi.hoisted(() => ({
  loadConfigMock: vi.fn(),
  createSigilClientMock: vi.fn(),
}));

vi.mock("./config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./config.js")>();
  return {
    ...actual,
    loadConfig: loadConfigMock,
  };
});

vi.mock("./client.js", () => ({
  createSigilClient: createSigilClientMock,
}));

import registerExtension from "./index.js";

interface RecorderLike {
  setResult: (value: unknown) => void;
  setCallError: (error: Error) => void;
}

interface SigilLike {
  startGeneration: (
    seed: unknown,
    run: (recorder: RecorderLike) => Promise<void>,
  ) => Promise<void>;
  shutdown: () => Promise<void>;
}

class FakePi {
  handlers = new Map<string, (event: any, ctx: any) => Promise<void> | void>();

  on(event: string, handler: (event: any, ctx: any) => Promise<void> | void) {
    this.handlers.set(event, handler);
  }

  async emit(event: string, payload: any = {}, ctx: any = defaultCtx) {
    const handler = this.handlers.get(event);
    if (!handler) return;
    await handler(payload, ctx);
  }
}

const defaultCtx = {
  sessionManager: {
    getSessionFile: () => "session-1",
  },
};

function assistantMessage() {
  return {
    role: "assistant",
    content: [{ type: "text", text: "hello" }],
    provider: "anthropic",
    model: "claude-sonnet-4",
    usage: {
      input: 10,
      output: 20,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 30,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  };
}

describe("extension lifecycle", () => {
  beforeEach(() => {
    loadConfigMock.mockReset();
    createSigilClientMock.mockReset();
  });

  it("handles the happy path and exports one generation", async () => {
    const recorder = {
      setResult: vi.fn(),
      setCallError: vi.fn(),
    };

    const sigil: SigilLike = {
      startGeneration: vi.fn(async (_seed, run) => {
        await run(recorder);
      }),
      shutdown: vi.fn(async () => {}),
    };

    loadConfigMock.mockResolvedValue({
      enabled: true,
      endpoint: "http://localhost:8080/api/v1/generations:export",
      auth: { mode: "none" },
      agentName: "pi",
      contentCapture: false,
    });
    createSigilClientMock.mockReturnValue(sigil);

    const pi = new FakePi();
    registerExtension(pi as any);

    await pi.emit("session_start");
    await pi.emit("turn_start");
    await pi.emit("tool_execution_start", {
      toolCallId: "c1",
      toolName: "read",
    });
    await pi.emit("tool_execution_end", { toolCallId: "c1", isError: false });
    await pi.emit("turn_end", { message: assistantMessage(), toolResults: [] });

    expect(sigil.startGeneration).toHaveBeenCalledTimes(1);
    expect(recorder.setResult).toHaveBeenCalledTimes(1);
    expect(recorder.setCallError).not.toHaveBeenCalled();
  });

  it("swallows sigil failures instead of throwing", async () => {
    const sigil: SigilLike = {
      startGeneration: vi.fn(async () => {
        throw new Error("transport down");
      }),
      shutdown: vi.fn(async () => {}),
    };

    loadConfigMock.mockResolvedValue({
      enabled: true,
      endpoint: "http://localhost:8080/api/v1/generations:export",
      auth: { mode: "none" },
      agentName: "pi",
      contentCapture: false,
    });
    createSigilClientMock.mockReturnValue(sigil);

    const pi = new FakePi();
    registerExtension(pi as any);

    await pi.emit("session_start");
    await pi.emit("turn_start");

    await expect(
      pi.emit("turn_end", { message: assistantMessage(), toolResults: [] }),
    ).resolves.toBeUndefined();
  });
});
