import { describe, expect, it } from "vitest";
import {
  mapGenerationResult,
  mapGenerationStart,
  mapToolNames,
  type PiAssistantMessage,
  type PiToolResult,
  type ToolTiming,
} from "./mappers.js";
import { Redactor } from "./redact.js";

const redactor = new Redactor();

function makeMsg(overrides?: Partial<PiAssistantMessage>): PiAssistantMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text: "Hello world" }],
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    responseId: "resp-1",
    usage: {
      input: 100,
      output: 50,
      cacheRead: 10,
      cacheWrite: 5,
      totalTokens: 165,
      cost: {
        input: 0.003,
        output: 0.006,
        cacheRead: 0.001,
        cacheWrite: 0.002,
        total: 0.012,
      },
    },
    stopReason: "stop",
    timestamp: 1700000001000,
    ...overrides,
  };
}

function makeToolResult(overrides?: Partial<PiToolResult>): PiToolResult {
  return {
    role: "toolResult",
    toolCallId: "call-1",
    toolName: "bash",
    content: [{ type: "text", text: "output" }],
    isError: false,
    timestamp: 1700000002000,
    ...overrides,
  };
}

function makeTiming(overrides?: Partial<ToolTiming>): ToolTiming {
  return {
    toolCallId: "call-1",
    toolName: "bash",
    startedAt: 1700000000500,
    completedAt: 1700000001500,
    isError: false,
    ...overrides,
  };
}

describe("mapGenerationStart", () => {
  it("maps model, conversation, agent info", () => {
    const msg = makeMsg();
    const start = mapGenerationStart(
      msg,
      "session-abc",
      "pi",
      "1.0.0",
      1700000000000,
      undefined,
    );
    expect(start.model).toEqual({
      provider: "anthropic",
      name: "claude-sonnet-4-20250514",
    });
    expect(start.conversationId).toBe("session-abc");
    expect(start.agentName).toBe("pi");
    expect(start.agentVersion).toBe("1.0.0");
    expect(start.startedAt).toEqual(new Date(1700000000000));
  });

  it("includes tools whenever provided", () => {
    const msg = makeMsg();
    const tools = [{ name: "bash" }, { name: "read" }];

    const result = mapGenerationStart(msg, "s", "pi", undefined, 0, tools);
    expect(result.tools).toEqual(tools);
  });
});

describe("mapGenerationResult", () => {
  it("maps usage and metadata (no content)", () => {
    const msg = makeMsg();
    const result = mapGenerationResult(msg, [], [], "metadata_only", undefined);

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cacheReadInputTokens: 10,
      cacheCreationInputTokens: 5,
      cacheWriteInputTokens: 5,
    });
    expect(result.responseModel).toBe("claude-sonnet-4-20250514");
    expect(result.stopReason).toBe("end_turn");
    expect(result.completedAt).toEqual(new Date(1700000001000));
    expect(result.metadata?.cost_usd).toBe(0.012);
  });

  it("metadata_only produces no output even with timings", () => {
    const timings = [
      makeTiming({
        toolCallId: "c1",
        toolName: "bash",
        startedAt: 1000,
        completedAt: 2500,
      }),
      makeTiming({
        toolCallId: "c2",
        toolName: "read",
        startedAt: 2500,
        completedAt: 3000,
        isError: true,
      }),
    ];
    const result = mapGenerationResult(
      makeMsg(),
      [],
      timings,
      "metadata_only",
      undefined,
    );

    expect(result.output).toBeUndefined();
  });

  it("no_tool_content builds full content like full mode", () => {
    const msg = makeMsg({
      content: [
        { type: "text", text: "I'll run that command" },
        {
          type: "toolCall",
          id: "c1",
          name: "bash",
          arguments: { command: "ls" },
        },
      ],
    });
    const toolResults = [
      makeToolResult({
        toolCallId: "c1",
        content: [{ type: "text", text: "file.txt" }],
      }),
    ];
    const result = mapGenerationResult(
      msg,
      toolResults,
      [],
      "no_tool_content",
      redactor,
    );

    expect(result.output).toHaveLength(3);
    const roles = result.output?.map((m) => m.role);
    expect(roles).toContain("assistant");
    expect(roles).toContain("tool");
  });

  it("contentCapture emits real content without synthetic timing messages", () => {
    const msg = makeMsg({
      content: [
        { type: "text", text: "I'll run that command" },
        {
          type: "toolCall",
          id: "c1",
          name: "bash",
          arguments: { command: "ls" },
        },
      ],
    });
    const toolResults = [
      makeToolResult({
        toolCallId: "c1",
        content: [{ type: "text", text: "file.txt" }],
      }),
    ];
    const timings = [
      makeTiming({
        toolCallId: "c1",
        toolName: "bash",
        startedAt: 100,
        completedAt: 250,
      }),
    ];
    const result = mapGenerationResult(
      msg,
      toolResults,
      timings,
      "full",
      redactor,
    );

    // Real content: text message + tool_call message + tool_result message = 3
    expect(result.output).toHaveLength(3);
    const roles = result.output?.map((m) => m.role);
    expect(roles).toContain("assistant");
    expect(roles).toContain("tool");

    // No synthetic timing messages (which would contain duration strings like "150ms")
    const allContent = JSON.stringify(result.output);
    expect(allContent).not.toContain("150ms");
  });

  it("redacts secrets in content capture mode", () => {
    const secret = "glc_abcdefghijklmnopqrstuvwxyz1234";
    const msg = makeMsg({
      content: [{ type: "text", text: `Token: ${secret}` }],
    });
    const result = mapGenerationResult(msg, [], [], "full", redactor);
    const text = (result.output?.[0]?.parts?.[0] as any).text;
    expect(text).not.toContain(secret);
    expect(text).toContain("[REDACTED:");
  });

  it("skips redacted thinking blocks", () => {
    const msg = makeMsg({
      content: [
        { type: "thinking", thinking: "encrypted-blob", redacted: true },
        { type: "text", text: "result" },
      ],
    });
    const result = mapGenerationResult(msg, [], [], "full", redactor);
    const allText = result.output
      ?.map(
        (m) =>
          m.parts
            ?.map((p) => {
              if (p.type === "text") return (p as any).text;
              if (p.type === "thinking") return (p as any).thinking;
              return "";
            })
            .join("") ?? "",
      )
      .join("");
    expect(allText).not.toContain("encrypted-blob");
    expect(allText).toContain("result");
  });

  it("maps stop reasons", () => {
    expect(
      mapGenerationResult(
        makeMsg({ stopReason: "stop" }),
        [],
        [],
        "metadata_only",
        undefined,
      ).stopReason,
    ).toBe("end_turn");
    expect(
      mapGenerationResult(
        makeMsg({ stopReason: "length" }),
        [],
        [],
        "metadata_only",
        undefined,
      ).stopReason,
    ).toBe("max_tokens");
    expect(
      mapGenerationResult(
        makeMsg({ stopReason: "toolUse" }),
        [],
        [],
        "metadata_only",
        undefined,
      ).stopReason,
    ).toBe("tool_use");
    expect(
      mapGenerationResult(
        makeMsg({ stopReason: "error" }),
        [],
        [],
        "metadata_only",
        undefined,
      ).stopReason,
    ).toBe("error");
  });
});

describe("mapToolNames", () => {
  it("deduplicates tool names", () => {
    const timings = [
      makeTiming({ toolName: "bash" }),
      makeTiming({ toolName: "read" }),
      makeTiming({ toolName: "bash" }),
    ];
    const defs = mapToolNames(timings);
    expect(defs).toEqual([{ name: "bash" }, { name: "read" }]);
  });

  it("returns empty for no timings", () => {
    expect(mapToolNames([])).toEqual([]);
  });
});
