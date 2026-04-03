var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../sigil-sdk/js/dist/config.js
var tenantHeaderName = "X-Scope-OrgID";
var authorizationHeaderName = "Authorization";
var defaultExportAuthConfig = {
  mode: "none"
};
var defaultGenerationExportConfig = {
  protocol: "http",
  endpoint: "http://localhost:8080/api/v1/generations:export",
  auth: defaultExportAuthConfig,
  insecure: true,
  batchSize: 100,
  flushIntervalMs: 1e3,
  queueSize: 2e3,
  maxRetries: 5,
  initialBackoffMs: 100,
  maxBackoffMs: 5e3,
  payloadMaxBytes: 4 << 20
};
var defaultAPIConfig = {
  endpoint: "http://localhost:8080"
};
var defaultEmbeddingCaptureConfig = {
  captureInput: false,
  maxInputItems: 20,
  maxTextLength: 1024
};
var defaultLogger = {
  debug(message, ...args) {
    console.debug(message, ...args);
  },
  warn(message, ...args) {
    console.warn(message, ...args);
  },
  error(message, ...args) {
    console.error(message, ...args);
  }
};
function defaultConfig() {
  return {
    generationExport: cloneGenerationExportConfig(defaultGenerationExportConfig),
    api: cloneAPIConfig(defaultAPIConfig),
    embeddingCapture: cloneEmbeddingCaptureConfig(defaultEmbeddingCaptureConfig)
  };
}
function mergeConfig(config) {
  return {
    generationExport: mergeGenerationExportConfig(config.generationExport),
    api: mergeAPIConfig(config.api),
    embeddingCapture: mergeEmbeddingCaptureConfig(config.embeddingCapture),
    generationExporter: config.generationExporter,
    tracer: config.tracer,
    meter: config.meter,
    logger: config.logger,
    now: config.now,
    sleep: config.sleep
  };
}
function mergeGenerationExportConfig(config) {
  const auth = mergeAuthConfig(config?.auth);
  const headers = config?.headers !== void 0 ? { ...config.headers } : void 0;
  const merged = {
    ...defaultGenerationExportConfig,
    ...config,
    auth,
    headers
  };
  merged.headers = resolveHeadersWithAuth(merged.headers, merged.auth, "generation export");
  return merged;
}
function mergeAPIConfig(config) {
  return {
    ...defaultAPIConfig,
    ...config
  };
}
function mergeEmbeddingCaptureConfig(config) {
  return {
    ...defaultEmbeddingCaptureConfig,
    ...config
  };
}
function mergeAuthConfig(config) {
  return {
    ...defaultExportAuthConfig,
    ...config
  };
}
function resolveHeadersWithAuth(headers, auth, label) {
  const mode = (auth.mode ?? "none").trim().toLowerCase();
  const tenantId = auth.tenantId?.trim() ?? "";
  const bearerToken = auth.bearerToken?.trim() ?? "";
  const out = headers ? { ...headers } : void 0;
  if (mode === "none") {
    const basicUser = auth.basicUser?.trim() ?? "";
    const basicPassword = auth.basicPassword?.trim() ?? "";
    if (tenantId.length > 0 || bearerToken.length > 0 || basicUser.length > 0 || basicPassword.length > 0) {
      throw new Error(`${label} auth mode "none" does not allow credentials`);
    }
    return out;
  }
  if (mode === "tenant") {
    if (tenantId.length === 0) {
      throw new Error(`${label} auth mode "tenant" requires tenantId`);
    }
    if (bearerToken.length > 0) {
      throw new Error(`${label} auth mode "tenant" does not allow bearerToken`);
    }
    if (hasHeaderKey(out, tenantHeaderName)) {
      return out;
    }
    return {
      ...out ?? {},
      [tenantHeaderName]: tenantId
    };
  }
  if (mode === "bearer") {
    if (bearerToken.length === 0) {
      throw new Error(`${label} auth mode "bearer" requires bearerToken`);
    }
    if (tenantId.length > 0) {
      throw new Error(`${label} auth mode "bearer" does not allow tenantId`);
    }
    if (hasHeaderKey(out, authorizationHeaderName)) {
      return out;
    }
    return {
      ...out ?? {},
      [authorizationHeaderName]: formatBearerTokenValue(bearerToken)
    };
  }
  if (mode === "basic") {
    const password = auth.basicPassword?.trim() ?? "";
    if (password.length === 0) {
      throw new Error(`${label} auth mode "basic" requires basicPassword`);
    }
    let user = auth.basicUser?.trim() ?? "";
    if (user.length === 0) {
      user = tenantId;
    }
    if (user.length === 0) {
      throw new Error(`${label} auth mode "basic" requires basicUser or tenantId`);
    }
    const result = { ...out ?? {} };
    if (!hasHeaderKey(result, authorizationHeaderName)) {
      const encoded = new TextEncoder().encode(`${user}:${password}`);
      result[authorizationHeaderName] = "Basic " + btoa(String.fromCharCode(...encoded));
    }
    if (tenantId.length > 0 && !hasHeaderKey(result, tenantHeaderName)) {
      result[tenantHeaderName] = tenantId;
    }
    return result;
  }
  throw new Error(`unsupported ${label} auth mode: ${auth.mode}`);
}
function hasHeaderKey(headers, key) {
  if (headers === void 0) {
    return false;
  }
  const target = key.toLowerCase();
  return Object.keys(headers).some((existing) => existing.toLowerCase() === target);
}
function formatBearerTokenValue(token) {
  const value = token.trim();
  if (value.toLowerCase().startsWith("bearer ")) {
    return `Bearer ${value.slice(7).trim()}`;
  }
  return `Bearer ${value}`;
}
function cloneGenerationExportConfig(config) {
  return {
    ...config,
    auth: { ...config.auth },
    headers: config.headers ? { ...config.headers } : void 0
  };
}
function cloneAPIConfig(config) {
  return {
    ...config
  };
}
function cloneEmbeddingCaptureConfig(config) {
  return {
    ...config
  };
}

// ../sigil-sdk/js/dist/context.js
import { AsyncLocalStorage } from "node:async_hooks";
var storage = new AsyncLocalStorage();
function withConversationId(conversationId, callback) {
  return runWithContext({ conversationId }, callback);
}
function withConversationTitle(conversationTitle, callback) {
  return runWithContext({ conversationTitle }, callback);
}
function withUserId(userId, callback) {
  return runWithContext({ userId }, callback);
}
function withAgentName(agentName, callback) {
  return runWithContext({ agentName }, callback);
}
function withAgentVersion(agentVersion, callback) {
  return runWithContext({ agentVersion }, callback);
}
function conversationIdFromContext() {
  return normalizedString(storage.getStore()?.conversationId);
}
function conversationTitleFromContext() {
  return normalizedString(storage.getStore()?.conversationTitle);
}
function userIdFromContext() {
  return normalizedString(storage.getStore()?.userId);
}
function agentNameFromContext() {
  return normalizedString(storage.getStore()?.agentName);
}
function agentVersionFromContext() {
  return normalizedString(storage.getStore()?.agentVersion);
}
function runWithContext(nextValues, callback) {
  const currentValues = storage.getStore() ?? {};
  const mergedValues = { ...currentValues };
  for (const [key, value] of Object.entries(nextValues)) {
    const normalized = normalizedString(value);
    if (normalized === void 0) {
      delete mergedValues[key];
      continue;
    }
    mergedValues[key] = normalized;
  }
  return storage.run(mergedValues, callback);
}
function normalizedString(value) {
  if (value === void 0) {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}

// ../sigil-sdk/js/dist/exporters/grpc.js
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var defaultProtoPath = join(__dirname, "../../proto/sigil/v1/generation_ingest.proto");
var protoLoadOptions = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: false,
  oneofs: true
};
var GRPCGenerationExporter = class {
  endpoint;
  headers;
  insecure;
  initPromise;
  client;
  constructor(endpoint, headers, insecure = false) {
    const parsed = parseGRPCEndpoint(endpoint);
    this.endpoint = parsed.host;
    this.insecure = insecure || parsed.insecure;
    this.headers = headers ? { ...headers } : {};
  }
  async exportGenerations(request) {
    await this.ensureClient();
    const client = this.client;
    if (client === void 0 || typeof client.ExportGenerations !== "function") {
      throw new Error("grpc exporter client is unavailable");
    }
    const metadata = new grpc.Metadata();
    for (const [key, value] of Object.entries(this.headers)) {
      metadata.set(key, value);
    }
    const grpcRequest = {
      generations: request.generations.map(mapGenerationToProto)
    };
    const response = await new Promise((resolve, reject) => {
      client.ExportGenerations?.(grpcRequest, metadata, (error, result) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
    return parseGRPCExportResponse(response, request);
  }
  async shutdown() {
    if (this.client !== void 0) {
      this.client.close();
      this.client = void 0;
    }
  }
  async ensureClient() {
    if (this.client !== void 0) {
      return;
    }
    if (this.initPromise !== void 0) {
      await this.initPromise;
      return;
    }
    this.initPromise = this.initializeClient();
    await this.initPromise;
    this.initPromise = void 0;
  }
  async initializeClient() {
    const packageDefinition = await protoLoader.load(defaultProtoPath, protoLoadOptions);
    const loaded = grpc.loadPackageDefinition(packageDefinition);
    const clientCtor = loaded.sigil?.v1?.GenerationIngestService;
    if (clientCtor === void 0) {
      throw new Error("failed to load sigil.v1.GenerationIngestService from proto");
    }
    const credentials2 = this.insecure ? grpc.credentials.createInsecure() : grpc.credentials.createSsl();
    this.client = new clientCtor(this.endpoint, credentials2);
  }
};
function parseGRPCEndpoint(endpoint) {
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) {
    throw new Error("generation export endpoint is required");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = new URL(trimmed);
    return {
      host: parsed.host,
      insecure: parsed.protocol === "http:"
    };
  }
  if (trimmed.startsWith("grpc://")) {
    return {
      host: trimmed.slice("grpc://".length),
      insecure: false
    };
  }
  return {
    host: trimmed,
    insecure: false
  };
}
function parseGRPCExportResponse(response, request) {
  if (!isObject(response) || !Array.isArray(response.results)) {
    throw new Error("invalid grpc generation export response payload");
  }
  return {
    results: response.results.map((result, index) => {
      if (!isObject(result)) {
        throw new Error("invalid grpc generation export result payload");
      }
      return {
        generationId: asString(result.generationId) ?? asString(result.generation_id) ?? request.generations[index]?.id ?? "",
        accepted: Boolean(result.accepted),
        error: asString(result.error)
      };
    })
  };
}
function mapGenerationToProto(generation) {
  return {
    id: generation.id,
    conversationId: generation.conversationId,
    operationName: generation.operationName,
    mode: generation.mode === "STREAM" ? "GENERATION_MODE_STREAM" : "GENERATION_MODE_SYNC",
    traceId: generation.traceId,
    spanId: generation.spanId,
    model: {
      provider: generation.model.provider,
      name: generation.model.name
    },
    responseId: generation.responseId,
    responseModel: generation.responseModel,
    systemPrompt: generation.systemPrompt,
    maxTokens: generation.maxTokens === void 0 ? void 0 : toInt64String(generation.maxTokens),
    temperature: generation.temperature,
    topP: generation.topP,
    toolChoice: generation.toolChoice,
    thinkingEnabled: generation.thinkingEnabled,
    input: generation.input?.map(mapMessageToProto),
    output: generation.output?.map(mapMessageToProto),
    tools: generation.tools?.map(mapToolToProto),
    usage: mapUsageToProto(generation.usage),
    stopReason: generation.stopReason,
    startedAt: mapTimestamp(generation.startedAt),
    completedAt: mapTimestamp(generation.completedAt),
    tags: generation.tags ?? {},
    metadata: mapStructToProto(generation.metadata),
    rawArtifacts: generation.artifacts?.map(mapArtifactToProto),
    callError: generation.callError,
    agentName: generation.agentName,
    agentVersion: generation.agentVersion
  };
}
function mapMessageToProto(message) {
  const parts = message.parts?.map(mapMessagePartToProto) ?? [];
  if (parts.length === 0 && typeof message.content === "string") {
    parts.push({
      text: message.content
    });
  }
  return {
    role: toMessageRoleEnum(message.role),
    name: message.name ?? "",
    parts
  };
}
function mapMessagePartToProto(part) {
  switch (part.type) {
    case "text":
      return withPartMetadata({
        text: part.text
      }, part.metadata?.providerType);
    case "thinking":
      return withPartMetadata({
        thinking: part.thinking
      }, part.metadata?.providerType);
    case "tool_call":
      return withPartMetadata({
        toolCall: {
          id: part.toolCall.id ?? "",
          name: part.toolCall.name,
          inputJson: toBytePayload(part.toolCall.inputJSON)
        }
      }, part.metadata?.providerType);
    case "tool_result":
      return withPartMetadata({
        toolResult: {
          toolCallId: part.toolResult.toolCallId ?? "",
          name: part.toolResult.name ?? "",
          content: part.toolResult.content ?? "",
          contentJson: toBytePayload(part.toolResult.contentJSON),
          isError: part.toolResult.isError ?? false
        }
      }, part.metadata?.providerType);
  }
}
function mapToolToProto(tool) {
  return {
    name: tool.name,
    description: tool.description ?? "",
    type: tool.type ?? "",
    inputSchemaJson: toBytePayload(tool.inputSchemaJSON)
  };
}
function mapUsageToProto(usage) {
  if (usage === void 0) {
    return void 0;
  }
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
  return {
    inputTokens: toInt64String(inputTokens),
    outputTokens: toInt64String(outputTokens),
    totalTokens: toInt64String(totalTokens),
    cacheReadInputTokens: toInt64String(usage.cacheReadInputTokens),
    cacheWriteInputTokens: toInt64String(usage.cacheWriteInputTokens),
    reasoningTokens: toInt64String(usage.reasoningTokens)
  };
}
function mapArtifactToProto(artifact) {
  return {
    kind: toArtifactKindEnum(artifact.type),
    name: artifact.name ?? artifact.type,
    contentType: artifact.mimeType ?? "application/json",
    payload: toBytePayload(artifact.payload),
    recordId: artifact.recordId ?? "",
    uri: artifact.uri ?? ""
  };
}
function withPartMetadata(part, providerType) {
  if (providerType === void 0 || providerType.trim().length === 0) {
    return part;
  }
  return {
    ...part,
    metadata: {
      providerType
    }
  };
}
function toBytePayload(value) {
  if (value === void 0 || value.length === 0) {
    return Buffer.from([]);
  }
  return Buffer.from(value, "utf8");
}
function mapStructToProto(metadata) {
  if (metadata === void 0) {
    return void 0;
  }
  const normalized = normalizeMetadata(metadata);
  if (Object.keys(normalized).length === 0) {
    return void 0;
  }
  return {
    fields: mapStructFields(normalized)
  };
}
function normalizeMetadata(metadata) {
  try {
    const encoded = JSON.stringify(metadata, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
    if (encoded === void 0) {
      return {};
    }
    const decoded = JSON.parse(encoded);
    if (!isObject(decoded)) {
      return {};
    }
    return decoded;
  } catch {
    return {};
  }
}
function mapStructFields(objectValue) {
  const fields = {};
  for (const [key, value] of Object.entries(objectValue)) {
    const mappedValue = mapStructValue(value);
    if (mappedValue !== void 0) {
      fields[key] = mappedValue;
    }
  }
  return fields;
}
function mapStructValue(value) {
  if (value === null) {
    return { nullValue: "NULL_VALUE" };
  }
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "number":
      return Number.isFinite(value) ? { numberValue: value } : { stringValue: String(value) };
    case "boolean":
      return { boolValue: value };
    case "object":
      if (Array.isArray(value)) {
        const values = value.map((entry) => mapStructValue(entry)).filter((entry) => entry !== void 0);
        return { listValue: { values } };
      }
      if (isObject(value)) {
        return { structValue: { fields: mapStructFields(value) } };
      }
      return { nullValue: "NULL_VALUE" };
    default:
      return void 0;
  }
}
function mapTimestamp(date) {
  const milliseconds = date.getTime();
  const seconds = Math.floor(milliseconds / 1e3);
  const nanos = (milliseconds - seconds * 1e3) * 1e6;
  return {
    seconds: seconds.toString(),
    nanos
  };
}
function toInt64String(value) {
  if (value === void 0 || Number.isNaN(value) || !Number.isFinite(value)) {
    return "0";
  }
  return Math.trunc(value).toString();
}
function toMessageRoleEnum(role) {
  const normalized = role.trim().toLowerCase();
  switch (normalized) {
    case "assistant":
      return "MESSAGE_ROLE_ASSISTANT";
    case "tool":
      return "MESSAGE_ROLE_TOOL";
    case "user":
    default:
      return "MESSAGE_ROLE_USER";
  }
}
function toArtifactKindEnum(kind) {
  const normalized = kind.trim().toLowerCase();
  switch (normalized) {
    case "request":
      return "ARTIFACT_KIND_REQUEST";
    case "response":
      return "ARTIFACT_KIND_RESPONSE";
    case "tools":
      return "ARTIFACT_KIND_TOOLS";
    case "provider_event":
      return "ARTIFACT_KIND_PROVIDER_EVENT";
    default:
      return "ARTIFACT_KIND_UNSPECIFIED";
  }
}
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}

// ../sigil-sdk/js/dist/utils.js
var textEncoder = new TextEncoder();
function encodedSizeBytes(value) {
  return textEncoder.encode(JSON.stringify(value)).byteLength;
}
function defaultOperationNameForMode(mode) {
  return mode === "STREAM" ? "streamText" : "generateText";
}
function validateGeneration(generation) {
  if (generation.id.trim().length === 0) {
    return new Error("generation id is required");
  }
  if (generation.mode !== "SYNC" && generation.mode !== "STREAM") {
    return new Error("generation.mode must be one of SYNC|STREAM");
  }
  if (generation.model.provider.trim().length === 0) {
    return new Error("generation model provider is required");
  }
  if (generation.model.name.trim().length === 0) {
    return new Error("generation model name is required");
  }
  for (let index = 0; index < (generation.input ?? []).length; index++) {
    const error = validateMessage("generation.input", index, generation.input?.[index]);
    if (error !== void 0) {
      return error;
    }
  }
  for (let index = 0; index < (generation.output ?? []).length; index++) {
    const error = validateMessage("generation.output", index, generation.output?.[index]);
    if (error !== void 0) {
      return error;
    }
  }
  for (let index = 0; index < (generation.tools ?? []).length; index++) {
    const tool = generation.tools?.[index];
    if (tool === void 0 || tool.name.trim().length === 0) {
      return new Error(`generation.tools[${index}].name is required`);
    }
  }
  for (let index = 0; index < (generation.artifacts ?? []).length; index++) {
    const error = validateArtifact(index, generation.artifacts?.[index]);
    if (error !== void 0) {
      return error;
    }
  }
  if (generation.completedAt.getTime() < generation.startedAt.getTime()) {
    return new Error("generation completedAt must not be earlier than startedAt");
  }
  return void 0;
}
function validateToolExecution(toolExecution) {
  if (toolExecution.toolName.trim().length === 0) {
    return new Error("tool execution name is required");
  }
  if (toolExecution.completedAt.getTime() < toolExecution.startedAt.getTime()) {
    return new Error("tool execution completedAt must not be earlier than startedAt");
  }
  return void 0;
}
function validateEmbeddingStart(start) {
  if (start.model.provider.trim().length === 0) {
    return new Error("embedding.model.provider is required");
  }
  if (start.model.name.trim().length === 0) {
    return new Error("embedding.model.name is required");
  }
  if (start.dimensions !== void 0 && start.dimensions <= 0) {
    return new Error("embedding.dimensions must be > 0");
  }
  if (start.encodingFormat !== void 0 && start.encodingFormat.trim().length === 0) {
    return new Error("embedding.encoding_format must not be blank");
  }
  return void 0;
}
function validateEmbeddingResult(result) {
  if (result.inputCount < 0) {
    return new Error("embedding.input_count must be >= 0");
  }
  if (result.inputTokens !== void 0 && result.inputTokens < 0) {
    return new Error("embedding.input_tokens must be >= 0");
  }
  if (result.dimensions !== void 0 && result.dimensions <= 0) {
    return new Error("embedding.dimensions must be > 0");
  }
  return void 0;
}
function asError(value) {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function maybeUnref(timer) {
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    const maybeTimer = timer;
    maybeTimer.unref?.();
  }
}
function defaultSleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
function cloneGeneration(generation) {
  return {
    ...generation,
    model: cloneModelRef(generation.model),
    input: generation.input?.map(cloneMessage),
    output: generation.output?.map(cloneMessage),
    tools: generation.tools?.map(cloneToolDefinition),
    usage: generation.usage ? { ...generation.usage } : void 0,
    startedAt: new Date(generation.startedAt),
    completedAt: new Date(generation.completedAt),
    tags: generation.tags ? { ...generation.tags } : void 0,
    metadata: generation.metadata ? { ...generation.metadata } : void 0,
    artifacts: generation.artifacts?.map(cloneArtifact)
  };
}
function cloneGenerationResult(result) {
  return {
    ...result,
    input: result.input?.map(cloneMessage),
    output: result.output?.map(cloneMessage),
    tools: result.tools?.map(cloneToolDefinition),
    usage: result.usage ? { ...result.usage } : void 0,
    completedAt: result.completedAt ? new Date(result.completedAt) : void 0,
    tags: result.tags ? { ...result.tags } : void 0,
    metadata: result.metadata ? { ...result.metadata } : void 0,
    artifacts: result.artifacts?.map(cloneArtifact)
  };
}
function cloneGenerationStart(start) {
  return {
    ...start,
    model: cloneModelRef(start.model),
    tools: start.tools?.map(cloneToolDefinition),
    tags: start.tags ? { ...start.tags } : void 0,
    metadata: start.metadata ? { ...start.metadata } : void 0,
    startedAt: start.startedAt ? new Date(start.startedAt) : void 0
  };
}
function cloneEmbeddingStart(start) {
  return {
    ...start,
    model: cloneModelRef(start.model),
    tags: start.tags ? { ...start.tags } : void 0,
    metadata: start.metadata ? { ...start.metadata } : void 0,
    startedAt: start.startedAt ? new Date(start.startedAt) : void 0
  };
}
function cloneEmbeddingResult(result) {
  return {
    ...result,
    inputTexts: result.inputTexts ? [...result.inputTexts] : void 0
  };
}
function cloneToolExecution(toolExecution) {
  return {
    ...toolExecution,
    startedAt: new Date(toolExecution.startedAt),
    completedAt: new Date(toolExecution.completedAt)
  };
}
function cloneToolExecutionStart(start) {
  return {
    ...start,
    startedAt: start.startedAt ? new Date(start.startedAt) : void 0
  };
}
function cloneToolExecutionResult(result) {
  return {
    ...result,
    completedAt: result.completedAt ? new Date(result.completedAt) : void 0
  };
}
function cloneModelRef(model) {
  return { ...model };
}
function cloneMessage(message) {
  return {
    ...message,
    parts: message.parts?.map(cloneMessagePart)
  };
}
function cloneToolDefinition(tool) {
  return { ...tool };
}
function cloneArtifact(artifact) {
  return { ...artifact };
}
function newLocalID(prefix) {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${now}-${rand}`;
}
function cloneMessagePart(part) {
  switch (part.type) {
    case "text":
      return {
        type: "text",
        text: part.text,
        metadata: part.metadata ? { ...part.metadata } : void 0
      };
    case "thinking":
      return {
        type: "thinking",
        thinking: part.thinking,
        metadata: part.metadata ? { ...part.metadata } : void 0
      };
    case "tool_call":
      return {
        type: "tool_call",
        toolCall: { ...part.toolCall },
        metadata: part.metadata ? { ...part.metadata } : void 0
      };
    case "tool_result":
      return {
        type: "tool_result",
        toolResult: { ...part.toolResult },
        metadata: part.metadata ? { ...part.metadata } : void 0
      };
  }
}
function validateMessage(path, index, message) {
  if (message === void 0) {
    return new Error(`${path}[${index}] is required`);
  }
  const role = normalizeRole(message.role);
  if (role !== "user" && role !== "assistant" && role !== "tool") {
    return new Error(`${path}[${index}].role must be one of user|assistant|tool`);
  }
  const hasContent = typeof message.content === "string" && message.content.trim().length > 0;
  const parts = message.parts ?? [];
  if (parts.length === 0 && !hasContent) {
    return new Error(`${path}[${index}].parts must not be empty`);
  }
  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex];
    if (part === void 0) {
      return new Error(`${path}[${index}].parts[${partIndex}] is required`);
    }
    const error = validatePart(path, index, partIndex, role, part);
    if (error !== void 0) {
      return error;
    }
  }
  return void 0;
}
function validatePart(path, messageIndex, partIndex, role, part) {
  const payloadFieldCount = payloadFieldsCount(part);
  if (payloadFieldCount !== 1) {
    return new Error(`${path}[${messageIndex}].parts[${partIndex}] must set exactly one payload field`);
  }
  switch (part.type) {
    case "text":
      if (part.text.trim().length === 0) {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].text is required`);
      }
      return void 0;
    case "thinking":
      if (role !== "assistant") {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].thinking only allowed for assistant role`);
      }
      if (part.thinking.trim().length === 0) {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].thinking is required`);
      }
      return void 0;
    case "tool_call":
      if (role !== "assistant") {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].tool_call only allowed for assistant role`);
      }
      if (part.toolCall.name.trim().length === 0) {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].tool_call.name is required`);
      }
      return void 0;
    case "tool_result":
      if (role !== "tool") {
        return new Error(`${path}[${messageIndex}].parts[${partIndex}].tool_result only allowed for tool role`);
      }
      return void 0;
    default:
      return new Error(`${path}[${messageIndex}].parts[${partIndex}].kind is invalid`);
  }
}
function payloadFieldsCount(part) {
  let count = 0;
  if ("text" in part && typeof part.text === "string" && part.text.trim().length > 0) {
    count++;
  }
  if ("thinking" in part && typeof part.thinking === "string" && part.thinking.trim().length > 0) {
    count++;
  }
  if ("toolCall" in part && isRecord(part.toolCall)) {
    count++;
  }
  if ("toolResult" in part && isRecord(part.toolResult)) {
    count++;
  }
  return count;
}
function validateArtifact(index, artifact) {
  if (artifact === void 0) {
    return new Error(`generation.artifacts[${index}] is required`);
  }
  const kind = artifact.type.trim().toLowerCase();
  switch (kind) {
    case "request":
    case "response":
    case "tools":
    case "provider_event":
      break;
    default:
      return new Error(`generation.artifacts[${index}].kind is invalid`);
  }
  const payload = artifact.payload?.trim() ?? "";
  const recordID = artifact.recordId?.trim() ?? "";
  if (payload.length === 0 && recordID.length === 0) {
    return new Error(`generation.artifacts[${index}] must provide payload or record_id`);
  }
  return void 0;
}
function normalizeRole(role) {
  const normalized = role.trim().toLowerCase();
  if (normalized === "user" || normalized === "assistant" || normalized === "tool") {
    return normalized;
  }
  return "";
}

// ../sigil-sdk/js/dist/exporters/http.js
var HTTPGenerationExporter = class {
  endpoint;
  headers;
  constructor(endpoint, headers) {
    this.endpoint = normalizeHTTPGenerationEndpoint(endpoint);
    this.headers = headers ? { ...headers } : {};
  }
  async exportGenerations(request) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({
        generations: request.generations.map(mapGenerationToProtoJSON)
      })
    });
    if (!response.ok) {
      const responseText = (await response.text()).trim();
      throw new Error(`http generation export status ${response.status}: ${responseText}`);
    }
    const payload = await response.json();
    return parseExportGenerationsResponse(payload, request);
  }
};
function parseExportGenerationsResponse(payload, request) {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error("invalid generation export response payload");
  }
  const results = payload.results.map((result, index) => {
    if (!isRecord(result)) {
      throw new Error("invalid generation export result payload");
    }
    const fallbackGenerationID = request.generations[index]?.id ?? "";
    return {
      generationId: typeof result.generationId === "string" ? result.generationId : typeof result.generation_id === "string" ? result.generation_id : fallbackGenerationID,
      accepted: Boolean(result.accepted),
      error: typeof result.error === "string" ? result.error : void 0
    };
  });
  return { results };
}
function normalizeHTTPGenerationEndpoint(endpoint) {
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) {
    throw new Error("generation export endpoint is required");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `http://${trimmed}`;
}
function mapGenerationToProtoJSON(generation) {
  const proto = {
    id: generation.id,
    conversation_id: generation.conversationId ?? "",
    operation_name: generation.operationName,
    mode: generation.mode === "STREAM" ? "GENERATION_MODE_STREAM" : "GENERATION_MODE_SYNC",
    trace_id: generation.traceId ?? "",
    span_id: generation.spanId ?? "",
    model: {
      provider: generation.model.provider,
      name: generation.model.name
    },
    response_id: generation.responseId ?? "",
    response_model: generation.responseModel ?? "",
    system_prompt: generation.systemPrompt ?? "",
    input: (generation.input ?? []).map(mapMessageToProtoJSON),
    output: (generation.output ?? []).map(mapMessageToProtoJSON),
    tools: (generation.tools ?? []).map(mapToolToProtoJSON),
    usage: mapUsageToProtoJSON(generation.usage),
    stop_reason: generation.stopReason ?? "",
    started_at: generation.startedAt.toISOString(),
    completed_at: generation.completedAt.toISOString(),
    tags: generation.tags ?? {},
    metadata: normalizeMetadata2(generation.metadata),
    raw_artifacts: (generation.artifacts ?? []).map(mapArtifactToProtoJSON),
    call_error: generation.callError ?? "",
    agent_name: generation.agentName ?? "",
    agent_version: generation.agentVersion ?? ""
  };
  if (generation.maxTokens !== void 0) {
    proto.max_tokens = toInt64String2(generation.maxTokens);
  }
  if (generation.temperature !== void 0) {
    proto.temperature = generation.temperature;
  }
  if (generation.topP !== void 0) {
    proto.top_p = generation.topP;
  }
  if (generation.toolChoice !== void 0) {
    proto.tool_choice = generation.toolChoice;
  }
  if (generation.thinkingEnabled !== void 0) {
    proto.thinking_enabled = generation.thinkingEnabled;
  }
  return proto;
}
function mapMessageToProtoJSON(message) {
  const parts = (message.parts ?? []).map(mapMessagePartToProtoJSON);
  if (parts.length === 0 && typeof message.content === "string") {
    parts.push({ text: message.content });
  }
  return {
    role: toMessageRoleEnum2(message.role),
    name: message.name ?? "",
    parts
  };
}
function mapMessagePartToProtoJSON(part) {
  switch (part.type) {
    case "text":
      return withPartMetadata2({
        text: part.text
      }, part.metadata?.providerType);
    case "thinking":
      return withPartMetadata2({
        thinking: part.thinking
      }, part.metadata?.providerType);
    case "tool_call":
      return withPartMetadata2({
        tool_call: {
          id: part.toolCall.id ?? "",
          name: part.toolCall.name,
          input_json: toBase64Payload(part.toolCall.inputJSON)
        }
      }, part.metadata?.providerType);
    case "tool_result":
      return withPartMetadata2({
        tool_result: {
          tool_call_id: part.toolResult.toolCallId ?? "",
          name: part.toolResult.name ?? "",
          content: part.toolResult.content ?? "",
          content_json: toBase64Payload(part.toolResult.contentJSON),
          is_error: part.toolResult.isError ?? false
        }
      }, part.metadata?.providerType);
  }
}
function mapToolToProtoJSON(tool) {
  return {
    name: tool.name,
    description: tool.description ?? "",
    type: tool.type ?? "",
    input_schema_json: toBase64Payload(tool.inputSchemaJSON)
  };
}
function mapUsageToProtoJSON(usage) {
  if (usage === void 0) {
    return void 0;
  }
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
  return {
    input_tokens: toInt64String2(inputTokens),
    output_tokens: toInt64String2(outputTokens),
    total_tokens: toInt64String2(totalTokens),
    cache_read_input_tokens: toInt64String2(usage.cacheReadInputTokens),
    cache_write_input_tokens: toInt64String2(usage.cacheWriteInputTokens),
    reasoning_tokens: toInt64String2(usage.reasoningTokens)
  };
}
function mapArtifactToProtoJSON(artifact) {
  return {
    kind: toArtifactKindEnum2(artifact.type),
    name: artifact.name ?? artifact.type,
    content_type: artifact.mimeType ?? "application/json",
    payload: toBase64Payload(artifact.payload),
    record_id: artifact.recordId ?? "",
    uri: artifact.uri ?? ""
  };
}
function withPartMetadata2(part, providerType) {
  if (providerType === void 0 || providerType.trim().length === 0) {
    return part;
  }
  return {
    ...part,
    metadata: {
      provider_type: providerType
    }
  };
}
function normalizeMetadata2(metadata) {
  if (metadata === void 0) {
    return {};
  }
  try {
    const encoded = JSON.stringify(metadata, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
    if (encoded === void 0) {
      return {};
    }
    const decoded = JSON.parse(encoded);
    if (!isRecord(decoded)) {
      return {};
    }
    return decoded;
  } catch {
    return {};
  }
}
function toBase64Payload(value) {
  if (value === void 0 || value.length === 0) {
    return "";
  }
  return Buffer.from(value, "utf8").toString("base64");
}
function toInt64String2(value) {
  if (value === void 0 || Number.isNaN(value) || !Number.isFinite(value)) {
    return "0";
  }
  return Math.trunc(value).toString();
}
function toMessageRoleEnum2(role) {
  switch (String(role).trim().toLowerCase()) {
    case "assistant":
      return "MESSAGE_ROLE_ASSISTANT";
    case "tool":
      return "MESSAGE_ROLE_TOOL";
    case "user":
    default:
      return "MESSAGE_ROLE_USER";
  }
}
function toArtifactKindEnum2(kind) {
  switch (String(kind).trim().toLowerCase()) {
    case "request":
      return "ARTIFACT_KIND_REQUEST";
    case "response":
      return "ARTIFACT_KIND_RESPONSE";
    case "tools":
      return "ARTIFACT_KIND_TOOLS";
    case "provider_event":
      return "ARTIFACT_KIND_PROVIDER_EVENT";
    default:
      return "ARTIFACT_KIND_UNSPECIFIED";
  }
}

// ../sigil-sdk/js/dist/exporters/default.js
function createDefaultGenerationExporter(config) {
  switch (config.protocol) {
    case "http":
      return new HTTPGenerationExporter(config.endpoint, config.headers);
    case "grpc":
      return new GRPCGenerationExporter(config.endpoint, config.headers, config.insecure);
    case "none":
      return new NoopGenerationExporter();
    default:
      return new UnavailableGenerationExporter(new Error(`unsupported generation export protocol: ${config.protocol}`));
  }
}
var NoopGenerationExporter = class {
  async exportGenerations(request) {
    return {
      results: request.generations.map((generation) => ({
        generationId: generation.id,
        accepted: true
      }))
    };
  }
};
var UnavailableGenerationExporter = class {
  reason;
  constructor(reason) {
    this.reason = reason;
  }
  async exportGenerations() {
    throw this.reason;
  }
};

// ../sigil-sdk/js/dist/client.js
import { metrics, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
var spanAttrGenerationID = "sigil.generation.id";
var spanAttrSDKName = "sigil.sdk.name";
var spanAttrFrameworkRunID = "sigil.framework.run_id";
var spanAttrFrameworkThreadID = "sigil.framework.thread_id";
var spanAttrFrameworkParentRunID = "sigil.framework.parent_run_id";
var spanAttrFrameworkComponentName = "sigil.framework.component_name";
var spanAttrFrameworkRunType = "sigil.framework.run_type";
var spanAttrFrameworkRetryAttempt = "sigil.framework.retry_attempt";
var spanAttrFrameworkLangGraphNode = "sigil.framework.langgraph.node";
var spanAttrFrameworkEventID = "sigil.framework.event_id";
var spanAttrConversationID = "gen_ai.conversation.id";
var spanAttrConversationTitle = "sigil.conversation.title";
var spanAttrUserID = "user.id";
var spanAttrAgentName = "gen_ai.agent.name";
var spanAttrAgentVersion = "gen_ai.agent.version";
var spanAttrErrorType = "error.type";
var spanAttrErrorCategory = "error.category";
var spanAttrOperationName = "gen_ai.operation.name";
var spanAttrProviderName = "gen_ai.provider.name";
var spanAttrRequestModel = "gen_ai.request.model";
var spanAttrRequestMaxTokens = "gen_ai.request.max_tokens";
var spanAttrRequestTemperature = "gen_ai.request.temperature";
var spanAttrRequestTopP = "gen_ai.request.top_p";
var spanAttrRequestToolChoice = "sigil.gen_ai.request.tool_choice";
var spanAttrRequestThinkingEnabled = "sigil.gen_ai.request.thinking.enabled";
var spanAttrRequestThinkingBudget = "sigil.gen_ai.request.thinking.budget_tokens";
var spanAttrResponseID = "gen_ai.response.id";
var spanAttrResponseModel = "gen_ai.response.model";
var spanAttrFinishReasons = "gen_ai.response.finish_reasons";
var spanAttrInputTokens = "gen_ai.usage.input_tokens";
var spanAttrOutputTokens = "gen_ai.usage.output_tokens";
var spanAttrEmbeddingInputCount = "gen_ai.embeddings.input_count";
var spanAttrEmbeddingInputTexts = "gen_ai.embeddings.input_texts";
var spanAttrEmbeddingDimCount = "gen_ai.embeddings.dimension.count";
var spanAttrRequestEncodingFormats = "gen_ai.request.encoding_formats";
var spanAttrCacheReadTokens = "gen_ai.usage.cache_read_input_tokens";
var spanAttrCacheWriteTokens = "gen_ai.usage.cache_write_input_tokens";
var spanAttrCacheCreationTokens = "gen_ai.usage.cache_creation_input_tokens";
var spanAttrReasoningTokens = "gen_ai.usage.reasoning_tokens";
var spanAttrToolName = "gen_ai.tool.name";
var spanAttrToolCallID = "gen_ai.tool.call.id";
var spanAttrToolType = "gen_ai.tool.type";
var spanAttrToolDescription = "gen_ai.tool.description";
var spanAttrToolCallArguments = "gen_ai.tool.call.arguments";
var spanAttrToolCallResult = "gen_ai.tool.call.result";
var maxRatingConversationIdLen = 255;
var maxRatingIdLen = 128;
var maxRatingGenerationIdLen = 255;
var maxRatingActorIdLen = 255;
var maxRatingSourceLen = 64;
var maxRatingCommentBytes = 4096;
var maxRatingMetadataBytes = 16 * 1024;
var metricOperationDuration = "gen_ai.client.operation.duration";
var metricTokenUsage = "gen_ai.client.token.usage";
var metricTimeToFirstToken = "gen_ai.client.time_to_first_token";
var metricToolCallsPerOperation = "gen_ai.client.tool_calls_per_operation";
var metricAttrTokenType = "gen_ai.token.type";
var metricTokenTypeInput = "input";
var metricTokenTypeOutput = "output";
var metricTokenTypeCacheRead = "cache_read";
var metricTokenTypeCacheWrite = "cache_write";
var metricTokenTypeCacheCreation = "cache_creation";
var metricTokenTypeReasoning = "reasoning";
var instrumentationName = "github.com/grafana/sigil/sdks/js";
var sdkName = "sdk-js";
var defaultEmbeddingOperationName = "embeddings";
var metadataUserIDKey = "sigil.user.id";
var metadataLegacyUserIDKey = "user.id";
var SigilClient = class {
  config;
  nowFn;
  sleepFn;
  logger;
  generationExporter;
  tracer;
  meter;
  operationDurationHistogram;
  tokenUsageHistogram;
  ttftHistogram;
  toolCallsHistogram;
  generations = [];
  toolExecutions = [];
  pendingGenerations = [];
  flushPromise;
  flushRequested = false;
  flushTimer;
  shutdownPromise;
  shuttingDown = false;
  closed = false;
  /**
   * Creates a Sigil SDK client.
   *
   * `inputConfig` is merged with defaults.
   */
  constructor(inputConfig = {}) {
    this.config = mergeConfig(inputConfig);
    this.nowFn = this.config.now ?? (() => /* @__PURE__ */ new Date());
    this.sleepFn = this.config.sleep ?? defaultSleep;
    this.logger = this.config.logger ?? defaultLogger;
    this.generationExporter = this.config.generationExporter ?? createDefaultGenerationExporter(this.config.generationExport);
    this.tracer = this.config.tracer ?? trace.getTracer(instrumentationName);
    this.meter = this.config.meter ?? metrics.getMeter(instrumentationName);
    this.operationDurationHistogram = this.meter.createHistogram(metricOperationDuration, { unit: "s" });
    this.tokenUsageHistogram = this.meter.createHistogram(metricTokenUsage, { unit: "token" });
    this.ttftHistogram = this.meter.createHistogram(metricTimeToFirstToken, { unit: "s" });
    this.toolCallsHistogram = this.meter.createHistogram(metricToolCallsPerOperation, { unit: "count" });
    if (this.config.generationExport.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        this.triggerAsyncFlush();
      }, this.config.generationExport.flushIntervalMs);
      maybeUnref(this.flushTimer);
    }
  }
  startGeneration(start, callback) {
    return this.startGenerationWithMode(start, "SYNC", callback);
  }
  startStreamingGeneration(start, callback) {
    return this.startGenerationWithMode(start, "STREAM", callback);
  }
  startEmbedding(start, callback) {
    this.assertOpen();
    const seed = cloneEmbeddingStart(start);
    if (!notEmpty(seed.agentName)) {
      seed.agentName = agentNameFromContext();
    }
    if (!notEmpty(seed.agentVersion)) {
      seed.agentVersion = agentVersionFromContext();
    }
    const recorder = new EmbeddingRecorderImpl(this, seed);
    if (callback === void 0) {
      return recorder;
    }
    return runWithRecorder(recorder, callback);
  }
  startToolExecution(start, callback) {
    this.assertOpen();
    const recorder = start.toolName.trim().length === 0 ? new NoopToolExecutionRecorder() : new ToolExecutionRecorderImpl(this, start);
    if (callback === void 0) {
      return recorder;
    }
    return runWithRecorder(recorder, callback);
  }
  /** Submits a user-facing conversation rating through Sigil HTTP API. */
  async submitConversationRating(conversationId, input) {
    this.assertOpen();
    const normalizedConversationId = conversationId.trim();
    if (normalizedConversationId.length === 0) {
      throw new Error("sigil conversation rating validation failed: conversationId is required");
    }
    if (normalizedConversationId.length > maxRatingConversationIdLen) {
      throw new Error("sigil conversation rating validation failed: conversationId is too long");
    }
    const normalizedInput = normalizeConversationRatingInput(input);
    const endpoint = buildConversationRatingEndpoint(this.config.api.endpoint, this.config.generationExport.insecure, normalizedConversationId);
    const requestBody = {
      rating_id: normalizedInput.ratingId,
      rating: normalizedInput.rating,
      comment: normalizedInput.comment,
      metadata: normalizedInput.metadata,
      generation_id: normalizedInput.generationId,
      rater_id: normalizedInput.raterId,
      source: normalizedInput.source
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.config.generationExport.headers
      },
      body: JSON.stringify(requestBody)
    });
    const responseText = (await response.text()).trim();
    if (response.status === 400) {
      throw new Error(`sigil conversation rating validation failed: ${ratingErrorText(responseText, response.status)}`);
    }
    if (response.status === 409) {
      throw new Error(`sigil conversation rating conflict: ${ratingErrorText(responseText, response.status)}`);
    }
    if (!response.ok) {
      throw new Error(`sigil conversation rating transport failed: status ${response.status}: ${ratingErrorText(responseText, response.status)}`);
    }
    if (responseText.length === 0) {
      throw new Error("sigil conversation rating transport failed: empty response payload");
    }
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`sigil conversation rating transport failed: invalid JSON response: ${asError(error).message}`);
    }
    return parseSubmitConversationRatingResponse(payload);
  }
  /** Forces immediate drain of queued generation exports. */
  async flush() {
    this.assertOpen();
    await this.flushInternal();
  }
  /** Flushes pending generations and shuts down the generation exporter. */
  async shutdown() {
    if (this.shutdownPromise !== void 0) {
      await this.shutdownPromise;
      return;
    }
    this.shuttingDown = true;
    this.shutdownPromise = (async () => {
      this.stopFlushTimer();
      try {
        await this.flushInternal();
      } catch (error) {
        this.logWarn("sigil generation export flush on shutdown failed", error);
      }
      try {
        await this.generationExporter.shutdown?.();
      } catch (error) {
        this.logWarn("sigil generation exporter shutdown failed", error);
      }
      this.closed = true;
    })();
    await this.shutdownPromise;
  }
  /** Returns a cloned in-memory snapshot for debugging and tests. */
  debugSnapshot() {
    return {
      generations: this.generations.map(cloneGeneration),
      toolExecutions: this.toolExecutions.map(cloneToolExecution),
      queueSize: this.pendingGenerations.length
    };
  }
  internalNow() {
    return this.nowFn();
  }
  internalRecordGeneration(generation) {
    this.generations.push(cloneGeneration(generation));
  }
  internalRecordToolExecution(toolExecution) {
    this.toolExecutions.push(cloneToolExecution(toolExecution));
  }
  internalEnqueueGeneration(generation) {
    if (this.shuttingDown || this.closed) {
      throw new Error("sigil client is shutdown");
    }
    const payloadMaxBytes = this.config.generationExport.payloadMaxBytes;
    if (payloadMaxBytes > 0) {
      const payloadBytes = encodedSizeBytes(generation);
      if (payloadBytes > payloadMaxBytes) {
        throw new Error(`generation payload exceeds max bytes (${payloadBytes} > ${payloadMaxBytes})`);
      }
    }
    const queueSize = Math.max(1, this.config.generationExport.queueSize);
    if (this.pendingGenerations.length >= queueSize) {
      throw new Error("generation queue is full");
    }
    this.pendingGenerations.push(cloneGeneration(generation));
    const batchSize = Math.max(1, this.config.generationExport.batchSize);
    if (this.pendingGenerations.length >= batchSize) {
      this.triggerAsyncFlush();
    }
  }
  internalLogWarn(message, error) {
    this.logWarn(message, error);
  }
  internalStartGenerationSpan(seed, mode, startedAt) {
    const operationName = seed.operationName ?? defaultOperationNameForMode(mode);
    const span = this.tracer.startSpan(generationSpanName(operationName, seed.model.name), {
      kind: SpanKind.CLIENT,
      startTime: startedAt
    });
    setGenerationSpanAttributes(span, {
      id: seed.id,
      conversationId: seed.conversationId,
      conversationTitle: seed.conversationTitle,
      userId: seed.userId,
      agentName: seed.agentName,
      agentVersion: seed.agentVersion,
      operationName,
      model: seed.model,
      maxTokens: seed.maxTokens,
      temperature: seed.temperature,
      topP: seed.topP,
      toolChoice: seed.toolChoice,
      thinkingEnabled: seed.thinkingEnabled,
      metadata: seed.metadata
    });
    return span;
  }
  internalStartEmbeddingSpan(seed, startedAt) {
    const span = this.tracer.startSpan(embeddingSpanName(seed.model.name), {
      kind: SpanKind.CLIENT,
      startTime: startedAt
    });
    setEmbeddingStartSpanAttributes(span, seed);
    return span;
  }
  internalStartToolExecutionSpan(seed, startedAt) {
    const span = this.tracer.startSpan(toolSpanName(seed.toolName), {
      kind: SpanKind.INTERNAL,
      startTime: startedAt
    });
    setToolSpanAttributes(span, seed);
    return span;
  }
  internalApplyTraceContextFromSpan(span, generation) {
    const context = span.spanContext();
    if (context.traceId.length > 0) {
      generation.traceId = context.traceId;
    }
    if (context.spanId.length > 0) {
      generation.spanId = context.spanId;
    }
  }
  internalSyncGenerationSpan(span, generation) {
    setGenerationSpanAttributes(span, generation);
  }
  internalFinalizeGenerationSpan(span, generation, callError, validationError, enqueueError, firstTokenAt) {
    span.updateName(generationSpanName(generation.operationName, generation.model.name));
    if (callError !== void 0) {
      span.recordException(new Error(callError));
    }
    if (validationError !== void 0) {
      span.recordException(validationError);
    }
    if (enqueueError !== void 0) {
      span.recordException(enqueueError);
    }
    let errorType = "";
    let errorCategory = "";
    if (callError !== void 0) {
      errorType = "provider_call_error";
      errorCategory = errorCategoryFromError(callError, true);
      span.setAttribute(spanAttrErrorType, errorType);
      span.setAttribute(spanAttrErrorCategory, errorCategory);
      span.setStatus({ code: SpanStatusCode.ERROR, message: callError });
    } else if (validationError !== void 0) {
      errorType = "validation_error";
      errorCategory = "sdk_error";
      span.setAttribute(spanAttrErrorType, errorType);
      span.setAttribute(spanAttrErrorCategory, errorCategory);
      span.setStatus({ code: SpanStatusCode.ERROR, message: validationError.message });
    } else if (enqueueError !== void 0) {
      errorType = "enqueue_error";
      errorCategory = "sdk_error";
      span.setAttribute(spanAttrErrorType, errorType);
      span.setAttribute(spanAttrErrorCategory, errorCategory);
      span.setStatus({ code: SpanStatusCode.ERROR, message: enqueueError.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    this.recordGenerationMetrics(generation, errorType, errorCategory, firstTokenAt);
    span.end(generation.completedAt);
  }
  internalFinalizeEmbeddingSpan(span, seed, result, hasResult, callError, localError, startedAt, completedAt) {
    span.updateName(embeddingSpanName(seed.model.name));
    setEmbeddingEndSpanAttributes(span, result, hasResult, this.config.embeddingCapture);
    if (callError !== void 0) {
      span.recordException(callError);
    }
    if (localError !== void 0) {
      span.recordException(localError);
    }
    let errorType = "";
    let errorCategory = "";
    if (callError !== void 0) {
      errorType = "provider_call_error";
      errorCategory = errorCategoryFromError(callError, true);
      span.setStatus({ code: SpanStatusCode.ERROR, message: callError.message });
    } else if (localError !== void 0) {
      errorType = "validation_error";
      errorCategory = "sdk_error";
      span.setStatus({ code: SpanStatusCode.ERROR, message: localError.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    if (errorType.length > 0) {
      span.setAttribute(spanAttrErrorType, errorType);
      span.setAttribute(spanAttrErrorCategory, errorCategory);
    }
    this.recordEmbeddingMetrics(seed, result, startedAt, completedAt, errorType, errorCategory);
    span.end(completedAt);
  }
  internalFinalizeToolExecutionSpan(span, toolExecution, localError) {
    setToolSpanAttributes(span, toolExecution);
    if (toolExecution.includeContent) {
      const argumentsResult = serializeToolContent(toolExecution.arguments);
      if (argumentsResult.error !== void 0 && localError === void 0) {
        localError = argumentsResult.error;
      } else if (argumentsResult.value !== void 0) {
        span.setAttribute(spanAttrToolCallArguments, argumentsResult.value);
      }
      const resultValue = serializeToolContent(toolExecution.result);
      if (resultValue.error !== void 0 && localError === void 0) {
        localError = resultValue.error;
      } else if (resultValue.value !== void 0) {
        span.setAttribute(spanAttrToolCallResult, resultValue.value);
      }
    }
    if (toolExecution.callError !== void 0) {
      span.recordException(new Error(toolExecution.callError));
      span.setAttribute(spanAttrErrorType, "tool_execution_error");
      span.setAttribute(spanAttrErrorCategory, errorCategoryFromError(toolExecution.callError, true));
      span.setStatus({ code: SpanStatusCode.ERROR, message: toolExecution.callError });
    } else if (localError !== void 0) {
      span.recordException(localError);
      span.setAttribute(spanAttrErrorType, "tool_execution_error");
      span.setAttribute(spanAttrErrorCategory, errorCategoryFromError(localError, true));
      span.setStatus({ code: SpanStatusCode.ERROR, message: localError.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    this.recordToolExecutionMetrics(toolExecution, localError ?? (toolExecution.callError !== void 0 ? new Error(toolExecution.callError) : void 0));
    span.end(toolExecution.completedAt);
    return localError;
  }
  recordGenerationMetrics(generation, errorType, errorCategory, firstTokenAt) {
    const startedMs = generation.startedAt.getTime();
    const completedMs = generation.completedAt.getTime();
    const durationSeconds = Math.max(0, (completedMs - startedMs) / 1e3);
    this.operationDurationHistogram.record(durationSeconds, {
      [spanAttrOperationName]: generation.operationName,
      [spanAttrProviderName]: generation.model.provider,
      [spanAttrRequestModel]: generation.model.name,
      [spanAttrAgentName]: generation.agentName ?? "",
      [spanAttrErrorType]: errorType,
      [spanAttrErrorCategory]: errorCategory
    });
    const usage = generation.usage;
    if (usage !== void 0) {
      this.recordTokenUsage(generation, metricTokenTypeInput, usage.inputTokens);
      this.recordTokenUsage(generation, metricTokenTypeOutput, usage.outputTokens);
      this.recordTokenUsage(generation, metricTokenTypeCacheRead, usage.cacheReadInputTokens);
      this.recordTokenUsage(generation, metricTokenTypeCacheWrite, usage.cacheWriteInputTokens);
      this.recordTokenUsage(generation, metricTokenTypeCacheCreation, usage.cacheCreationInputTokens);
      this.recordTokenUsage(generation, metricTokenTypeReasoning, usage.reasoningTokens);
    }
    this.toolCallsHistogram.record(countToolCallParts(generation.output ?? []), {
      [spanAttrProviderName]: generation.model.provider,
      [spanAttrRequestModel]: generation.model.name,
      [spanAttrAgentName]: generation.agentName ?? ""
    });
    if (generation.operationName === "streamText" && firstTokenAt !== void 0) {
      const ttftSeconds = (firstTokenAt.getTime() - startedMs) / 1e3;
      if (ttftSeconds >= 0) {
        this.ttftHistogram.record(ttftSeconds, {
          [spanAttrProviderName]: generation.model.provider,
          [spanAttrRequestModel]: generation.model.name,
          [spanAttrAgentName]: generation.agentName ?? ""
        });
      }
    }
  }
  recordEmbeddingMetrics(seed, result, startedAt, completedAt, errorType, errorCategory) {
    const durationSeconds = Math.max(0, (completedAt.getTime() - startedAt.getTime()) / 1e3);
    this.operationDurationHistogram.record(durationSeconds, {
      [spanAttrOperationName]: defaultEmbeddingOperationName,
      [spanAttrProviderName]: seed.model.provider,
      [spanAttrRequestModel]: seed.model.name,
      [spanAttrAgentName]: seed.agentName ?? "",
      [spanAttrErrorType]: errorType,
      [spanAttrErrorCategory]: errorCategory
    });
    if (result.inputTokens !== void 0 && result.inputTokens !== 0) {
      this.tokenUsageHistogram.record(result.inputTokens, {
        [spanAttrOperationName]: defaultEmbeddingOperationName,
        [spanAttrProviderName]: seed.model.provider,
        [spanAttrRequestModel]: seed.model.name,
        [spanAttrAgentName]: seed.agentName ?? "",
        [metricAttrTokenType]: metricTokenTypeInput
      });
    }
  }
  recordTokenUsage(generation, tokenType, value) {
    if (value === void 0 || value === 0) {
      return;
    }
    this.tokenUsageHistogram.record(value, {
      [spanAttrOperationName]: generation.operationName,
      [spanAttrProviderName]: generation.model.provider,
      [spanAttrRequestModel]: generation.model.name,
      [spanAttrAgentName]: generation.agentName ?? "",
      [metricAttrTokenType]: tokenType
    });
  }
  recordToolExecutionMetrics(toolExecution, finalError) {
    const startedMs = toolExecution.startedAt.getTime();
    const completedMs = toolExecution.completedAt.getTime();
    const durationSeconds = Math.max(0, (completedMs - startedMs) / 1e3);
    const errorType = finalError === void 0 ? "" : "tool_execution_error";
    const errorCategory = finalError === void 0 ? "" : errorCategoryFromError(finalError, true);
    this.operationDurationHistogram.record(durationSeconds, {
      [spanAttrOperationName]: "execute_tool",
      [spanAttrProviderName]: (toolExecution.requestProvider ?? "").trim(),
      [spanAttrRequestModel]: (toolExecution.requestModel ?? "").trim(),
      [spanAttrToolName]: toolExecution.toolName.trim(),
      [spanAttrAgentName]: toolExecution.agentName ?? "",
      [spanAttrErrorType]: errorType,
      [spanAttrErrorCategory]: errorCategory
    });
  }
  assertOpen() {
    if (this.shuttingDown || this.closed) {
      throw new Error("sigil client is shutdown");
    }
  }
  startGenerationWithMode(start, mode, callback) {
    this.assertOpen();
    const recorder = new GenerationRecorderImpl(this, start, mode);
    if (callback === void 0) {
      return recorder;
    }
    return runWithRecorder(recorder, callback);
  }
  triggerAsyncFlush() {
    void this.flushInternal().catch((error) => {
      this.logWarn("sigil generation export failed", error);
    });
  }
  flushInternal() {
    if (this.flushPromise !== void 0) {
      this.flushRequested = true;
      return this.flushPromise;
    }
    this.flushPromise = this.drainPendingGenerations().finally(() => {
      this.flushPromise = void 0;
    });
    return this.flushPromise;
  }
  async drainPendingGenerations() {
    do {
      this.flushRequested = false;
      while (this.pendingGenerations.length > 0) {
        const batchSize = Math.max(1, this.config.generationExport.batchSize);
        const batch = this.pendingGenerations.splice(0, batchSize).map(cloneGeneration);
        await this.exportWithRetry(batch);
      }
    } while (this.flushRequested || this.pendingGenerations.length > 0);
  }
  async exportWithRetry(generations) {
    const maxRetries = Math.max(0, this.config.generationExport.maxRetries);
    const attempts = maxRetries + 1;
    const baseBackoffMs = this.config.generationExport.initialBackoffMs > 0 ? this.config.generationExport.initialBackoffMs : 100;
    const maxBackoffMs = this.config.generationExport.maxBackoffMs > 0 ? this.config.generationExport.maxBackoffMs : baseBackoffMs;
    let backoffMs = baseBackoffMs;
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await this.generationExporter.exportGenerations({
          generations: generations.map(cloneGeneration)
        });
        this.logRejectedResults(response.results);
        return;
      } catch (error) {
        lastError = asError(error);
        if (attempt === attempts - 1) {
          break;
        }
        await this.sleepFn(backoffMs);
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
      }
    }
    throw lastError ?? new Error("generation export failed");
  }
  logRejectedResults(results) {
    for (const result of results) {
      if (!result.accepted) {
        this.logWarn(`sigil generation rejected id=${result.generationId}`, result.error);
      }
    }
  }
  stopFlushTimer() {
    if (this.flushTimer !== void 0) {
      clearInterval(this.flushTimer);
      this.flushTimer = void 0;
    }
  }
  logWarn(message, error) {
    if (error === void 0) {
      this.logger.warn?.(message);
      return;
    }
    this.logger.warn?.(`${message}: ${asError(error).message}`);
  }
};
var GenerationRecorderImpl = class {
  client;
  seed;
  startedAt;
  mode;
  span;
  ended = false;
  result;
  callError;
  localError;
  firstTokenAt;
  constructor(client, seed, defaultMode) {
    this.client = client;
    this.seed = cloneGenerationStart(seed);
    if (!notEmpty(this.seed.conversationId)) {
      this.seed.conversationId = conversationIdFromContext();
    }
    if (!notEmpty(this.seed.conversationTitle)) {
      this.seed.conversationTitle = conversationTitleFromContext();
    }
    if (!notEmpty(this.seed.userId)) {
      this.seed.userId = userIdFromContext();
    }
    if (!notEmpty(this.seed.agentName)) {
      this.seed.agentName = agentNameFromContext();
    }
    if (!notEmpty(this.seed.agentVersion)) {
      this.seed.agentVersion = agentVersionFromContext();
    }
    if (!notEmpty(this.seed.operationName)) {
      this.seed.operationName = defaultOperationNameForMode(this.seed.mode ?? defaultMode);
    }
    this.mode = this.seed.mode ?? defaultMode;
    this.startedAt = this.seed.startedAt ?? this.client.internalNow();
    this.span = this.client.internalStartGenerationSpan(this.seed, this.mode, this.startedAt);
  }
  setResult(result) {
    if (this.ended) {
      return;
    }
    this.result = cloneGenerationResult(result);
  }
  setCallError(error) {
    if (this.ended) {
      return;
    }
    this.callError = asError(error).message;
  }
  setFirstTokenAt(firstTokenAt) {
    if (this.ended) {
      return;
    }
    if (!(firstTokenAt instanceof Date) || Number.isNaN(firstTokenAt.getTime())) {
      return;
    }
    this.firstTokenAt = new Date(firstTokenAt);
  }
  end() {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const generation = {
      id: this.seed.id ?? newLocalID("gen"),
      conversationId: firstNonEmptyString(this.result?.conversationId, this.seed.conversationId),
      conversationTitle: firstNonEmptyString(this.result?.conversationTitle, this.seed.conversationTitle),
      userId: firstNonEmptyString(this.result?.userId, this.seed.userId),
      agentName: firstNonEmptyString(this.result?.agentName, this.seed.agentName),
      agentVersion: firstNonEmptyString(this.result?.agentVersion, this.seed.agentVersion),
      mode: this.mode,
      operationName: this.result?.operationName ?? this.seed.operationName ?? defaultOperationNameForMode(this.mode),
      model: cloneModelRef(this.seed.model),
      systemPrompt: this.seed.systemPrompt,
      responseId: this.result?.responseId,
      responseModel: this.result?.responseModel,
      maxTokens: this.result?.maxTokens ?? this.seed.maxTokens,
      temperature: this.result?.temperature ?? this.seed.temperature,
      topP: this.result?.topP ?? this.seed.topP,
      toolChoice: this.result?.toolChoice ?? this.seed.toolChoice,
      thinkingEnabled: this.result?.thinkingEnabled ?? this.seed.thinkingEnabled,
      input: this.result?.input?.map(cloneMessage),
      output: this.result?.output?.map(cloneMessage),
      tools: this.result?.tools?.map(cloneToolDefinition) ?? this.seed.tools?.map(cloneToolDefinition),
      usage: this.result?.usage ? { ...this.result.usage } : void 0,
      stopReason: this.result?.stopReason,
      startedAt: new Date(this.startedAt),
      completedAt: new Date(this.result?.completedAt ?? this.client.internalNow()),
      tags: mergeStringRecords(this.seed.tags, this.result?.tags),
      metadata: mergeUnknownRecords(this.seed.metadata, this.result?.metadata),
      artifacts: this.result?.artifacts?.map(cloneArtifact),
      callError: this.callError
    };
    generation.conversationTitle = firstNonEmptyString(generation.conversationTitle, metadataStringValue(generation.metadata, spanAttrConversationTitle))?.trim();
    if (notEmpty(generation.conversationTitle)) {
      if (generation.metadata === void 0) {
        generation.metadata = {};
      }
      generation.metadata[spanAttrConversationTitle] = generation.conversationTitle;
    }
    generation.userId = firstNonEmptyString(generation.userId, metadataStringValue(generation.metadata, metadataUserIDKey), metadataStringValue(generation.metadata, metadataLegacyUserIDKey))?.trim();
    if (notEmpty(generation.userId)) {
      if (generation.metadata === void 0) {
        generation.metadata = {};
      }
      generation.metadata[metadataUserIDKey] = generation.userId;
    }
    if (this.callError !== void 0) {
      if (generation.metadata === void 0) {
        generation.metadata = {};
      }
      generation.metadata.call_error = this.callError;
    }
    if (generation.metadata === void 0) {
      generation.metadata = {};
    }
    generation.metadata[spanAttrSDKName] = sdkName;
    this.client.internalSyncGenerationSpan(this.span, generation);
    this.client.internalApplyTraceContextFromSpan(this.span, generation);
    this.client.internalRecordGeneration(generation);
    const validationError = validateGeneration(generation);
    let enqueueError;
    if (validationError !== void 0) {
      this.localError = validationError;
      this.client.internalLogWarn("sigil generation validation failed", validationError);
    } else {
      try {
        this.client.internalEnqueueGeneration(generation);
      } catch (error) {
        enqueueError = asError(error);
        this.localError = enqueueError;
        this.client.internalLogWarn("sigil generation enqueue failed", enqueueError);
      }
    }
    this.client.internalFinalizeGenerationSpan(this.span, generation, this.callError, validationError, enqueueError, this.firstTokenAt);
  }
  getError() {
    return this.localError;
  }
};
var EmbeddingRecorderImpl = class {
  client;
  seed;
  startedAt;
  span;
  ended = false;
  callError;
  result;
  hasResult = false;
  localError;
  constructor(client, seed) {
    this.client = client;
    this.seed = cloneEmbeddingStart(seed);
    this.startedAt = this.seed.startedAt ?? this.client.internalNow();
    this.span = this.client.internalStartEmbeddingSpan(this.seed, this.startedAt);
  }
  setCallError(error) {
    if (this.ended) {
      return;
    }
    this.callError = asError(error);
  }
  setResult(result) {
    if (this.ended) {
      return;
    }
    this.result = cloneEmbeddingResult(result);
    this.hasResult = true;
  }
  end() {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const completedAt = this.client.internalNow();
    const normalizedResult = this.result ? cloneEmbeddingResult(this.result) : { inputCount: 0 };
    let localError = validateEmbeddingStart(this.seed);
    if (localError === void 0) {
      localError = validateEmbeddingResult(normalizedResult);
    }
    this.client.internalFinalizeEmbeddingSpan(this.span, this.seed, normalizedResult, this.hasResult, this.callError, localError, this.startedAt, completedAt);
    this.localError = localError;
  }
  getError() {
    return this.localError;
  }
};
var ToolExecutionRecorderImpl = class {
  client;
  seed;
  startedAt;
  span;
  ended = false;
  result;
  callError;
  localError;
  constructor(client, seed) {
    this.client = client;
    this.seed = cloneToolExecutionStart(seed);
    if (!notEmpty(this.seed.conversationId)) {
      this.seed.conversationId = conversationIdFromContext();
    }
    if (!notEmpty(this.seed.conversationTitle)) {
      this.seed.conversationTitle = conversationTitleFromContext();
    }
    if (!notEmpty(this.seed.agentName)) {
      this.seed.agentName = agentNameFromContext();
    }
    if (!notEmpty(this.seed.agentVersion)) {
      this.seed.agentVersion = agentVersionFromContext();
    }
    this.startedAt = this.seed.startedAt ?? this.client.internalNow();
    this.span = this.client.internalStartToolExecutionSpan(this.seed, this.startedAt);
  }
  setResult(result) {
    if (this.ended) {
      return;
    }
    this.result = cloneToolExecutionResult(result);
  }
  setCallError(error) {
    if (this.ended) {
      return;
    }
    this.localError = asError(error);
    this.callError = this.localError.message;
  }
  end() {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const toolExecution = {
      toolName: this.seed.toolName,
      toolCallId: this.seed.toolCallId,
      toolType: this.seed.toolType,
      toolDescription: this.seed.toolDescription,
      conversationId: this.seed.conversationId,
      conversationTitle: this.seed.conversationTitle,
      agentName: this.seed.agentName,
      agentVersion: this.seed.agentVersion,
      requestModel: this.seed.requestModel,
      requestProvider: this.seed.requestProvider,
      includeContent: this.seed.includeContent ?? false,
      startedAt: new Date(this.startedAt),
      completedAt: new Date(this.result?.completedAt ?? this.client.internalNow()),
      arguments: this.result?.arguments,
      result: this.result?.result,
      callError: this.callError
    };
    const validationError = validateToolExecution(toolExecution);
    if (validationError !== void 0) {
      this.localError = validationError;
      this.client.internalLogWarn("sigil tool execution validation failed", validationError);
    } else {
      this.client.internalRecordToolExecution(toolExecution);
    }
    this.localError = this.client.internalFinalizeToolExecutionSpan(this.span, toolExecution, this.localError);
  }
  getError() {
    return this.localError;
  }
};
var NoopToolExecutionRecorder = class {
  setResult(_result) {
  }
  setCallError(_error) {
  }
  end() {
  }
  getError() {
    return void 0;
  }
};
async function runWithRecorder(recorder, callback) {
  let callbackError;
  try {
    return await callback(recorder);
  } catch (error) {
    callbackError = error;
    recorder.setCallError(error);
    throw error;
  } finally {
    recorder.end();
    const recorderError = recorder.getError();
    if (callbackError === void 0 && recorderError !== void 0) {
      throw recorderError;
    }
  }
}
function generationSpanName(operationName, modelName) {
  const operation = operationName.trim();
  const model = modelName.trim();
  if (model.length === 0) {
    return operation;
  }
  return `${operation} ${model}`;
}
function embeddingSpanName(modelName) {
  const model = modelName.trim();
  if (model.length === 0) {
    return defaultEmbeddingOperationName;
  }
  return `${defaultEmbeddingOperationName} ${model}`;
}
function toolSpanName(toolName) {
  const normalized = toolName.trim();
  if (normalized.length === 0) {
    return "execute_tool unknown";
  }
  return `execute_tool ${normalized}`;
}
function setGenerationSpanAttributes(span, generation) {
  span.setAttribute(spanAttrOperationName, generation.operationName);
  span.setAttribute(spanAttrSDKName, sdkName);
  if (notEmpty(generation.id)) {
    span.setAttribute(spanAttrGenerationID, generation.id);
  }
  if (notEmpty(generation.conversationId)) {
    span.setAttribute(spanAttrConversationID, generation.conversationId);
  }
  if (notEmpty(generation.conversationTitle)) {
    span.setAttribute(spanAttrConversationTitle, generation.conversationTitle);
  }
  if (notEmpty(generation.userId)) {
    span.setAttribute(spanAttrUserID, generation.userId);
  }
  if (notEmpty(generation.agentName)) {
    span.setAttribute(spanAttrAgentName, generation.agentName);
  }
  if (notEmpty(generation.agentVersion)) {
    span.setAttribute(spanAttrAgentVersion, generation.agentVersion);
  }
  if (notEmpty(generation.model.provider)) {
    span.setAttribute(spanAttrProviderName, generation.model.provider);
  }
  if (notEmpty(generation.model.name)) {
    span.setAttribute(spanAttrRequestModel, generation.model.name);
  }
  if (generation.maxTokens !== void 0) {
    span.setAttribute(spanAttrRequestMaxTokens, generation.maxTokens);
  }
  if (generation.temperature !== void 0) {
    span.setAttribute(spanAttrRequestTemperature, generation.temperature);
  }
  if (generation.topP !== void 0) {
    span.setAttribute(spanAttrRequestTopP, generation.topP);
  }
  if (notEmpty(generation.toolChoice)) {
    span.setAttribute(spanAttrRequestToolChoice, generation.toolChoice);
  }
  if (generation.thinkingEnabled !== void 0) {
    span.setAttribute(spanAttrRequestThinkingEnabled, generation.thinkingEnabled);
  }
  const thinkingBudget = thinkingBudgetFromMetadata(generation.metadata);
  if (thinkingBudget !== void 0) {
    span.setAttribute(spanAttrRequestThinkingBudget, thinkingBudget);
  }
  const frameworkRunId = metadataStringValue(generation.metadata, spanAttrFrameworkRunID);
  if (frameworkRunId !== void 0) {
    span.setAttribute(spanAttrFrameworkRunID, frameworkRunId);
  }
  const frameworkThreadId = metadataStringValue(generation.metadata, spanAttrFrameworkThreadID);
  if (frameworkThreadId !== void 0) {
    span.setAttribute(spanAttrFrameworkThreadID, frameworkThreadId);
  }
  const frameworkParentRunId = metadataStringValue(generation.metadata, spanAttrFrameworkParentRunID);
  if (frameworkParentRunId !== void 0) {
    span.setAttribute(spanAttrFrameworkParentRunID, frameworkParentRunId);
  }
  const frameworkComponentName = metadataStringValue(generation.metadata, spanAttrFrameworkComponentName);
  if (frameworkComponentName !== void 0) {
    span.setAttribute(spanAttrFrameworkComponentName, frameworkComponentName);
  }
  const frameworkRunType = metadataStringValue(generation.metadata, spanAttrFrameworkRunType);
  if (frameworkRunType !== void 0) {
    span.setAttribute(spanAttrFrameworkRunType, frameworkRunType);
  }
  const frameworkRetryAttempt = metadataIntValue(generation.metadata, spanAttrFrameworkRetryAttempt);
  if (frameworkRetryAttempt !== void 0) {
    span.setAttribute(spanAttrFrameworkRetryAttempt, frameworkRetryAttempt);
  }
  const frameworkLangGraphNode = metadataStringValue(generation.metadata, spanAttrFrameworkLangGraphNode);
  if (frameworkLangGraphNode !== void 0) {
    span.setAttribute(spanAttrFrameworkLangGraphNode, frameworkLangGraphNode);
  }
  const frameworkEventID = metadataStringValue(generation.metadata, spanAttrFrameworkEventID);
  if (frameworkEventID !== void 0) {
    span.setAttribute(spanAttrFrameworkEventID, frameworkEventID);
  }
  if (notEmpty(generation.responseId)) {
    span.setAttribute(spanAttrResponseID, generation.responseId);
  }
  if (notEmpty(generation.responseModel)) {
    span.setAttribute(spanAttrResponseModel, generation.responseModel);
  }
  if (notEmpty(generation.stopReason)) {
    span.setAttribute(spanAttrFinishReasons, [generation.stopReason]);
  }
  const usage = generation.usage;
  if (usage === void 0) {
    return;
  }
  if ((usage.inputTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrInputTokens, usage.inputTokens ?? 0);
  }
  if ((usage.outputTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrOutputTokens, usage.outputTokens ?? 0);
  }
  if ((usage.cacheReadInputTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrCacheReadTokens, usage.cacheReadInputTokens ?? 0);
  }
  if ((usage.cacheWriteInputTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrCacheWriteTokens, usage.cacheWriteInputTokens ?? 0);
  }
  if ((usage.cacheCreationInputTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrCacheCreationTokens, usage.cacheCreationInputTokens ?? 0);
  }
  if ((usage.reasoningTokens ?? 0) !== 0) {
    span.setAttribute(spanAttrReasoningTokens, usage.reasoningTokens ?? 0);
  }
}
function setEmbeddingStartSpanAttributes(span, start) {
  span.setAttribute(spanAttrOperationName, defaultEmbeddingOperationName);
  span.setAttribute(spanAttrSDKName, sdkName);
  if (notEmpty(start.model.provider)) {
    span.setAttribute(spanAttrProviderName, start.model.provider);
  }
  if (notEmpty(start.model.name)) {
    span.setAttribute(spanAttrRequestModel, start.model.name);
  }
  if (notEmpty(start.agentName)) {
    span.setAttribute(spanAttrAgentName, start.agentName);
  }
  if (notEmpty(start.agentVersion)) {
    span.setAttribute(spanAttrAgentVersion, start.agentVersion);
  }
  if (start.dimensions !== void 0) {
    span.setAttribute(spanAttrEmbeddingDimCount, start.dimensions);
  }
  if (notEmpty(start.encodingFormat)) {
    span.setAttribute(spanAttrRequestEncodingFormats, [start.encodingFormat]);
  }
}
function setEmbeddingEndSpanAttributes(span, result, hasResult, captureConfig) {
  if (hasResult) {
    span.setAttribute(spanAttrEmbeddingInputCount, result.inputCount);
  }
  if (result.inputTokens !== void 0 && result.inputTokens !== 0) {
    span.setAttribute(spanAttrInputTokens, result.inputTokens);
  }
  if (notEmpty(result.responseModel)) {
    span.setAttribute(spanAttrResponseModel, result.responseModel);
  }
  if (result.dimensions !== void 0) {
    span.setAttribute(spanAttrEmbeddingDimCount, result.dimensions);
  }
  if (captureConfig.captureInput && result.inputTexts !== void 0) {
    const texts = captureEmbeddingInputTexts(result.inputTexts, captureConfig.maxInputItems, captureConfig.maxTextLength);
    if (texts.length > 0) {
      span.setAttribute(spanAttrEmbeddingInputTexts, texts);
    }
  }
}
function setToolSpanAttributes(span, tool) {
  span.setAttribute(spanAttrOperationName, "execute_tool");
  span.setAttribute(spanAttrToolName, tool.toolName);
  span.setAttribute(spanAttrSDKName, sdkName);
  if (notEmpty(tool.toolCallId)) {
    span.setAttribute(spanAttrToolCallID, tool.toolCallId);
  }
  if (notEmpty(tool.toolType)) {
    span.setAttribute(spanAttrToolType, tool.toolType);
  }
  if (notEmpty(tool.toolDescription)) {
    span.setAttribute(spanAttrToolDescription, tool.toolDescription);
  }
  if (notEmpty(tool.conversationId)) {
    span.setAttribute(spanAttrConversationID, tool.conversationId);
  }
  if (notEmpty(tool.conversationTitle)) {
    span.setAttribute(spanAttrConversationTitle, tool.conversationTitle);
  }
  if (notEmpty(tool.agentName)) {
    span.setAttribute(spanAttrAgentName, tool.agentName);
  }
  if (notEmpty(tool.agentVersion)) {
    span.setAttribute(spanAttrAgentVersion, tool.agentVersion);
  }
  if (notEmpty(tool.requestProvider)) {
    span.setAttribute(spanAttrProviderName, tool.requestProvider);
  }
  if (notEmpty(tool.requestModel)) {
    span.setAttribute(spanAttrRequestModel, tool.requestModel);
  }
}
function serializeToolContent(value) {
  if (value === void 0 || value === null) {
    return {};
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return {};
    }
    if (isJSON(trimmed)) {
      return { value: trimmed };
    }
    try {
      return { value: JSON.stringify(trimmed) };
    } catch (error) {
      return { error: asError(error) };
    }
  }
  try {
    const encoded = JSON.stringify(value);
    if (encoded === void 0 || encoded === "null") {
      return {};
    }
    return { value: encoded };
  } catch (error) {
    return { error: asError(error) };
  }
}
function normalizeConversationRatingInput(input) {
  const normalized = {
    ratingId: input.ratingId.trim(),
    rating: input.rating.trim(),
    comment: input.comment?.trim(),
    metadata: input.metadata,
    generationId: input.generationId?.trim(),
    raterId: input.raterId?.trim(),
    source: input.source?.trim()
  };
  if (normalized.ratingId.length === 0) {
    throw new Error("sigil conversation rating validation failed: ratingId is required");
  }
  if (normalized.ratingId.length > maxRatingIdLen) {
    throw new Error("sigil conversation rating validation failed: ratingId is too long");
  }
  if (normalized.rating !== "CONVERSATION_RATING_VALUE_GOOD" && normalized.rating !== "CONVERSATION_RATING_VALUE_BAD") {
    throw new Error("sigil conversation rating validation failed: rating must be CONVERSATION_RATING_VALUE_GOOD or CONVERSATION_RATING_VALUE_BAD");
  }
  if (normalized.comment !== void 0 && encodedSizeBytes(normalized.comment) > maxRatingCommentBytes) {
    throw new Error("sigil conversation rating validation failed: comment is too long");
  }
  if (normalized.generationId !== void 0 && normalized.generationId.length > maxRatingGenerationIdLen) {
    throw new Error("sigil conversation rating validation failed: generationId is too long");
  }
  if (normalized.raterId !== void 0 && normalized.raterId.length > maxRatingActorIdLen) {
    throw new Error("sigil conversation rating validation failed: raterId is too long");
  }
  if (normalized.source !== void 0 && normalized.source.length > maxRatingSourceLen) {
    throw new Error("sigil conversation rating validation failed: source is too long");
  }
  if (normalized.metadata !== void 0 && encodedSizeBytes(normalized.metadata) > maxRatingMetadataBytes) {
    throw new Error("sigil conversation rating validation failed: metadata is too large");
  }
  return normalized;
}
function buildConversationRatingEndpoint(endpoint, insecure, conversationId) {
  const baseURL = baseURLFromAPIEndpoint(endpoint, insecure);
  return `${baseURL}/api/v1/conversations/${encodeURIComponent(conversationId)}/ratings`;
}
function baseURLFromAPIEndpoint(endpoint, insecure) {
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) {
    throw new Error("sigil conversation rating transport failed: api endpoint is required");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  }
  const withoutScheme = trimmed.startsWith("grpc://") ? trimmed.slice("grpc://".length) : trimmed;
  const host = withoutScheme.split("/")[0]?.trim();
  if (host === void 0 || host.length === 0) {
    throw new Error("sigil conversation rating transport failed: api endpoint host is required");
  }
  return `${insecure ? "http" : "https"}://${host}`;
}
function parseSubmitConversationRatingResponse(payload) {
  if (!isObject2(payload)) {
    throw new Error("sigil conversation rating transport failed: invalid response payload");
  }
  if (!isObject2(payload.rating) || !isObject2(payload.summary)) {
    throw new Error("sigil conversation rating transport failed: invalid response payload");
  }
  const rating = mapConversationRating(payload.rating);
  const summary = mapConversationRatingSummary(payload.summary);
  return { rating, summary };
}
function mapConversationRating(payload) {
  const ratingId = asString2(payload.rating_id);
  const conversationId = asString2(payload.conversation_id);
  const rating = asString2(payload.rating);
  const createdAt = asString2(payload.created_at);
  if (ratingId === void 0 || conversationId === void 0 || rating === void 0 || createdAt === void 0) {
    throw new Error("sigil conversation rating transport failed: invalid rating payload");
  }
  return {
    ratingId,
    conversationId,
    generationId: asString2(payload.generation_id),
    rating,
    comment: asString2(payload.comment),
    metadata: asRecordUnknown(payload.metadata),
    raterId: asString2(payload.rater_id),
    source: asString2(payload.source),
    createdAt
  };
}
function mapConversationRatingSummary(payload) {
  const totalCount = asNumber(payload.total_count);
  const goodCount = asNumber(payload.good_count);
  const badCount = asNumber(payload.bad_count);
  const latestRatedAt = asString2(payload.latest_rated_at);
  const hasBadRating = asBoolean(payload.has_bad_rating);
  if (totalCount === void 0 || goodCount === void 0 || badCount === void 0 || latestRatedAt === void 0 || hasBadRating === void 0) {
    throw new Error("sigil conversation rating transport failed: invalid rating summary payload");
  }
  return {
    totalCount,
    goodCount,
    badCount,
    latestRating: asString2(payload.latest_rating),
    latestRatedAt,
    latestBadAt: asString2(payload.latest_bad_at),
    hasBadRating
  };
}
function asString2(value) {
  return typeof value === "string" ? value : void 0;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asBoolean(value) {
  return typeof value === "boolean" ? value : void 0;
}
function asRecordUnknown(value) {
  return isObject2(value) ? value : void 0;
}
function isObject2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ratingErrorText(responseText, status) {
  if (responseText.length > 0) {
    return responseText;
  }
  return `HTTP ${status}`;
}
function captureEmbeddingInputTexts(inputTexts, maxInputItems, maxTextLength) {
  if (inputTexts.length === 0) {
    return [];
  }
  const itemLimit = maxInputItems > 0 ? maxInputItems : 20;
  const textLimit = maxTextLength > 0 ? maxTextLength : 1024;
  const output = [];
  const end = Math.min(itemLimit, inputTexts.length);
  for (let index = 0; index < end; index++) {
    output.push(truncateEmbeddingText(inputTexts[index] ?? "", textLimit));
  }
  return output;
}
function truncateEmbeddingText(text, maxTextLength) {
  if (text.length <= maxTextLength) {
    return text;
  }
  if (maxTextLength <= 3) {
    return text.slice(0, maxTextLength);
  }
  return `${text.slice(0, maxTextLength - 3)}...`;
}
function thinkingBudgetFromMetadata(metadata) {
  if (metadata === void 0) {
    return void 0;
  }
  const raw = metadata[spanAttrRequestThinkingBudget];
  if (raw === void 0 || raw === null || typeof raw === "boolean") {
    return void 0;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
      return void 0;
    }
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return void 0;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return void 0;
    }
    return parsed;
  }
  return void 0;
}
function metadataStringValue(metadata, key) {
  if (metadata === void 0) {
    return void 0;
  }
  const value = metadata[key];
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function metadataIntValue(metadata, key) {
  if (metadata === void 0) {
    return void 0;
  }
  const value = metadata[key];
  if (value === void 0 || value === null || typeof value === "boolean") {
    return void 0;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return void 0;
    }
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return void 0;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return void 0;
    }
    return parsed;
  }
  return void 0;
}
function firstNonEmptyString(...values) {
  for (const value of values) {
    if (notEmpty(value)) {
      return value;
    }
  }
  return void 0;
}
function mergeStringRecords(left, right) {
  if (left === void 0 && right === void 0) {
    return void 0;
  }
  return {
    ...left ?? {},
    ...right ?? {}
  };
}
function mergeUnknownRecords(left, right) {
  if (left === void 0 && right === void 0) {
    return void 0;
  }
  return {
    ...left ?? {},
    ...right ?? {}
  };
}
function countToolCallParts(messages2) {
  let total = 0;
  for (const message of messages2) {
    if (message.parts === void 0) {
      continue;
    }
    for (const part of message.parts) {
      if (part.type === "tool_call") {
        total += 1;
      }
    }
  }
  return total;
}
function errorCategoryFromError(error, fallbackSDK) {
  if (error === void 0 || error === null) {
    return fallbackSDK ? "sdk_error" : "";
  }
  if (typeof error === "string") {
    return classifyErrorCategory(extractStatusCodeFromError(error), error, fallbackSDK);
  }
  const typed = error;
  const statusCode = extractStatusCodeFromObject(typed) ?? extractStatusCodeFromError(asError(error).message);
  const message = asError(error).message;
  return classifyErrorCategory(statusCode, message, fallbackSDK);
}
function classifyErrorCategory(statusCode, message, fallbackSDK) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("timeout") || lowerMessage.includes("deadline exceeded")) {
    return "timeout";
  }
  if (statusCode === 429) {
    return "rate_limit";
  }
  if (statusCode === 401 || statusCode === 403) {
    return "auth_error";
  }
  if (statusCode === 408) {
    return "timeout";
  }
  if (statusCode !== void 0 && statusCode >= 500 && statusCode <= 599) {
    return "server_error";
  }
  if (statusCode !== void 0 && statusCode >= 400 && statusCode <= 499) {
    return "client_error";
  }
  return fallbackSDK ? "sdk_error" : "";
}
function extractStatusCodeFromObject(error) {
  const direct = asStatusCode(error.status) ?? asStatusCode(error.statusCode);
  if (direct !== void 0) {
    return direct;
  }
  if (isRecord2(error.response)) {
    return asStatusCode(error.response.status) ?? asStatusCode(error.response.statusCode);
  }
  if (isRecord2(error.error)) {
    return asStatusCode(error.error.status) ?? asStatusCode(error.error.statusCode);
  }
  return void 0;
}
function extractStatusCodeFromError(message) {
  const matches = message.match(/\b([1-5]\d\d)\b/g);
  if (matches === null) {
    return void 0;
  }
  for (const match of matches) {
    const parsed = Number.parseInt(match, 10);
    if (!Number.isNaN(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
  }
  return void 0;
}
function asStatusCode(value) {
  if (typeof value !== "number") {
    return void 0;
  }
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    return void 0;
  }
  return value;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJSON(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
function notEmpty(value) {
  return value !== void 0 && value.trim().length > 0;
}

// ../sigil-sdk/js/dist/providers/openai.js
var openai_exports = {};
__export(openai_exports, {
  chat: () => chat,
  embeddings: () => embeddings,
  responses: () => responses
});
var thinkingBudgetMetadataKey = "sigil.gen_ai.request.thinking.budget_tokens";
async function chatCompletionsCreate(client, request, providerCall, options = {}) {
  const requestMessages = mapChatRequestMessages(request);
  const mappedTools = mapChatTools(request);
  const maxTokens = readIntFromAny(request.max_completion_tokens) ?? readIntFromAny(request.max_tokens);
  const temperature = readNumberFromAny(request.temperature);
  const topP = readNumberFromAny(request.top_p);
  const toolChoice = canonicalToolChoice(request.tool_choice);
  const thinkingBudget = openAIThinkingBudget(request.reasoning);
  return client.startGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "openai",
      name: String(request.model ?? "")
    },
    systemPrompt: requestMessages.systemPrompt,
    maxTokens,
    temperature,
    topP,
    toolChoice,
    thinkingEnabled: hasValue(request.reasoning) ? true : void 0,
    tools: mappedTools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget(options.metadata, thinkingBudget)
  }, async (recorder) => {
    const response = await providerCall(request);
    recorder.setResult(chatCompletionsFromRequestResponse(request, response, options));
    return response;
  });
}
async function chatCompletionsStream(client, request, providerCall, options = {}) {
  const requestMessages = mapChatRequestMessages(request);
  const mappedTools = mapChatTools(request);
  const maxTokens = readIntFromAny(request.max_completion_tokens) ?? readIntFromAny(request.max_tokens);
  const temperature = readNumberFromAny(request.temperature);
  const topP = readNumberFromAny(request.top_p);
  const toolChoice = canonicalToolChoice(request.tool_choice);
  const thinkingBudget = openAIThinkingBudget(request.reasoning);
  return client.startStreamingGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "openai",
      name: String(request.model ?? "")
    },
    systemPrompt: requestMessages.systemPrompt,
    maxTokens,
    temperature,
    topP,
    toolChoice,
    thinkingEnabled: hasValue(request.reasoning) ? true : void 0,
    tools: mappedTools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget(options.metadata, thinkingBudget)
  }, async (recorder) => {
    const summary = await providerCall(request);
    const firstChunkAt = asDate(summary.firstChunkAt);
    if (firstChunkAt !== void 0) {
      recorder.setFirstTokenAt(firstChunkAt);
    }
    recorder.setResult(chatCompletionsFromStream(request, summary, options));
    return summary;
  });
}
function chatCompletionsFromRequestResponse(request, response, options = {}) {
  const requestMessages = mapChatRequestMessages(request);
  const mappedTools = mapChatTools(request);
  const maxTokens = readIntFromAny(request.max_completion_tokens) ?? readIntFromAny(request.max_tokens);
  const temperature = readNumberFromAny(request.temperature);
  const topP = readNumberFromAny(request.top_p);
  const toolChoice = canonicalToolChoice(request.tool_choice);
  const thinkingBudget = openAIThinkingBudget(request.reasoning);
  const result = {
    responseId: response.id,
    responseModel: response.model ?? String(request.model ?? ""),
    maxTokens,
    temperature,
    topP,
    toolChoice,
    thinkingEnabled: hasValue(request.reasoning) ? true : void 0,
    input: requestMessages.input,
    output: mapChatResponseOutput(response),
    tools: mappedTools,
    usage: mapChatUsage(response.usage),
    stopReason: normalizeChatStopReason(firstFinishReason(response)),
    metadata: metadataWithThinkingBudget(options.metadata, thinkingBudget),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    result.artifacts = [
      jsonArtifact("request", "openai.chat.request", request),
      jsonArtifact("response", "openai.chat.response", response)
    ];
    if (mappedTools.length > 0) {
      result.artifacts.push(jsonArtifact("tools", "openai.chat.tools", mappedTools));
    }
  }
  return result;
}
function chatCompletionsFromStream(request, summary, options = {}) {
  const requestMessages = mapChatRequestMessages(request);
  const mappedTools = mapChatTools(request);
  const maxTokens = readIntFromAny(request.max_completion_tokens) ?? readIntFromAny(request.max_tokens);
  const temperature = readNumberFromAny(request.temperature);
  const topP = readNumberFromAny(request.top_p);
  const toolChoice = canonicalToolChoice(request.tool_choice);
  const thinkingBudget = openAIThinkingBudget(request.reasoning);
  const outputText = summary.outputText ?? extractChatStreamText(summary.events ?? []);
  const fallbackOutput = outputText.length > 0 ? [{ role: "assistant", content: outputText }] : [];
  const result = summary.finalResponse ? {
    ...chatCompletionsFromRequestResponse(request, summary.finalResponse, options),
    output: mapChatResponseOutput(summary.finalResponse).length > 0 ? mapChatResponseOutput(summary.finalResponse) : fallbackOutput
  } : {
    responseModel: String(request.model ?? ""),
    maxTokens,
    temperature,
    topP,
    toolChoice,
    thinkingEnabled: hasValue(request.reasoning) ? true : void 0,
    input: requestMessages.input,
    output: fallbackOutput,
    tools: mappedTools,
    metadata: metadataWithThinkingBudget(options.metadata, thinkingBudget),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    const existing = result.artifacts ?? [];
    if (!existing.some((artifact) => artifact.type === "request")) {
      existing.push(jsonArtifact("request", "openai.chat.request", request));
    }
    if (mappedTools.length > 0 && !existing.some((artifact) => artifact.type === "tools")) {
      existing.push(jsonArtifact("tools", "openai.chat.tools", mappedTools));
    }
    existing.push(jsonArtifact("provider_event", "openai.chat.stream_events", summary.events ?? []));
    result.artifacts = existing;
  }
  return result;
}
async function responsesCreate(client, request, providerCall, options = {}) {
  const requestPayload = mapResponsesRequest(request);
  const controls = mapResponsesRequestControls(request);
  return client.startGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "openai",
      name: String(request.model ?? "")
    },
    systemPrompt: requestPayload.systemPrompt,
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    tools: requestPayload.tools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget)
  }, async (recorder) => {
    const response = await providerCall(request);
    recorder.setResult(responsesFromRequestResponse(request, response, options));
    return response;
  });
}
async function responsesStream(client, request, providerCall, options = {}) {
  const requestPayload = mapResponsesRequest(request);
  const controls = mapResponsesRequestControls(request);
  return client.startStreamingGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "openai",
      name: String(request.model ?? "")
    },
    systemPrompt: requestPayload.systemPrompt,
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    tools: requestPayload.tools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget)
  }, async (recorder) => {
    const summary = await providerCall(request);
    const firstChunkAt = asDate(summary.firstChunkAt);
    if (firstChunkAt !== void 0) {
      recorder.setFirstTokenAt(firstChunkAt);
    }
    recorder.setResult(responsesFromStream(request, summary, options));
    return summary;
  });
}
function responsesFromRequestResponse(request, response, options = {}) {
  const requestPayload = mapResponsesRequest(request);
  const controls = mapResponsesRequestControls(request);
  const result = {
    responseId: response.id,
    responseModel: response.model ?? String(request.model ?? ""),
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    input: requestPayload.input,
    output: mapResponsesOutputItems(response.output),
    tools: requestPayload.tools,
    usage: mapResponsesUsage(response.usage),
    stopReason: normalizeResponsesStopReason(response),
    metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    result.artifacts = [
      jsonArtifact("request", "openai.responses.request", request),
      jsonArtifact("response", "openai.responses.response", response)
    ];
    if (requestPayload.tools.length > 0) {
      result.artifacts.push(jsonArtifact("tools", "openai.responses.tools", requestPayload.tools));
    }
  }
  return result;
}
function responsesFromStream(request, summary, options = {}) {
  const requestPayload = mapResponsesRequest(request);
  const controls = mapResponsesRequestControls(request);
  const events = summary.events ?? [];
  const finalFromEvents = findResponsesFinalFromEvents(events);
  const finalResponse = summary.finalResponse ?? finalFromEvents;
  const outputText = summary.outputText ?? extractResponsesStreamText(events);
  const result = finalResponse ? {
    ...responsesFromRequestResponse(request, finalResponse, options),
    output: mapResponsesOutputItems(finalResponse.output).length > 0 ? mapResponsesOutputItems(finalResponse.output) : outputText.length > 0 ? [{ role: "assistant", content: outputText }] : []
  } : {
    responseModel: String(request.model ?? ""),
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    input: requestPayload.input,
    output: outputText.length > 0 ? [{ role: "assistant", content: outputText }] : [],
    tools: requestPayload.tools,
    stopReason: normalizeResponsesStopReasonFromEvents(events),
    metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    const existing = result.artifacts ?? [];
    if (!existing.some((artifact) => artifact.type === "request")) {
      existing.push(jsonArtifact("request", "openai.responses.request", request));
    }
    if (requestPayload.tools.length > 0 && !existing.some((artifact) => artifact.type === "tools")) {
      existing.push(jsonArtifact("tools", "openai.responses.tools", requestPayload.tools));
    }
    existing.push(jsonArtifact("provider_event", "openai.responses.stream_events", events));
    result.artifacts = existing;
  }
  return result;
}
async function embeddingsCreate(client, request, providerCall, options = {}) {
  const dimensions = readIntFromAny(request.dimensions);
  const rawEncodingFormat = request.encoding_format;
  const encodingFormat = typeof rawEncodingFormat === "string" ? rawEncodingFormat.trim() : "";
  return client.startEmbedding({
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "openai",
      name: String(request.model ?? "")
    },
    dimensions,
    encodingFormat: encodingFormat.length > 0 ? encodingFormat : void 0,
    tags: options.tags,
    metadata: options.metadata
  }, async (recorder) => {
    const response = await providerCall(request);
    recorder.setResult(embeddingsFromRequestResponse(request, response));
    return response;
  });
}
function embeddingsFromRequestResponse(request, response) {
  const input = request.input;
  const result = {
    inputCount: embeddingInputCount(input),
    inputTexts: embeddingInputTexts(input)
  };
  if (!isRecord3(response)) {
    return result;
  }
  const usage = isRecord3(response.usage) ? response.usage : void 0;
  result.inputTokens = readIntFromAny(usage?.prompt_tokens) ?? readIntFromAny(usage?.total_tokens);
  result.responseModel = typeof response.model === "string" ? response.model : void 0;
  const data = Array.isArray(response.data) ? response.data : [];
  if (data.length > 0 && isRecord3(data[0]) && Array.isArray(data[0].embedding)) {
    result.dimensions = data[0].embedding.length;
  }
  return result;
}
var chat = {
  completions: {
    create: chatCompletionsCreate,
    stream: chatCompletionsStream,
    fromRequestResponse: chatCompletionsFromRequestResponse,
    fromStream: chatCompletionsFromStream
  }
};
var responses = {
  create: responsesCreate,
  stream: responsesStream,
  fromRequestResponse: responsesFromRequestResponse,
  fromStream: responsesFromStream
};
var embeddings = {
  create: embeddingsCreate,
  fromRequestResponse: embeddingsFromRequestResponse
};
function mapChatRequestMessages(request) {
  const source = Array.isArray(request.messages) ? request.messages : [];
  const systemChunks = [];
  const input = [];
  for (const rawMessage of source) {
    if (!isRecord3(rawMessage)) {
      continue;
    }
    const role = String(rawMessage.role ?? "").trim().toLowerCase();
    const content = extractText(rawMessage.content);
    if (role === "system" || role === "developer") {
      if (content.length > 0) {
        systemChunks.push(content);
      }
      continue;
    }
    const normalizedRole = role === "assistant" || role === "tool" ? role : "user";
    const message = { role: normalizedRole };
    if (normalizedRole !== "tool" && content.length > 0) {
      message.content = content;
    }
    if (typeof rawMessage.name === "string" && rawMessage.name.trim().length > 0) {
      message.name = rawMessage.name;
    }
    if (normalizedRole === "tool") {
      const toolResult = mapToolResultMessage(rawMessage.content, rawMessage.tool_call_id ?? rawMessage.toolCallId ?? rawMessage.id, rawMessage.name, rawMessage.is_error, "tool_result");
      if (toolResult) {
        input.push(toolResult);
      }
      continue;
    }
    if (normalizedRole === "assistant" && Array.isArray(rawMessage.tool_calls)) {
      const parts = mapChatToolCallParts(rawMessage.tool_calls);
      if (parts.length > 0) {
        message.parts = message.parts ? [...message.parts, ...parts] : parts;
      }
    }
    input.push(message);
  }
  return {
    input,
    systemPrompt: systemChunks.length > 0 ? systemChunks.join("\n\n") : void 0
  };
}
function mapChatResponseOutput(response) {
  const choice = response.choices?.[0];
  if (!choice) {
    return [];
  }
  const messageRecord = isRecord3(choice.message) ? choice.message : void 0;
  if (!messageRecord) {
    return [];
  }
  const textChunks = [];
  const rawContent = messageRecord.content;
  const contentText = extractText(rawContent);
  if (contentText.length > 0) {
    textChunks.push(contentText);
  }
  if (typeof messageRecord.refusal === "string" && messageRecord.refusal.trim().length > 0) {
    textChunks.push(messageRecord.refusal.trim());
  }
  const parts = mapChatToolCallParts(messageRecord.tool_calls);
  if (textChunks.length === 0 && parts.length === 0) {
    return [];
  }
  const output = {
    role: "assistant"
  };
  if (textChunks.length > 0) {
    output.content = textChunks.join("\n");
  }
  if (parts.length > 0) {
    output.parts = parts;
    if (!output.content) {
      output.content = parts.map((part) => part.type === "tool_call" ? `${part.toolCall.name}(${part.toolCall.inputJSON ?? ""})` : "").filter((chunk) => chunk.length > 0).join("\n");
    }
  }
  return [output];
}
function mapChatToolCallParts(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const parts = [];
  for (const rawToolCall of value) {
    if (!isRecord3(rawToolCall)) {
      continue;
    }
    const functionCall = isRecord3(rawToolCall.function) ? rawToolCall.function : void 0;
    if (!functionCall) {
      continue;
    }
    const name = typeof functionCall.name === "string" ? functionCall.name : "";
    if (name.trim().length === 0) {
      continue;
    }
    const input = typeof functionCall.arguments === "string" ? functionCall.arguments : jsonString(functionCall.arguments);
    parts.push({
      type: "tool_call",
      toolCall: {
        id: typeof rawToolCall.id === "string" ? rawToolCall.id : void 0,
        name,
        inputJSON: input
      },
      metadata: { providerType: "tool_call" }
    });
  }
  return parts;
}
function mapChatTools(request) {
  const value = request.tools;
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  for (const rawTool of value) {
    if (!isRecord3(rawTool)) {
      continue;
    }
    const rawType = typeof rawTool.type === "string" ? rawTool.type : "";
    if (rawType === "function" && isRecord3(rawTool.function)) {
      const name = typeof rawTool.function.name === "string" ? rawTool.function.name : "";
      if (name.trim().length === 0) {
        continue;
      }
      out.push({
        name,
        description: typeof rawTool.function.description === "string" ? rawTool.function.description : void 0,
        type: "function",
        inputSchemaJSON: hasValue(rawTool.function.parameters) ? jsonString(rawTool.function.parameters) : void 0
      });
      continue;
    }
    if (rawType.length > 0 && typeof rawTool.name === "string" && rawTool.name.trim().length > 0) {
      out.push({
        name: rawTool.name,
        type: rawType
      });
    }
  }
  return out;
}
function mapChatUsage(usage) {
  if (!isRecord3(usage)) {
    return void 0;
  }
  const inputTokens = readIntFromAny(usage.prompt_tokens);
  const outputTokens = readIntFromAny(usage.completion_tokens);
  const totalTokens = readIntFromAny(usage.total_tokens);
  const cacheReadInputTokens = isRecord3(usage.prompt_tokens_details) ? readIntFromAny(usage.prompt_tokens_details.cached_tokens) : void 0;
  const reasoningTokens = isRecord3(usage.completion_tokens_details) ? readIntFromAny(usage.completion_tokens_details.reasoning_tokens) : void 0;
  const out = {};
  if (inputTokens !== void 0) {
    out.inputTokens = inputTokens;
  }
  if (outputTokens !== void 0) {
    out.outputTokens = outputTokens;
  }
  if (totalTokens !== void 0) {
    out.totalTokens = totalTokens;
  }
  if (cacheReadInputTokens !== void 0) {
    out.cacheReadInputTokens = cacheReadInputTokens;
  }
  if (reasoningTokens !== void 0) {
    out.reasoningTokens = reasoningTokens;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function firstFinishReason(response) {
  for (const choice of response.choices ?? []) {
    if (typeof choice.finish_reason === "string" && choice.finish_reason.trim().length > 0) {
      return choice.finish_reason;
    }
  }
  return void 0;
}
function normalizeChatStopReason(value) {
  if (!value) {
    return void 0;
  }
  return value;
}
function extractChatStreamText(events) {
  const chunks = [];
  for (const event of events) {
    for (const choice of event.choices ?? []) {
      if (typeof choice.delta?.content === "string" && choice.delta.content.length > 0) {
        chunks.push(choice.delta.content);
      }
    }
  }
  return chunks.join("");
}
function mapResponsesRequest(request) {
  const input = [];
  const systemChunks = [];
  const instructions = extractText(request.instructions);
  if (instructions.length > 0) {
    systemChunks.push(instructions);
  }
  const rawInput = request.input;
  if (typeof rawInput === "string") {
    input.push({
      role: "user",
      content: rawInput
    });
  } else if (Array.isArray(rawInput)) {
    for (const rawItem of rawInput) {
      if (!isRecord3(rawItem)) {
        continue;
      }
      const role = typeof rawItem.role === "string" ? rawItem.role.trim().toLowerCase() : "";
      const itemType = typeof rawItem.type === "string" ? rawItem.type.trim().toLowerCase() : "";
      if ((role === "system" || role === "developer") && itemType === "message") {
        const content = extractText(rawItem.content);
        if (content.length > 0) {
          systemChunks.push(content);
        }
        continue;
      }
      if (itemType === "function_call_output") {
        const toolResult = mapToolResultMessage(rawItem.output, rawItem.call_id ?? rawItem.callId, rawItem.name, rawItem.is_error, "tool_result");
        if (toolResult) {
          input.push(toolResult);
        }
        continue;
      }
      if (itemType === "message" || role.length > 0) {
        const content = extractText(rawItem.content);
        if (content.length === 0) {
          continue;
        }
        const mappedRole = role === "assistant" || role === "tool" ? role : "user";
        input.push({ role: mappedRole, content });
      }
    }
  }
  const tools = mapResponsesTools(request.tools);
  return {
    input,
    systemPrompt: systemChunks.length > 0 ? systemChunks.join("\n\n") : void 0,
    tools
  };
}
function mapResponsesRequestControls(request) {
  const maxTokens = readIntFromAny(request.max_output_tokens);
  const temperature = readNumberFromAny(request.temperature);
  const topP = readNumberFromAny(request.top_p);
  const toolChoice = canonicalToolChoice(request.tool_choice);
  const reasoning = request.reasoning;
  return {
    maxTokens,
    temperature,
    topP,
    toolChoice,
    thinkingEnabled: hasValue(reasoning) ? true : void 0,
    thinkingBudget: openAIThinkingBudget(reasoning)
  };
}
function mapResponsesTools(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const out = [];
  for (const rawTool of value) {
    if (!isRecord3(rawTool)) {
      continue;
    }
    const toolType = typeof rawTool.type === "string" ? rawTool.type : "";
    if (toolType === "function") {
      const name = typeof rawTool.name === "string" ? rawTool.name : "";
      if (name.trim().length === 0) {
        continue;
      }
      out.push({
        name,
        description: typeof rawTool.description === "string" ? rawTool.description : void 0,
        type: "function",
        inputSchemaJSON: hasValue(rawTool.parameters) ? jsonString(rawTool.parameters) : void 0
      });
      continue;
    }
    if (toolType.length > 0 && typeof rawTool.name === "string" && rawTool.name.trim().length > 0) {
      out.push({
        name: rawTool.name,
        type: toolType
      });
    }
  }
  return out;
}
function mapResponsesOutputItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const output = [];
  for (const rawItem of value) {
    if (!isRecord3(rawItem)) {
      continue;
    }
    const itemType = typeof rawItem.type === "string" ? rawItem.type : "";
    if (itemType === "message") {
      const content = extractText(rawItem.content);
      if (content.length > 0) {
        output.push({ role: "assistant", content });
      }
      continue;
    }
    if (itemType === "function_call") {
      const name = typeof rawItem.name === "string" ? rawItem.name : "";
      const args = typeof rawItem.arguments === "string" ? rawItem.arguments : jsonString(rawItem.arguments);
      if (name.trim().length > 0) {
        output.push({
          role: "assistant",
          content: `${name}(${args})`,
          parts: [
            {
              type: "tool_call",
              toolCall: {
                id: typeof rawItem.call_id === "string" ? rawItem.call_id : void 0,
                name,
                inputJSON: args
              },
              metadata: { providerType: "tool_call" }
            }
          ]
        });
      }
      continue;
    }
    if (itemType === "function_call_output") {
      const toolResult = mapToolResultMessage(rawItem.output, rawItem.call_id ?? rawItem.callId, rawItem.name, rawItem.is_error, "tool_result");
      if (toolResult) {
        output.push(toolResult);
      }
      continue;
    }
    if (itemType.length > 0) {
      const fallback = extractText(rawItem) || jsonString(rawItem);
      if (fallback.length > 0) {
        output.push({ role: "assistant", content: fallback });
      }
    }
  }
  return output;
}
function mapResponsesUsage(value) {
  if (!isRecord3(value)) {
    return void 0;
  }
  const inputTokens = readIntFromAny(value.input_tokens);
  const outputTokens = readIntFromAny(value.output_tokens);
  const totalTokens = readIntFromAny(value.total_tokens);
  const cacheReadInputTokens = isRecord3(value.input_tokens_details) ? readIntFromAny(value.input_tokens_details.cached_tokens) : void 0;
  const reasoningTokens = isRecord3(value.output_tokens_details) ? readIntFromAny(value.output_tokens_details.reasoning_tokens) : void 0;
  const out = {};
  if (inputTokens !== void 0) {
    out.inputTokens = inputTokens;
  }
  if (outputTokens !== void 0) {
    out.outputTokens = outputTokens;
  }
  if (totalTokens !== void 0) {
    out.totalTokens = totalTokens;
  }
  if (cacheReadInputTokens !== void 0) {
    out.cacheReadInputTokens = cacheReadInputTokens;
  }
  if (reasoningTokens !== void 0) {
    out.reasoningTokens = reasoningTokens;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function normalizeResponsesStopReason(response) {
  const status = typeof response.status === "string" ? response.status.trim().toLowerCase() : "";
  const incomplete = isRecord3(response.incomplete_details) ? String(response.incomplete_details.reason ?? "").trim().toLowerCase() : "";
  if (status === "incomplete" && incomplete.length > 0) {
    return incomplete;
  }
  if (status === "completed") {
    return "stop";
  }
  return status.length > 0 ? status : void 0;
}
function normalizeResponsesStopReasonFromEvents(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    const eventType = typeof event.type === "string" ? event.type : "";
    const response = isRecord3(event.response) ? event.response : void 0;
    if (eventType === "response.incomplete" && response && isRecord3(response.incomplete_details)) {
      const reason = String(response.incomplete_details.reason ?? "").trim().toLowerCase();
      if (reason.length > 0) {
        return reason;
      }
    }
    if (eventType === "response.completed") {
      return "stop";
    }
    if (eventType === "response.failed") {
      return "failed";
    }
    if (eventType === "response.cancelled") {
      return "cancelled";
    }
  }
  return void 0;
}
function extractResponsesStreamText(events) {
  const chunks = [];
  for (const event of events) {
    const record = event;
    const type = typeof record.type === "string" ? record.type : "";
    if (type === "response.output_text.delta" && typeof record.delta === "string") {
      chunks.push(record.delta);
      continue;
    }
    if (type === "response.output_text.done" && typeof record.text === "string" && chunks.length === 0) {
      chunks.push(record.text);
      continue;
    }
    if (type === "response.refusal.delta" && typeof record.delta === "string") {
      chunks.push(record.delta);
    }
  }
  return chunks.join("");
}
function findResponsesFinalFromEvents(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if ((event.type === "response.completed" || event.type === "response.incomplete") && isRecord3(event.response)) {
      return event.response;
    }
  }
  return void 0;
}
function extractText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const chunks = [];
    for (const item of value) {
      if (typeof item === "string") {
        if (item.trim().length > 0) {
          chunks.push(item.trim());
        }
        continue;
      }
      if (!isRecord3(item)) {
        continue;
      }
      const itemType = typeof item.type === "string" ? item.type : "";
      if ((itemType === "text" || itemType === "input_text" || itemType === "output_text") && typeof item.text === "string") {
        if (item.text.trim().length > 0) {
          chunks.push(item.text.trim());
        }
        continue;
      }
      if (itemType === "refusal" && typeof item.refusal === "string") {
        if (item.refusal.trim().length > 0) {
          chunks.push(item.refusal.trim());
        }
        continue;
      }
      if (typeof item.content === "string" && item.content.trim().length > 0) {
        chunks.push(item.content.trim());
      }
    }
    return chunks.join("\n");
  }
  if (isRecord3(value)) {
    if (typeof value.text === "string" && value.text.trim().length > 0) {
      return value.text.trim();
    }
    if (typeof value.content === "string" && value.content.trim().length > 0) {
      return value.content.trim();
    }
    if (typeof value.refusal === "string" && value.refusal.trim().length > 0) {
      return value.refusal.trim();
    }
  }
  return "";
}
function embeddingInputCount(input) {
  if (typeof input === "string") {
    return 1;
  }
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return 0;
    }
    if (input.every((item) => typeof item === "number" && Number.isFinite(item))) {
      return 1;
    }
    return input.length;
  }
  if (isRecord3(input)) {
    return 1;
  }
  return 0;
}
function embeddingInputTexts(input) {
  if (typeof input === "string") {
    const text = input.trim();
    return text.length > 0 ? [text] : void 0;
  }
  if (Array.isArray(input)) {
    const output = [];
    for (const item of input) {
      if (typeof item === "string") {
        const text = item.trim();
        if (text.length > 0) {
          output.push(text);
        }
        continue;
      }
      if (isRecord3(item) && typeof item.text === "string" && item.text.trim().length > 0) {
        output.push(item.text.trim());
      }
    }
    return output.length > 0 ? output : void 0;
  }
  if (isRecord3(input) && typeof input.text === "string" && input.text.trim().length > 0) {
    return [input.text.trim()];
  }
  return void 0;
}
function readIntFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    return Number.isNaN(asInt) ? void 0 : asInt;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function readNumberFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function openAIThinkingBudget(reasoning) {
  if (!isRecord3(reasoning)) {
    return void 0;
  }
  for (const key of ["budget_tokens", "thinking_budget", "thinkingBudget", "max_output_tokens"]) {
    const value = readIntFromAny(reasoning[key]);
    if (value !== void 0) {
      return value;
    }
  }
  return void 0;
}
function mapToolResultMessage(value, toolCallId, name, isError, providerType) {
  const content = extractText(value);
  const contentJSON = jsonString(value);
  const renderedContent = content.length > 0 ? content : contentJSON;
  if (renderedContent.length === 0) {
    return void 0;
  }
  return {
    role: "tool",
    content: renderedContent,
    parts: [
      {
        type: "tool_result",
        toolResult: {
          toolCallId: typeof toolCallId === "string" && toolCallId.trim().length > 0 ? toolCallId : void 0,
          name: typeof name === "string" && name.trim().length > 0 ? name : void 0,
          content: renderedContent,
          contentJSON,
          isError: typeof isError === "boolean" ? isError : void 0
        },
        metadata: { providerType }
      }
    ]
  };
}
function metadataWithThinkingBudget(metadata, thinkingBudget) {
  if (thinkingBudget === void 0) {
    return metadata ? { ...metadata } : void 0;
  }
  const out = metadata ? { ...metadata } : {};
  out[thinkingBudgetMetadataKey] = thinkingBudget;
  return out;
}
function canonicalToolChoice(value) {
  if (!hasValue(value)) {
    return void 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  if (isRecord3(value) && "value" in value) {
    const normalized = String(value.value ?? "").trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  const encoded = jsonString(value);
  return encoded.length > 0 ? encoded : void 0;
}
function jsonArtifact(type, name, payload) {
  return {
    type,
    name,
    payload: jsonString(payload),
    mimeType: "application/json"
  };
}
function jsonString(value) {
  try {
    return JSON.stringify(value, objectKeySorter);
  } catch {
    return String(value ?? "");
  }
}
function objectKeySorter(_key, value) {
  if (!isRecord3(value) || Array.isArray(value)) {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }
  return sorted;
}
function hasValue(value) {
  return value !== void 0 && value !== null;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function asDate(value) {
  if (value === void 0) {
    return void 0;
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return void 0;
  }
  return date;
}

// ../sigil-sdk/js/dist/providers/anthropic.js
var anthropic_exports = {};
__export(anthropic_exports, {
  messages: () => messages
});
var thinkingBudgetMetadataKey2 = "sigil.gen_ai.request.thinking.budget_tokens";
var usageServerToolUseWebSearchMetadataKey = "sigil.gen_ai.usage.server_tool_use.web_search_requests";
var usageServerToolUseWebFetchMetadataKey = "sigil.gen_ai.usage.server_tool_use.web_fetch_requests";
var usageServerToolUseTotalMetadataKey = "sigil.gen_ai.usage.server_tool_use.total_requests";
async function anthropicMessagesCreate(client, request, providerCall, options = {}) {
  const mappedRequest = mapAnthropicRequest(request);
  return client.startGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "anthropic",
      name: String(request.model ?? "")
    },
    systemPrompt: mappedRequest.systemPrompt,
    maxTokens: mappedRequest.maxTokens,
    temperature: mappedRequest.temperature,
    topP: mappedRequest.topP,
    toolChoice: mappedRequest.toolChoice,
    thinkingEnabled: mappedRequest.thinkingEnabled,
    tools: mappedRequest.tools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget2(options.metadata, mappedRequest.thinkingBudget)
  }, async (recorder) => {
    const response = await providerCall(request);
    recorder.setResult(anthropicMessagesFromRequestResponse(request, response, options));
    return response;
  });
}
async function anthropicMessagesStream(client, request, providerCall, options = {}) {
  const mappedRequest = mapAnthropicRequest(request);
  return client.startStreamingGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "anthropic",
      name: String(request.model ?? "")
    },
    systemPrompt: mappedRequest.systemPrompt,
    maxTokens: mappedRequest.maxTokens,
    temperature: mappedRequest.temperature,
    topP: mappedRequest.topP,
    toolChoice: mappedRequest.toolChoice,
    thinkingEnabled: mappedRequest.thinkingEnabled,
    tools: mappedRequest.tools,
    tags: options.tags,
    metadata: metadataWithThinkingBudget2(options.metadata, mappedRequest.thinkingBudget)
  }, async (recorder) => {
    const summary = await providerCall(request);
    const firstChunkAt = asDate2(summary.firstChunkAt);
    if (firstChunkAt !== void 0) {
      recorder.setFirstTokenAt(firstChunkAt);
    }
    recorder.setResult(anthropicMessagesFromStream(request, summary, options));
    return summary;
  });
}
function anthropicMessagesFromRequestResponse(request, response, options = {}) {
  const mappedRequest = mapAnthropicRequest(request);
  const output = mapAnthropicResponseOutput(response);
  const usageMetadata = anthropicUsageMetadata(response.usage);
  const result = {
    responseId: response.id,
    responseModel: response.model ?? String(request.model ?? ""),
    maxTokens: mappedRequest.maxTokens,
    temperature: mappedRequest.temperature,
    topP: mappedRequest.topP,
    toolChoice: mappedRequest.toolChoice,
    thinkingEnabled: mappedRequest.thinkingEnabled,
    input: mappedRequest.input,
    output,
    tools: mappedRequest.tools,
    usage: mapAnthropicUsage(response.usage),
    stopReason: normalizeStopReason(response.stop_reason),
    metadata: mergeMetadata(metadataWithThinkingBudget2(options.metadata, mappedRequest.thinkingBudget), usageMetadata),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    result.artifacts = [
      jsonArtifact2("request", "anthropic.messages.request", request),
      jsonArtifact2("response", "anthropic.messages.response", response)
    ];
    if (mappedRequest.tools.length > 0) {
      result.artifacts.push(jsonArtifact2("tools", "anthropic.messages.tools", mappedRequest.tools));
    }
  }
  return result;
}
function anthropicMessagesFromStream(request, summary, options = {}) {
  const mappedRequest = mapAnthropicRequest(request);
  const events = summary.events ?? [];
  const outputText = summary.outputText ?? extractAnthropicStreamText(events);
  const fallbackOutput = outputText.length > 0 ? [{ role: "assistant", content: outputText }] : [];
  const streamUsageMetadata = anthropicStreamUsageMetadata(events);
  const result = summary.finalResponse ? {
    ...anthropicMessagesFromRequestResponse(request, summary.finalResponse, options),
    output: mapAnthropicResponseOutput(summary.finalResponse).length > 0 ? mapAnthropicResponseOutput(summary.finalResponse) : fallbackOutput
  } : {
    responseModel: String(request.model ?? ""),
    maxTokens: mappedRequest.maxTokens,
    temperature: mappedRequest.temperature,
    topP: mappedRequest.topP,
    toolChoice: mappedRequest.toolChoice,
    thinkingEnabled: mappedRequest.thinkingEnabled,
    input: mappedRequest.input,
    output: fallbackOutput,
    tools: mappedRequest.tools,
    metadata: mergeMetadata(metadataWithThinkingBudget2(options.metadata, mappedRequest.thinkingBudget), streamUsageMetadata),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    const existing = result.artifacts ?? [];
    if (!existing.some((artifact) => artifact.type === "request")) {
      existing.push(jsonArtifact2("request", "anthropic.messages.request", request));
    }
    if (mappedRequest.tools.length > 0 && !existing.some((artifact) => artifact.type === "tools")) {
      existing.push(jsonArtifact2("tools", "anthropic.messages.tools", mappedRequest.tools));
    }
    existing.push(jsonArtifact2("provider_event", "anthropic.messages.stream_events", events));
    result.artifacts = existing;
  }
  return result;
}
var messages = {
  create: anthropicMessagesCreate,
  stream: anthropicMessagesStream,
  fromRequestResponse: anthropicMessagesFromRequestResponse,
  fromStream: anthropicMessagesFromStream
};
function mapAnthropicRequest(request) {
  const input = [];
  const rawMessages = Array.isArray(request.messages) ? request.messages : [];
  for (const rawMessage of rawMessages) {
    if (!isRecord4(rawMessage)) {
      continue;
    }
    const roleRaw = typeof rawMessage.role === "string" ? rawMessage.role.toLowerCase() : "";
    const mappedRole = roleRaw === "assistant" || roleRaw === "tool" ? roleRaw : "user";
    const contentParts = mapAnthropicContentParts(rawMessage.content, mappedRole);
    const contentText = extractText2(rawMessage.content);
    if (contentParts.length > 0) {
      const hasToolResult = contentParts.some((part) => part.type === "tool_result");
      input.push({
        role: hasToolResult ? "tool" : mappedRole,
        name: typeof rawMessage.name === "string" ? rawMessage.name : void 0,
        content: contentText || void 0,
        parts: contentParts
      });
      continue;
    }
    if (contentText.length > 0) {
      input.push({
        role: mappedRole,
        name: typeof rawMessage.name === "string" ? rawMessage.name : void 0,
        content: contentText
      });
    }
  }
  return {
    input,
    systemPrompt: extractAnthropicSystemPrompt(request.system),
    tools: mapAnthropicTools(request.tools),
    maxTokens: readIntFromAny2(request.max_tokens),
    temperature: readNumberFromAny2(request.temperature),
    topP: readNumberFromAny2(request.top_p),
    toolChoice: canonicalToolChoice2(request.tool_choice),
    thinkingEnabled: anthropicThinkingEnabled(request.thinking),
    thinkingBudget: anthropicThinkingBudget(request.thinking)
  };
}
function mapAnthropicContentParts(content, role) {
  if (!Array.isArray(content)) {
    return [];
  }
  const parts = [];
  for (const rawBlock of content) {
    if (!isRecord4(rawBlock)) {
      continue;
    }
    const blockType = typeof rawBlock.type === "string" ? rawBlock.type : "";
    if (blockType === "text" && typeof rawBlock.text === "string" && rawBlock.text.trim().length > 0) {
      parts.push({
        type: "text",
        text: rawBlock.text,
        metadata: { providerType: blockType }
      });
      continue;
    }
    if (blockType === "thinking" || blockType === "redacted_thinking") {
      const thinking = typeof rawBlock.thinking === "string" ? rawBlock.thinking : typeof rawBlock.data === "string" ? rawBlock.data : typeof rawBlock.text === "string" ? rawBlock.text : "";
      if (thinking.trim().length > 0) {
        parts.push({
          type: "thinking",
          thinking,
          metadata: { providerType: blockType }
        });
      }
      continue;
    }
    if (blockType === "tool_use" || blockType === "server_tool_use" || blockType === "mcp_tool_use") {
      const name = typeof rawBlock.name === "string" ? rawBlock.name : "";
      if (name.trim().length === 0) {
        continue;
      }
      parts.push({
        type: "tool_call",
        toolCall: {
          id: typeof rawBlock.id === "string" ? rawBlock.id : void 0,
          name,
          inputJSON: jsonString2(rawBlock.input)
        },
        metadata: { providerType: blockType }
      });
      continue;
    }
    if (blockType === "tool_result" || role === "tool") {
      const contentValue = extractText2(rawBlock.content);
      parts.push({
        type: "tool_result",
        toolResult: {
          toolCallId: typeof rawBlock.tool_use_id === "string" ? rawBlock.tool_use_id : typeof rawBlock.tool_call_id === "string" ? rawBlock.tool_call_id : void 0,
          name: typeof rawBlock.name === "string" ? rawBlock.name : void 0,
          content: contentValue || void 0,
          contentJSON: jsonString2(rawBlock.content),
          isError: typeof rawBlock.is_error === "boolean" ? rawBlock.is_error : void 0
        },
        metadata: { providerType: blockType || "tool_result" }
      });
    }
  }
  return parts;
}
function mapAnthropicResponseOutput(response) {
  const content = response.content;
  const parts = mapAnthropicContentParts(content, "assistant");
  const text = extractText2(content);
  if (parts.length === 0 && text.length === 0) {
    return [];
  }
  return [
    {
      role: "assistant",
      content: text || void 0,
      parts: parts.length > 0 ? parts : void 0
    }
  ];
}
function mapAnthropicTools(rawTools) {
  if (!Array.isArray(rawTools)) {
    return [];
  }
  const out = [];
  for (const rawTool of rawTools) {
    if (!isRecord4(rawTool)) {
      continue;
    }
    const name = typeof rawTool.name === "string" ? rawTool.name : "";
    if (name.trim().length === 0) {
      continue;
    }
    out.push({
      name,
      description: typeof rawTool.description === "string" ? rawTool.description : void 0,
      type: typeof rawTool.type === "string" ? rawTool.type : "function",
      inputSchemaJSON: hasValue2(rawTool.input_schema) ? jsonString2(rawTool.input_schema) : void 0
    });
  }
  return out;
}
function mapAnthropicUsage(rawUsage) {
  if (!isRecord4(rawUsage)) {
    return void 0;
  }
  const inputTokens = readIntFromAny2(rawUsage.input_tokens);
  const outputTokens = readIntFromAny2(rawUsage.output_tokens);
  const totalTokens = readIntFromAny2(rawUsage.total_tokens);
  const cacheReadInputTokens = readIntFromAny2(rawUsage.cache_read_input_tokens);
  const cacheCreationInputTokens = readIntFromAny2(rawUsage.cache_creation_input_tokens);
  const out = {};
  if (inputTokens !== void 0) {
    out.inputTokens = inputTokens;
  }
  if (outputTokens !== void 0) {
    out.outputTokens = outputTokens;
  }
  if (totalTokens !== void 0) {
    out.totalTokens = totalTokens;
  } else if (inputTokens !== void 0 || outputTokens !== void 0) {
    out.totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0);
  }
  if (cacheReadInputTokens !== void 0) {
    out.cacheReadInputTokens = cacheReadInputTokens;
  }
  if (cacheCreationInputTokens !== void 0) {
    out.cacheCreationInputTokens = cacheCreationInputTokens;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function anthropicUsageMetadata(rawUsage) {
  if (!isRecord4(rawUsage)) {
    return void 0;
  }
  const serverToolUse = isRecord4(rawUsage.server_tool_use) ? rawUsage.server_tool_use : isRecord4(rawUsage.serverToolUse) ? rawUsage.serverToolUse : void 0;
  if (serverToolUse === void 0) {
    return void 0;
  }
  const webSearchRequests = readIntFromAny2(serverToolUse.web_search_requests ?? serverToolUse.webSearchRequests);
  const webFetchRequests = readIntFromAny2(serverToolUse.web_fetch_requests ?? serverToolUse.webFetchRequests);
  const totalRequests = (webSearchRequests ?? 0) + (webFetchRequests ?? 0);
  if (totalRequests === 0) {
    return void 0;
  }
  const out = {};
  if (webSearchRequests !== void 0 && webSearchRequests > 0) {
    out[usageServerToolUseWebSearchMetadataKey] = webSearchRequests;
  }
  if (webFetchRequests !== void 0 && webFetchRequests > 0) {
    out[usageServerToolUseWebFetchMetadataKey] = webFetchRequests;
  }
  out[usageServerToolUseTotalMetadataKey] = totalRequests;
  return out;
}
function extractAnthropicSystemPrompt(system) {
  if (!hasValue2(system)) {
    return void 0;
  }
  if (typeof system === "string") {
    const normalized = system.trim();
    return normalized.length > 0 ? normalized : void 0;
  }
  if (Array.isArray(system)) {
    const chunks = [];
    for (const block of system) {
      if (!isRecord4(block)) {
        continue;
      }
      if (typeof block.text === "string" && block.text.trim().length > 0) {
        chunks.push(block.text.trim());
      }
    }
    if (chunks.length > 0) {
      return chunks.join("\n");
    }
  }
  const fallback = extractText2(system);
  return fallback.length > 0 ? fallback : void 0;
}
function normalizeStopReason(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : void 0;
}
function extractAnthropicStreamText(events) {
  const chunks = [];
  for (const event of events) {
    const type = typeof event.type === "string" ? event.type : "";
    if (type === "content_block_delta" && isRecord4(event.delta)) {
      const deltaType = typeof event.delta.type === "string" ? event.delta.type : "";
      if (deltaType === "text_delta" && typeof event.delta.text === "string" && event.delta.text.length > 0) {
        chunks.push(event.delta.text);
        continue;
      }
      if (typeof event.delta.text === "string" && event.delta.text.length > 0) {
        chunks.push(event.delta.text);
        continue;
      }
    }
    const fallback = extractText2(event);
    if (fallback.length > 0) {
      chunks.push(fallback);
    }
  }
  return chunks.join("");
}
function anthropicStreamUsageMetadata(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event === void 0) {
      continue;
    }
    if ((typeof event.type === "string" ? event.type : "") !== "message_delta") {
      continue;
    }
    const metadata = anthropicUsageMetadata(event.usage);
    if (metadata !== void 0) {
      return metadata;
    }
  }
  return void 0;
}
function anthropicThinkingEnabled(value) {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "enabled" || normalized === "adaptive") {
      return true;
    }
    if (normalized === "disabled") {
      return false;
    }
    return void 0;
  }
  if (isRecord4(value)) {
    if (typeof value.enabled === "boolean") {
      return value.enabled;
    }
    const mode = String(value.type ?? value.mode ?? "").trim().toLowerCase();
    if (mode === "enabled" || mode === "adaptive") {
      return true;
    }
    if (mode === "disabled") {
      return false;
    }
    return void 0;
  }
  return void 0;
}
function anthropicThinkingBudget(value) {
  if (!isRecord4(value)) {
    return void 0;
  }
  return readIntFromAny2(value.budget_tokens);
}
function canonicalToolChoice2(value) {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  if (isRecord4(value) && "value" in value) {
    const normalized = String(value.value ?? "").trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  return jsonString2(value);
}
function extractText2(value) {
  if (!hasValue2(value)) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const chunks = [];
    for (const item of value) {
      const chunk = extractText2(item);
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }
    return chunks.join("\n");
  }
  if (isRecord4(value)) {
    if (typeof value.text === "string" && value.text.trim().length > 0) {
      return value.text.trim();
    }
    if (typeof value.content === "string" && value.content.trim().length > 0) {
      return value.content.trim();
    }
    if ("content" in value && value.content !== void 0 && value.content !== null) {
      return extractText2(value.content);
    }
  }
  return String(value).trim();
}
function readIntFromAny2(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    return Number.isNaN(asInt) ? void 0 : asInt;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function readNumberFromAny2(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function metadataWithThinkingBudget2(metadata, thinkingBudget) {
  if (thinkingBudget === void 0) {
    return metadata ? { ...metadata } : void 0;
  }
  const out = metadata ? { ...metadata } : {};
  out[thinkingBudgetMetadataKey2] = thinkingBudget;
  return out;
}
function mergeMetadata(base, extra) {
  if (base === void 0) {
    return extra ? { ...extra } : void 0;
  }
  if (extra === void 0) {
    return { ...base };
  }
  return { ...base, ...extra };
}
function jsonArtifact2(type, name, payload) {
  return {
    type,
    name,
    payload: jsonString2(payload),
    mimeType: "application/json"
  };
}
function jsonString2(value) {
  try {
    return JSON.stringify(value, objectKeySorter2);
  } catch {
    return String(value ?? "");
  }
}
function objectKeySorter2(_key, value) {
  if (!isRecord4(value) || Array.isArray(value)) {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }
  return sorted;
}
function hasValue2(value) {
  return value !== void 0 && value !== null;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}
function asDate2(value) {
  if (value === void 0) {
    return void 0;
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return void 0;
  }
  return date;
}

// ../sigil-sdk/js/dist/providers/gemini.js
var gemini_exports = {};
__export(gemini_exports, {
  models: () => models
});
var thinkingBudgetMetadataKey3 = "sigil.gen_ai.request.thinking.budget_tokens";
var thinkingLevelMetadataKey = "sigil.gen_ai.request.thinking.level";
var usageToolUsePromptTokensMetadataKey = "sigil.gen_ai.usage.tool_use_prompt_tokens";
async function geminiGenerateContent(client, model, contents, config, providerCall, options = {}) {
  const controls = mapGeminiRequestControls(config);
  return client.startGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "gemini",
      name: model
    },
    systemPrompt: extractGeminiSystemPrompt(config),
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    tools: mapGeminiTools(config),
    tags: options.tags,
    metadata: metadataWithThinkingBudget3(options.metadata, controls.thinkingBudget, controls.thinkingLevel)
  }, async (recorder) => {
    const response = await providerCall(model, contents, config);
    recorder.setResult(geminiFromRequestResponse(model, contents, config, response, options));
    return response;
  });
}
async function geminiGenerateContentStream(client, model, contents, config, providerCall, options = {}) {
  const controls = mapGeminiRequestControls(config);
  return client.startStreamingGeneration({
    conversationId: options.conversationId,
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "gemini",
      name: model
    },
    systemPrompt: extractGeminiSystemPrompt(config),
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    tools: mapGeminiTools(config),
    tags: options.tags,
    metadata: metadataWithThinkingBudget3(options.metadata, controls.thinkingBudget, controls.thinkingLevel)
  }, async (recorder) => {
    const summary = await providerCall(model, contents, config);
    const firstChunkAt = asDate3(summary.firstChunkAt);
    if (firstChunkAt !== void 0) {
      recorder.setFirstTokenAt(firstChunkAt);
    }
    recorder.setResult(geminiFromStream(model, contents, config, summary, options));
    return summary;
  });
}
async function geminiEmbedContent(client, model, contents, config, providerCall, options = {}) {
  const requestedDimensions = readIntFromAny3(config?.outputDimensionality) ?? readIntFromAny3(config?.output_dimensionality);
  return client.startEmbedding({
    agentName: options.agentName,
    agentVersion: options.agentVersion,
    model: {
      provider: "gemini",
      name: model
    },
    dimensions: requestedDimensions,
    tags: options.tags,
    metadata: options.metadata
  }, async (recorder) => {
    const response = await providerCall(model, contents, config);
    recorder.setResult(geminiEmbeddingFromResponse(model, contents, config, response));
    return response;
  });
}
function geminiEmbeddingFromResponse(_model, contents, config, response) {
  const result = {
    inputCount: embeddingInputCount2(contents),
    inputTexts: embeddingInputTexts2(contents)
  };
  const requestedDimensions = readIntFromAny3(config?.outputDimensionality) ?? readIntFromAny3(config?.output_dimensionality);
  if (!isRecord5(response)) {
    if (requestedDimensions !== void 0 && requestedDimensions > 0) {
      result.dimensions = requestedDimensions;
    }
    return result;
  }
  const embeddings2 = Array.isArray(response.embeddings) ? response.embeddings : [];
  let inputTokens = 0;
  for (const embedding of embeddings2) {
    if (!isRecord5(embedding)) {
      continue;
    }
    const statistics = isRecord5(embedding.statistics) ? embedding.statistics : void 0;
    const tokenCount = readIntFromAny3(statistics?.tokenCount) ?? readIntFromAny3(statistics?.token_count);
    if (tokenCount !== void 0 && tokenCount > 0) {
      inputTokens += tokenCount;
    }
    if (result.dimensions === void 0 && Array.isArray(embedding.values) && embedding.values.length > 0) {
      result.dimensions = embedding.values.length;
    }
  }
  if (inputTokens > 0) {
    result.inputTokens = inputTokens;
  }
  if (result.dimensions === void 0 && requestedDimensions !== void 0 && requestedDimensions > 0) {
    result.dimensions = requestedDimensions;
  }
  return result;
}
function geminiFromRequestResponse(model, contents, config, response, options = {}) {
  const controls = mapGeminiRequestControls(config);
  const output = mapGeminiResponseOutput(response);
  const usageMetadata = geminiUsageMetadata(response.usageMetadata);
  const result = {
    responseId: asString3(response.responseId),
    responseModel: asString3(response.modelVersion) || model,
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    input: mapGeminiInput(contents),
    output,
    tools: mapGeminiTools(config),
    usage: mapGeminiUsage(response.usageMetadata),
    stopReason: mapGeminiStopReason(response),
    metadata: mergeMetadata2(metadataWithThinkingBudget3(options.metadata, controls.thinkingBudget, controls.thinkingLevel), usageMetadata),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    result.artifacts = [
      jsonArtifact3("request", "gemini.models.request", { model, contents, config }),
      jsonArtifact3("response", "gemini.models.response", response)
    ];
    if ((result.tools ?? []).length > 0) {
      result.artifacts.push(jsonArtifact3("tools", "gemini.models.tools", result.tools));
    }
  }
  return result;
}
function geminiFromStream(model, contents, config, summary, options = {}) {
  const controls = mapGeminiRequestControls(config);
  const responses2 = summary.responses ?? [];
  const finalResponse = summary.finalResponse ?? (responses2.length > 0 ? responses2[responses2.length - 1] : void 0);
  const outputText = summary.outputText ?? extractGeminiStreamText(responses2);
  const fallbackOutput = outputText.length > 0 ? [{ role: "assistant", content: outputText }] : [];
  const streamUsageMetadata = geminiStreamUsageMetadata(responses2);
  const result = finalResponse ? {
    ...geminiFromRequestResponse(model, contents, config, finalResponse, options),
    output: mapGeminiResponseOutput(finalResponse).length > 0 ? mapGeminiResponseOutput(finalResponse) : fallbackOutput
  } : {
    responseModel: model,
    maxTokens: controls.maxTokens,
    temperature: controls.temperature,
    topP: controls.topP,
    toolChoice: controls.toolChoice,
    thinkingEnabled: controls.thinkingEnabled,
    input: mapGeminiInput(contents),
    output: fallbackOutput,
    tools: mapGeminiTools(config),
    metadata: mergeMetadata2(metadataWithThinkingBudget3(options.metadata, controls.thinkingBudget, controls.thinkingLevel), streamUsageMetadata),
    tags: options.tags ? { ...options.tags } : void 0
  };
  if (options.rawArtifacts) {
    const existing = result.artifacts ?? [];
    if (!existing.some((artifact) => artifact.type === "request")) {
      existing.push(jsonArtifact3("request", "gemini.models.request", { model, contents, config }));
    }
    if ((result.tools ?? []).length > 0 && !existing.some((artifact) => artifact.type === "tools")) {
      existing.push(jsonArtifact3("tools", "gemini.models.tools", result.tools));
    }
    existing.push(jsonArtifact3("provider_event", "gemini.models.stream_events", responses2));
    result.artifacts = existing;
  }
  return result;
}
var models = {
  generateContent: geminiGenerateContent,
  generateContentStream: geminiGenerateContentStream,
  embedContent: geminiEmbedContent,
  fromRequestResponse: geminiFromRequestResponse,
  fromStream: geminiFromStream,
  embeddingFromResponse: geminiEmbeddingFromResponse
};
function embeddingInputCount2(contents) {
  let count = 0;
  for (const content of contents) {
    if (content !== void 0 && content !== null) {
      count += 1;
    }
  }
  return count;
}
function embeddingInputTexts2(contents) {
  const output = [];
  for (const content of contents) {
    if (typeof content === "string") {
      const text2 = content.trim();
      if (text2.length > 0) {
        output.push(text2);
      }
      continue;
    }
    if (!isRecord5(content)) {
      continue;
    }
    const text = extractText3(content.parts);
    if (text.length > 0) {
      output.push(text);
    }
  }
  return output.length > 0 ? output : void 0;
}
function mapGeminiInput(contents) {
  const input = [];
  for (const rawContent of contents) {
    if (typeof rawContent === "string") {
      const text2 = rawContent.trim();
      if (text2.length > 0) {
        input.push({ role: "user", content: text2 });
      }
      continue;
    }
    if (!isRecord5(rawContent)) {
      continue;
    }
    const role = normalizeRole2(asString3(rawContent.role));
    const parts = mapGeminiParts(rawContent.parts, role);
    const text = extractText3(rawContent.parts);
    if (parts.length > 0) {
      const hasToolResult = parts.some((part) => part.type === "tool_result");
      input.push({
        role: hasToolResult ? "tool" : role,
        content: text || void 0,
        parts
      });
      continue;
    }
    if (text.length > 0) {
      input.push({ role, content: text });
    }
  }
  return input;
}
function mapGeminiResponseOutput(response) {
  const output = [];
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const rawCandidate of candidates) {
    if (!isRecord5(rawCandidate) || !isRecord5(rawCandidate.content)) {
      continue;
    }
    const role = normalizeRole2(asString3(rawCandidate.content.role) || "assistant");
    const parts = mapGeminiParts(rawCandidate.content.parts, role);
    const text = extractText3(rawCandidate.content.parts);
    if (parts.length === 0 && text.length === 0) {
      continue;
    }
    output.push({
      role,
      content: text || void 0,
      parts: parts.length > 0 ? parts : void 0
    });
  }
  return output;
}
function mapGeminiParts(rawParts, role) {
  if (!Array.isArray(rawParts)) {
    return [];
  }
  const parts = [];
  for (const rawPart of rawParts) {
    if (!isRecord5(rawPart)) {
      continue;
    }
    if (typeof rawPart.text === "string" && rawPart.text.trim().length > 0) {
      if (rawPart.thought === true && role === "assistant") {
        parts.push({
          type: "thinking",
          thinking: rawPart.text,
          metadata: { providerType: "thought" }
        });
      } else {
        parts.push({
          type: "text",
          text: rawPart.text,
          metadata: { providerType: "text" }
        });
      }
    }
    if (isRecord5(rawPart.functionCall)) {
      const name = asString3(rawPart.functionCall.name);
      if (name.length > 0) {
        parts.push({
          type: "tool_call",
          toolCall: {
            id: asString3(rawPart.functionCall.id) || void 0,
            name,
            inputJSON: jsonString3(rawPart.functionCall.args)
          },
          metadata: { providerType: "function_call" }
        });
      }
    }
    if (isRecord5(rawPart.functionResponse)) {
      const responseValue = rawPart.functionResponse.response;
      parts.push({
        type: "tool_result",
        toolResult: {
          toolCallId: asString3(rawPart.functionResponse.id) || void 0,
          name: asString3(rawPart.functionResponse.name) || void 0,
          content: extractText3(responseValue) || void 0,
          contentJSON: jsonString3(responseValue),
          isError: typeof rawPart.functionResponse.isError === "boolean" ? rawPart.functionResponse.isError : void 0
        },
        metadata: { providerType: "function_response" }
      });
    }
  }
  return parts;
}
function mapGeminiTools(config) {
  if (!isRecord5(config) || !Array.isArray(config.tools)) {
    return [];
  }
  const out = [];
  for (const rawTool of config.tools) {
    if (!isRecord5(rawTool) || !Array.isArray(rawTool.functionDeclarations)) {
      continue;
    }
    for (const rawDeclaration of rawTool.functionDeclarations) {
      if (!isRecord5(rawDeclaration)) {
        continue;
      }
      const name = asString3(rawDeclaration.name);
      if (name.length === 0) {
        continue;
      }
      out.push({
        name,
        description: asString3(rawDeclaration.description) || void 0,
        type: "function",
        inputSchemaJSON: hasValue3(rawDeclaration.parametersJsonSchema) ? jsonString3(rawDeclaration.parametersJsonSchema) : void 0
      });
    }
  }
  return out;
}
function mapGeminiUsage(rawUsage) {
  if (!isRecord5(rawUsage)) {
    return void 0;
  }
  const inputTokens = readIntFromAny3(rawUsage.promptTokenCount);
  const outputTokens = readIntFromAny3(rawUsage.candidatesTokenCount);
  const totalTokens = readIntFromAny3(rawUsage.totalTokenCount);
  const cacheReadInputTokens = readIntFromAny3(rawUsage.cachedContentTokenCount);
  const cacheCreationInputTokens = readIntFromAny3(rawUsage.cacheCreationInputTokenCount);
  const toolUsePromptTokens = readIntFromAny3(rawUsage.toolUsePromptTokenCount);
  const reasoningTokens = readIntFromAny3(rawUsage.thoughtsTokenCount);
  const out = {};
  if (inputTokens !== void 0) {
    out.inputTokens = inputTokens;
  }
  if (outputTokens !== void 0) {
    out.outputTokens = outputTokens;
  }
  if (totalTokens !== void 0) {
    out.totalTokens = totalTokens;
  } else if (inputTokens !== void 0 || outputTokens !== void 0) {
    out.totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0) + (toolUsePromptTokens ?? 0) + (reasoningTokens ?? 0);
  }
  if (cacheReadInputTokens !== void 0) {
    out.cacheReadInputTokens = cacheReadInputTokens;
  }
  if (cacheCreationInputTokens !== void 0) {
    out.cacheCreationInputTokens = cacheCreationInputTokens;
  }
  if (reasoningTokens !== void 0) {
    out.reasoningTokens = reasoningTokens;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function geminiUsageMetadata(rawUsage) {
  if (!isRecord5(rawUsage)) {
    return void 0;
  }
  const toolUsePromptTokens = readIntFromAny3(rawUsage.toolUsePromptTokenCount ?? rawUsage.tool_use_prompt_token_count);
  if (toolUsePromptTokens === void 0 || toolUsePromptTokens <= 0) {
    return void 0;
  }
  return {
    [usageToolUsePromptTokensMetadataKey]: toolUsePromptTokens
  };
}
function mapGeminiStopReason(response) {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  let stopReason;
  for (const rawCandidate of candidates) {
    if (!isRecord5(rawCandidate)) {
      continue;
    }
    const candidateStopReason = asString3(rawCandidate.finishReason);
    if (candidateStopReason.length > 0) {
      stopReason = candidateStopReason.toUpperCase();
    }
  }
  return stopReason;
}
function mapGeminiRequestControls(config) {
  if (!isRecord5(config)) {
    return {};
  }
  const toolConfig = isRecord5(config.toolConfig) ? config.toolConfig : void 0;
  const functionCallingConfig = toolConfig && isRecord5(toolConfig.functionCallingConfig) ? toolConfig.functionCallingConfig : void 0;
  const thinkingConfig = isRecord5(config.thinkingConfig) ? config.thinkingConfig : void 0;
  return {
    maxTokens: readIntFromAny3(config.maxOutputTokens),
    temperature: readNumberFromAny3(config.temperature),
    topP: readNumberFromAny3(config.topP),
    toolChoice: canonicalToolChoice3(functionCallingConfig?.mode),
    thinkingEnabled: typeof thinkingConfig?.includeThoughts === "boolean" ? thinkingConfig.includeThoughts : void 0,
    thinkingBudget: readIntFromAny3(thinkingConfig?.thinkingBudget),
    thinkingLevel: geminiThinkingLevel(thinkingConfig?.thinkingLevel)
  };
}
function extractGeminiSystemPrompt(config) {
  if (!isRecord5(config)) {
    return void 0;
  }
  const instruction = config.systemInstruction;
  if (!hasValue3(instruction)) {
    return void 0;
  }
  if (typeof instruction === "string") {
    const text = instruction.trim();
    return text.length > 0 ? text : void 0;
  }
  if (isRecord5(instruction) && Array.isArray(instruction.parts)) {
    const chunks = instruction.parts.map((part) => {
      if (!isRecord5(part)) {
        return "";
      }
      return typeof part.text === "string" ? part.text.trim() : "";
    }).filter((chunk) => chunk.length > 0);
    if (chunks.length > 0) {
      return chunks.join("\n");
    }
  }
  const fallback = extractText3(instruction);
  return fallback.length > 0 ? fallback : void 0;
}
function extractGeminiStreamText(responses2) {
  const chunks = [];
  for (const response of responses2) {
    const output = mapGeminiResponseOutput(response);
    for (const message of output) {
      if (typeof message.content === "string" && message.content.trim().length > 0) {
        chunks.push(message.content.trim());
      }
    }
  }
  return chunks.join("\n");
}
function normalizeRole2(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "assistant" || normalized === "model") {
    return "assistant";
  }
  if (normalized === "tool") {
    return "tool";
  }
  return "user";
}
function canonicalToolChoice3(value) {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  if (isRecord5(value) && "value" in value) {
    const normalized = String(value.value ?? "").trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  return jsonString3(value);
}
function metadataWithThinkingBudget3(metadata, thinkingBudget, thinkingLevel) {
  if (thinkingBudget === void 0 && thinkingLevel === void 0) {
    return metadata ? { ...metadata } : void 0;
  }
  const out = metadata ? { ...metadata } : {};
  if (thinkingBudget !== void 0) {
    out[thinkingBudgetMetadataKey3] = thinkingBudget;
  }
  if (thinkingLevel !== void 0) {
    out[thinkingLevelMetadataKey] = thinkingLevel;
  }
  return out;
}
function geminiThinkingLevel(value) {
  const raw = asString3(value).toLowerCase();
  if (raw.length === 0 || raw === "thinking_level_unspecified") {
    return void 0;
  }
  if (raw === "thinking_level_low" || raw === "low") {
    return "low";
  }
  if (raw === "thinking_level_medium" || raw === "medium") {
    return "medium";
  }
  if (raw === "thinking_level_high" || raw === "high") {
    return "high";
  }
  if (raw === "thinking_level_minimal" || raw === "minimal") {
    return "minimal";
  }
  return raw;
}
function geminiStreamUsageMetadata(responses2) {
  for (let index = responses2.length - 1; index >= 0; index -= 1) {
    const metadata = geminiUsageMetadata(responses2[index].usageMetadata);
    if (metadata !== void 0) {
      return metadata;
    }
  }
  return void 0;
}
function mergeMetadata2(base, extra) {
  if (base === void 0) {
    return extra ? { ...extra } : void 0;
  }
  if (extra === void 0) {
    return { ...base };
  }
  return { ...base, ...extra };
}
function extractText3(value) {
  if (!hasValue3(value)) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const chunks = [];
    for (const item of value) {
      const chunk = extractText3(item);
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
    }
    return chunks.join("\n");
  }
  if (isRecord5(value)) {
    if (typeof value.text === "string" && value.text.trim().length > 0) {
      return value.text.trim();
    }
    if ("content" in value && value.content !== void 0 && value.content !== null) {
      return extractText3(value.content);
    }
  }
  return String(value).trim();
}
function asString3(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  return value === void 0 || value === null ? "" : String(value).trim();
}
function readIntFromAny3(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    return Number.isNaN(asInt) ? void 0 : asInt;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function readNumberFromAny3(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
}
function jsonArtifact3(type, name, payload) {
  return {
    type,
    name,
    payload: jsonString3(payload),
    mimeType: "application/json"
  };
}
function jsonString3(value) {
  try {
    return JSON.stringify(value, objectKeySorter3);
  } catch {
    return String(value ?? "");
  }
}
function objectKeySorter3(_key, value) {
  if (!isRecord5(value) || Array.isArray(value)) {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }
  return sorted;
}
function hasValue3(value) {
  return value !== void 0 && value !== null;
}
function isRecord5(value) {
  return typeof value === "object" && value !== null;
}
function asDate3(value) {
  if (value === void 0) {
    return void 0;
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return void 0;
  }
  return date;
}

// ../sigil-sdk/js/dist/index.js
function createSigilClient(config = {}) {
  return new SigilClient(config);
}
export {
  SigilClient,
  agentNameFromContext,
  agentVersionFromContext,
  anthropic_exports as anthropic,
  conversationIdFromContext,
  conversationTitleFromContext,
  createSigilClient,
  defaultConfig,
  gemini_exports as gemini,
  openai_exports as openai,
  userIdFromContext,
  withAgentName,
  withAgentVersion,
  withConversationId,
  withConversationTitle,
  withUserId
};
