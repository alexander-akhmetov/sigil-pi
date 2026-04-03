import type { Meter, Tracer, Span } from '@opentelemetry/api';

// --- Types ---

export type GenerationExportProtocol = 'grpc' | 'http' | 'none';
export type GenerationMode = 'SYNC' | 'STREAM';
export type ExportAuthMode = 'none' | 'tenant' | 'bearer' | 'basic';

export interface ExportAuthConfig {
  mode: ExportAuthMode;
  tenantId?: string;
  bearerToken?: string;
  basicUser?: string;
  basicPassword?: string;
}

export interface GenerationExportConfig {
  protocol: GenerationExportProtocol;
  endpoint: string;
  headers?: Record<string, string>;
  auth: ExportAuthConfig;
  insecure: boolean;
  batchSize: number;
  flushIntervalMs: number;
  queueSize: number;
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  payloadMaxBytes: number;
}

export interface ApiConfig {
  endpoint: string;
}

export interface EmbeddingCaptureConfig {
  captureInput: boolean;
  maxInputItems: number;
  maxTextLength: number;
}

export interface SigilLogger {
  debug?: (message: string, ...args: unknown[]) => void;
  warn?: (message: string, ...args: unknown[]) => void;
  error?: (message: string, ...args: unknown[]) => void;
}

export interface ExportGenerationResult {
  generationId: string;
  accepted: boolean;
  error?: string;
}

export interface ExportGenerationsRequest {
  generations: Generation[];
}

export interface ExportGenerationsResponse {
  results: ExportGenerationResult[];
}

export interface GenerationExporter {
  exportGenerations(request: ExportGenerationsRequest): Promise<ExportGenerationsResponse>;
  shutdown?(): Promise<void> | void;
}

export interface SigilSdkConfig {
  generationExport: GenerationExportConfig;
  api: ApiConfig;
  embeddingCapture: EmbeddingCaptureConfig;
  generationExporter?: GenerationExporter;
  tracer?: Tracer;
  meter?: Meter;
  logger?: SigilLogger;
  now?: () => Date;
  sleep?: (durationMs: number) => Promise<void>;
}

export interface SigilSdkConfigInput {
  generationExport?: Partial<GenerationExportConfig>;
  api?: Partial<ApiConfig>;
  embeddingCapture?: Partial<EmbeddingCaptureConfig>;
  generationExporter?: GenerationExporter;
  tracer?: Tracer;
  meter?: Meter;
  logger?: SigilLogger;
  now?: () => Date;
  sleep?: (durationMs: number) => Promise<void>;
}

export interface ModelRef {
  provider: string;
  name: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  type?: string;
  inputSchemaJSON?: string;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadInputTokens?: number;
  cacheWriteInputTokens?: number;
  cacheCreationInputTokens?: number;
  reasoningTokens?: number;
}

export interface PartMetadata {
  providerType?: string;
}

export interface ToolCallPart {
  id?: string;
  name: string;
  inputJSON?: string;
}

export interface ToolResultPart {
  toolCallId?: string;
  name?: string;
  content?: string;
  contentJSON?: string;
  isError?: boolean;
}

export type MessagePart =
  | { type: 'text'; text: string; metadata?: PartMetadata }
  | { type: 'thinking'; thinking: string; metadata?: PartMetadata }
  | { type: 'tool_call'; toolCall: ToolCallPart; metadata?: PartMetadata }
  | { type: 'tool_result'; toolResult: ToolResultPart; metadata?: PartMetadata };

export interface Message {
  role: string;
  content?: string;
  name?: string;
  parts?: MessagePart[];
}

export interface Artifact {
  type: string;
  name?: string;
  payload?: string;
  mimeType?: string;
  recordId?: string;
  uri?: string;
}

export interface GenerationStart {
  id?: string;
  conversationId?: string;
  conversationTitle?: string;
  userId?: string;
  agentName?: string;
  agentVersion?: string;
  mode?: GenerationMode;
  operationName?: string;
  model: ModelRef;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  toolChoice?: string;
  thinkingEnabled?: boolean;
  tools?: ToolDefinition[];
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
}

export interface GenerationResult {
  conversationId?: string;
  conversationTitle?: string;
  userId?: string;
  agentName?: string;
  agentVersion?: string;
  operationName?: string;
  responseId?: string;
  responseModel?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  toolChoice?: string;
  thinkingEnabled?: boolean;
  input?: Message[];
  output?: Message[];
  tools?: ToolDefinition[];
  usage?: TokenUsage;
  stopReason?: string;
  completedAt?: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  artifacts?: Artifact[];
}

export interface Generation {
  id: string;
  conversationId?: string;
  conversationTitle?: string;
  userId?: string;
  agentName?: string;
  agentVersion?: string;
  mode: GenerationMode;
  operationName: string;
  traceId?: string;
  spanId?: string;
  model: ModelRef;
  systemPrompt?: string;
  responseId?: string;
  responseModel?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  toolChoice?: string;
  thinkingEnabled?: boolean;
  input?: Message[];
  output?: Message[];
  tools?: ToolDefinition[];
  usage?: TokenUsage;
  stopReason?: string;
  startedAt: Date;
  completedAt: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  artifacts?: Artifact[];
  callError?: string;
}

export interface EmbeddingStart {
  model: ModelRef;
  agentName?: string;
  agentVersion?: string;
  dimensions?: number;
  encodingFormat?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
}

export interface EmbeddingResult {
  inputCount: number;
  inputTokens?: number;
  inputTexts?: string[];
  responseModel?: string;
  dimensions?: number;
}

export interface ToolExecutionStart {
  toolName: string;
  toolCallId?: string;
  toolType?: string;
  toolDescription?: string;
  conversationId?: string;
  conversationTitle?: string;
  agentName?: string;
  agentVersion?: string;
  requestModel?: string;
  requestProvider?: string;
  includeContent?: boolean;
  startedAt?: Date;
}

export interface ToolExecutionResult {
  arguments?: unknown;
  result?: unknown;
  completedAt?: Date;
}

export interface ToolExecution {
  toolName: string;
  toolCallId?: string;
  toolType?: string;
  toolDescription?: string;
  conversationId?: string;
  conversationTitle?: string;
  agentName?: string;
  agentVersion?: string;
  requestModel?: string;
  requestProvider?: string;
  includeContent: boolean;
  startedAt: Date;
  completedAt: Date;
  arguments?: unknown;
  result?: unknown;
  callError?: string;
}

export type ConversationRatingValue = 'CONVERSATION_RATING_VALUE_GOOD' | 'CONVERSATION_RATING_VALUE_BAD';

export interface ConversationRatingInput {
  ratingId: string;
  rating: ConversationRatingValue;
  comment?: string;
  metadata?: Record<string, unknown>;
  generationId?: string;
  raterId?: string;
  source?: string;
}

export interface ConversationRating {
  ratingId: string;
  conversationId: string;
  generationId?: string;
  rating: ConversationRatingValue;
  comment?: string;
  metadata?: Record<string, unknown>;
  raterId?: string;
  source?: string;
  createdAt: string;
}

export interface ConversationRatingSummary {
  totalCount: number;
  goodCount: number;
  badCount: number;
  latestRating?: ConversationRatingValue;
  latestRatedAt: string;
  latestBadAt?: string;
  hasBadRating: boolean;
}

export interface SubmitConversationRatingResponse {
  rating: ConversationRating;
  summary: ConversationRatingSummary;
}

export interface EmbeddingRecorder {
  setResult(result: EmbeddingResult): void;
  setCallError(error: unknown): void;
  end(): void;
  getError(): Error | undefined;
}

export interface GenerationRecorder {
  setResult(result: GenerationResult): void;
  setCallError(error: unknown): void;
  setFirstTokenAt(firstTokenAt: Date): void;
  end(): void;
  getError(): Error | undefined;
}

export interface ToolExecutionRecorder {
  setResult(result: ToolExecutionResult): void;
  setCallError(error: unknown): void;
  end(): void;
  getError(): Error | undefined;
}

export interface SigilDebugSnapshot {
  generations: Generation[];
  toolExecutions: ToolExecution[];
  queueSize: number;
}

export type RecorderCallback<TRecorder, TResult> = (recorder: TRecorder) => TResult | Promise<TResult>;

// --- Client ---

export declare class SigilClient {
  constructor(inputConfig?: SigilSdkConfigInput);
  startGeneration(start: GenerationStart): GenerationRecorder;
  startGeneration<TResult>(start: GenerationStart, callback: RecorderCallback<GenerationRecorder, TResult>): Promise<TResult>;
  startStreamingGeneration(start: GenerationStart): GenerationRecorder;
  startStreamingGeneration<TResult>(start: GenerationStart, callback: RecorderCallback<GenerationRecorder, TResult>): Promise<TResult>;
  startEmbedding(start: EmbeddingStart): EmbeddingRecorder;
  startEmbedding<TResult>(start: EmbeddingStart, callback: RecorderCallback<EmbeddingRecorder, TResult>): Promise<TResult>;
  startToolExecution(start: ToolExecutionStart): ToolExecutionRecorder;
  startToolExecution<TResult>(start: ToolExecutionStart, callback: RecorderCallback<ToolExecutionRecorder, TResult>): Promise<TResult>;
  submitConversationRating(conversationId: string, input: ConversationRatingInput): Promise<SubmitConversationRatingResponse>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
  debugSnapshot(): SigilDebugSnapshot;
}

export declare function createSigilClient(config?: SigilSdkConfigInput): SigilClient;
export declare function defaultConfig(input?: SigilSdkConfigInput): SigilSdkConfig;
