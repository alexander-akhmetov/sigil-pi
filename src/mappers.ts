import type {
  ContentCaptureMode,
  GenerationResult,
  GenerationStart,
  Message,
  ToolDefinition,
} from "@grafana/sigil-sdk-js";
import type { Redactor } from "./redact.js";

/**
 * Pi's AssistantMessage shape from @mariozechner/pi-ai.
 * Declared here to avoid hard import (pi types are external at runtime).
 */
export interface PiAssistantMessage {
  role: "assistant";
  content: PiContentBlock[];
  provider: string;
  model: string;
  responseId?: string;
  usage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
    cost: {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
      total: number;
    };
  };
  stopReason: string;
  errorMessage?: string;
  timestamp: number;
}

export type PiContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; redacted?: boolean }
  | {
      type: "toolCall";
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    };

export interface PiToolResult {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: Array<{ type: string; text?: string }>;
  details?: unknown;
  isError: boolean;
  timestamp: number;
}

export interface ToolTiming {
  toolCallId: string;
  toolName: string;
  startedAt: number;
  completedAt: number;
  isError: boolean;
}

/** Build the GenerationStart seed from an assistant message and context. */
export function mapGenerationStart(
  msg: PiAssistantMessage,
  conversationId: string | undefined,
  agentName: string,
  agentVersion: string | undefined,
  turnStartTime: number,
  tools: ToolDefinition[] | undefined,
): GenerationStart {
  return {
    conversationId,
    agentName,
    agentVersion,
    model: { provider: msg.provider, name: msg.model },
    startedAt: new Date(turnStartTime),
    ...(tools && tools.length > 0 ? { tools } : {}),
  };
}

/** Build the GenerationResult from an assistant message. */
export function mapGenerationResult(
  msg: PiAssistantMessage,
  toolResults: PiToolResult[],
  toolTimings: ToolTiming[],
  contentCapture: ContentCaptureMode,
  redactor: Redactor | undefined,
): GenerationResult {
  const result: GenerationResult = {
    responseId: msg.responseId,
    responseModel: msg.model,
    usage: {
      inputTokens: msg.usage.input,
      outputTokens: msg.usage.output,
      totalTokens: msg.usage.input + msg.usage.output,
      cacheReadInputTokens: msg.usage.cacheRead,
      cacheCreationInputTokens: msg.usage.cacheWrite,
      cacheWriteInputTokens: msg.usage.cacheWrite,
    },
    stopReason: mapStopReason(msg.stopReason),
    completedAt: new Date(msg.timestamp),
    metadata: {
      cost_usd: msg.usage.cost.total,
    },
  };

  const output: Message[] = [];

  if (contentCapture !== "metadata_only" && redactor) {
    output.push(
      ...mapAssistantOutput(msg, redactor),
      ...mapToolResultsOutput(toolResults, redactor),
    );
  }

  if (output.length > 0) {
    result.output = output;
  }

  return result;
}

/** Map tool names used in this turn to ToolDefinition[]. */
export function mapToolNames(toolTimings: ToolTiming[]): ToolDefinition[] {
  const seen = new Set<string>();
  const defs: ToolDefinition[] = [];
  for (const t of toolTimings) {
    if (!seen.has(t.toolName)) {
      seen.add(t.toolName);
      defs.push({ name: t.toolName });
    }
  }
  return defs;
}

/** Map assistant message content blocks to Sigil output messages (with redaction). */
function mapAssistantOutput(
  msg: PiAssistantMessage,
  redactor: Redactor,
): Message[] {
  const messages: Message[] = [];

  for (const block of msg.content) {
    switch (block.type) {
      case "text": {
        const text = redactor.redactLightweight(block.text);
        if (text.trim().length > 0) {
          messages.push({ role: "assistant", parts: [{ type: "text", text }] });
        }
        break;
      }
      case "thinking": {
        if (block.redacted) break;
        const thinking = redactor.redactLightweight(block.thinking);
        if (thinking.trim().length > 0) {
          messages.push({
            role: "assistant",
            parts: [{ type: "thinking", thinking }],
          });
        }
        break;
      }
      case "toolCall": {
        messages.push({
          role: "assistant",
          parts: [
            {
              type: "tool_call",
              toolCall: {
                id: block.id,
                name: block.name,
                inputJSON: redactor.redact(JSON.stringify(block.arguments)),
              },
            },
          ],
        });
        break;
      }
    }
  }

  return messages;
}

/** Map pi tool results to Sigil tool result messages (with redaction). */
function mapToolResultsOutput(
  toolResults: PiToolResult[],
  redactor: Redactor,
): Message[] {
  const messages: Message[] = [];

  for (const tr of toolResults) {
    const textParts = tr.content
      .filter(
        (c): c is { type: "text"; text: string } =>
          c.type === "text" && !!c.text,
      )
      .map((c) => c.text);
    const content = textParts.join("\n");

    messages.push({
      role: "tool",
      parts: [
        {
          type: "tool_result",
          toolResult: {
            toolCallId: tr.toolCallId,
            name: tr.toolName,
            content: redactor.redact(content),
            isError: tr.isError,
          },
        },
      ],
    });
  }

  return messages;
}

function mapStopReason(reason: string): string {
  switch (reason) {
    case "stop":
      return "end_turn";
    case "length":
      return "max_tokens";
    case "toolUse":
      return "tool_use";
    case "error":
      return "error";
    case "aborted":
      return "aborted";
    default:
      return reason;
  }
}
