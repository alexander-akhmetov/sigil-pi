import { createRequire } from "node:module";
import { basename } from "node:path";
import type { SigilClient } from "@grafana/sigil-sdk-js";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createSigilClient } from "./client.js";
import type { SigilPiConfig } from "./config.js";
import { loadConfig } from "./config.js";
import {
  mapGenerationResult,
  mapGenerationStart,
  mapToolNames,
  type PiAssistantMessage,
  type PiToolResult,
  type ToolTiming,
} from "./mappers.js";
import { Redactor } from "./redact.js";
import {
  createTelemetryProviders,
  type TelemetryProviders,
} from "./telemetry.js";

function detectPiVersion(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@mariozechner/pi-coding-agent/package.json") as {
      version?: string;
    };
    return pkg.version;
  } catch {
    return undefined;
  }
}

export default function (pi: ExtensionAPI) {
  let sigil: SigilClient | null = null;
  let config: SigilPiConfig | null = null;
  let redactor: Redactor | null = null;
  let telemetry: TelemetryProviders | null = null;

  let turnStartTime = 0;
  let conversationId: string | undefined;

  // Tool execution timing: toolCallId → start timestamp
  const toolStarts = new Map<string, { toolName: string; startedAt: number }>();
  const turnToolTimings: ToolTiming[] = [];

  function resetTurnState() {
    turnStartTime = 0;
    toolStarts.clear();
    turnToolTimings.length = 0;
  }

  async function resetSessionState() {
    config = null;
    redactor = null;
    conversationId = undefined;
    if (telemetry) {
      try {
        await telemetry.shutdown();
      } catch (err) {
        console.warn("[sigil-pi] telemetry shutdown failed:", err);
      }
      telemetry = null;
    }
    resetTurnState();
  }

  pi.on("session_start", async (_event, ctx) => {
    try {
      if (sigil) {
        try {
          await sigil.shutdown();
        } catch (err) {
          console.warn("[sigil-pi] stale client shutdown failed:", err);
        }
      }

      sigil = null;
      await resetSessionState();

      config = await loadConfig();
      if (!config.agentVersion) {
        config = { ...config, agentVersion: detectPiVersion() };
      }
      const sessionFile = ctx.sessionManager.getSessionFile();
      conversationId = sessionFile ? basename(sessionFile) : undefined;

      if (!config.enabled) return;

      // Set up OTel providers if OTLP is configured
      if (config.otlp) {
        try {
          telemetry = createTelemetryProviders(config.otlp);
        } catch (err) {
          console.warn("[sigil-pi] failed to create OTel providers:", err);
        }
      }

      sigil = createSigilClient(config, {
        tracer: telemetry?.tracer,
        meter: telemetry?.meter,
      });
      if (!sigil) {
        config = null;
        return;
      }

      if (config.contentCapture) {
        redactor = new Redactor();
      }
    } catch (err) {
      console.warn("[sigil-pi] session_start failed:", err);
      sigil = null;
      await resetSessionState();
    }
  });

  pi.on("turn_start", async (_event, _ctx) => {
    resetTurnState();
    if (!sigil) return;
    turnStartTime = Date.now();
  });

  pi.on("tool_execution_start", async (event, _ctx) => {
    if (!sigil) return;

    try {
      toolStarts.set(event.toolCallId, {
        toolName: event.toolName,
        startedAt: Date.now(),
      });
    } catch (err) {
      console.warn("[sigil-pi] tool_execution_start failed:", err);
    }
  });

  pi.on("tool_execution_end", async (event, _ctx) => {
    if (!sigil) return;

    try {
      const start = toolStarts.get(event.toolCallId);
      if (!start) return;
      toolStarts.delete(event.toolCallId);

      turnToolTimings.push({
        toolCallId: event.toolCallId,
        toolName: start.toolName,
        startedAt: start.startedAt,
        completedAt: Date.now(),
        isError: event.isError,
      });
    } catch (err) {
      console.warn("[sigil-pi] tool_execution_end failed:", err);
    }
  });

  pi.on("turn_end", async (event, _ctx) => {
    if (!sigil || !config) return;

    try {
      if (!isAssistantMessage(event.message)) return;

      const msg = event.message;
      const contentCapture = config.contentCapture;
      const toolDefs = mapToolNames(turnToolTimings);

      const seed = mapGenerationStart(
        msg,
        conversationId,
        config.agentName,
        config.agentVersion,
        turnStartTime || msg.timestamp,
        toolDefs.length > 0 ? toolDefs : undefined,
      );

      const toolResults = (event.toolResults ?? []) as PiToolResult[];
      const result = mapGenerationResult(
        msg,
        toolResults,
        turnToolTimings,
        contentCapture,
        redactor ?? undefined,
      );

      await sigil.startGeneration(seed, async (recorder) => {
        recorder.setResult(result);
        if (msg.errorMessage) {
          recorder.setCallError(new Error(msg.errorMessage));
        }
      });
    } catch (err) {
      console.warn("[sigil-pi] turn_end failed:", err);
    } finally {
      toolStarts.clear();
      turnToolTimings.length = 0;
    }
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    if (sigil) {
      try {
        await sigil.shutdown();
      } catch (err) {
        console.warn("[sigil-pi] session shutdown failed:", err);
      }
    }

    sigil = null;
    await resetSessionState();
  });
}

function isAssistantMessage(message: unknown): message is PiAssistantMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<PiAssistantMessage>;

  return (
    candidate.role === "assistant" &&
    typeof candidate.provider === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.timestamp === "number" &&
    !!candidate.usage &&
    Array.isArray(candidate.content) &&
    typeof candidate.stopReason === "string"
  );
}
