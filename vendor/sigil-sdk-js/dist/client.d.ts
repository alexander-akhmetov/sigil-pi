import { type Span } from '@opentelemetry/api';
import type { ContentCaptureMode, ConversationRatingInput, EmbeddingRecorder, EmbeddingResult, EmbeddingStart, Generation, GenerationMode, GenerationRecorder, GenerationStart, RecorderCallback, SigilDebugSnapshot, SigilSdkConfigInput, SubmitConversationRatingResponse, ToolExecution, ToolExecutionRecorder, ToolExecutionStart } from './types.js';
export declare class SigilClient {
    private readonly config;
    private readonly nowFn;
    private readonly sleepFn;
    private readonly logger;
    private readonly generationExporter;
    private readonly tracer;
    private readonly meter;
    private readonly operationDurationHistogram;
    private readonly tokenUsageHistogram;
    private readonly ttftHistogram;
    private readonly toolCallsHistogram;
    private readonly generations;
    private readonly toolExecutions;
    private readonly pendingGenerations;
    private flushPromise;
    private flushRequested;
    private flushTimer;
    private shutdownPromise;
    private shuttingDown;
    private closed;
    /**
     * Creates a Sigil SDK client.
     *
     * `inputConfig` is merged with defaults.
     */
    constructor(inputConfig?: SigilSdkConfigInput);
    /**
     * Starts a generation recorder (`SYNC` mode).
     *
     * Overloads:
     * - returns recorder for manual lifecycle
     * - executes callback and auto-ends recorder
     */
    startGeneration(start: GenerationStart): GenerationRecorder;
    startGeneration<TResult>(start: GenerationStart, callback: RecorderCallback<GenerationRecorder, TResult>): Promise<TResult>;
    /**
     * Starts a streaming generation recorder (`STREAM` mode).
     *
     * Overloads:
     * - returns recorder for manual lifecycle
     * - executes callback and auto-ends recorder
     */
    startStreamingGeneration(start: GenerationStart): GenerationRecorder;
    startStreamingGeneration<TResult>(start: GenerationStart, callback: RecorderCallback<GenerationRecorder, TResult>): Promise<TResult>;
    /**
     * Starts an embeddings recorder.
     *
     * Overloads:
     * - returns recorder for manual lifecycle
     * - executes callback and auto-ends recorder
     */
    startEmbedding(start: EmbeddingStart): EmbeddingRecorder;
    startEmbedding<TResult>(start: EmbeddingStart, callback: RecorderCallback<EmbeddingRecorder, TResult>): Promise<TResult>;
    /**
     * Starts a tool execution recorder.
     *
     * Empty tool names return a no-op recorder to keep instrumentation safe.
     */
    startToolExecution(start: ToolExecutionStart): ToolExecutionRecorder;
    startToolExecution<TResult>(start: ToolExecutionStart, callback: RecorderCallback<ToolExecutionRecorder, TResult>): Promise<TResult>;
    /** Submits a user-facing conversation rating through Sigil HTTP API. */
    submitConversationRating(conversationId: string, input: ConversationRatingInput): Promise<SubmitConversationRatingResponse>;
    /** Forces immediate drain of queued generation exports. */
    flush(): Promise<void>;
    /** Flushes pending generations and shuts down the generation exporter. */
    shutdown(): Promise<void>;
    /** Returns a cloned in-memory snapshot for debugging and tests. */
    debugSnapshot(): SigilDebugSnapshot;
    internalNow(): Date;
    internalRecordGeneration(generation: Generation): void;
    internalRecordToolExecution(toolExecution: ToolExecution): void;
    internalEnqueueGeneration(generation: Generation): void;
    internalLogWarn(message: string, error?: unknown): void;
    internalResolveGenerationContentCaptureMode(seed: GenerationStart): ContentCaptureMode;
    internalResolveToolIncludeContent(seed: ToolExecutionStart): boolean;
    internalStartGenerationSpan(seed: GenerationStart, mode: GenerationMode, startedAt: Date): Span;
    internalStartEmbeddingSpan(seed: EmbeddingStart, startedAt: Date): Span;
    internalStartToolExecutionSpan(seed: ToolExecutionStart, startedAt: Date): Span;
    internalApplyTraceContextFromSpan(span: Span, generation: Generation): void;
    internalSyncGenerationSpan(span: Span, generation: Generation): void;
    internalClearSpanConversationTitle(span: Span): void;
    internalFinalizeGenerationSpan(span: Span, generation: Generation, callError: string | undefined, validationError: Error | undefined, enqueueError: Error | undefined, firstTokenAt: Date | undefined, precomputedCallErrorCategory?: string): void;
    internalFinalizeEmbeddingSpan(span: Span, seed: EmbeddingStart, result: EmbeddingResult, hasResult: boolean, callError: Error | undefined, localError: Error | undefined, startedAt: Date, completedAt: Date): void;
    internalFinalizeToolExecutionSpan(span: Span, toolExecution: ToolExecution, localError: Error | undefined): Error | undefined;
    private recordGenerationMetrics;
    private recordEmbeddingMetrics;
    private recordTokenUsage;
    private recordToolExecutionMetrics;
    private assertOpen;
    private startGenerationWithMode;
    private triggerAsyncFlush;
    private flushInternal;
    private drainPendingGenerations;
    private exportWithRetry;
    private logRejectedResults;
    private stopFlushTimer;
    private logWarn;
}
//# sourceMappingURL=client.d.ts.map