import type { SigilClient } from '../client.js';
type AnyRecord = Record<string, unknown>;
type ProviderResolverFn = (context: {
    modelName: string;
    serialized?: unknown;
    invocationParams?: unknown;
}) => string;
type FrameworkName = 'langchain' | 'langgraph' | 'openai-agents' | 'llamaindex' | 'google-adk' | 'vercel-ai-sdk';
export interface FrameworkHandlerOptions {
    agentName?: string;
    agentVersion?: string;
    providerResolver?: 'auto' | ProviderResolverFn;
    provider?: string;
    captureInputs?: boolean;
    captureOutputs?: boolean;
    extraTags?: Record<string, string>;
    extraMetadata?: Record<string, unknown>;
}
export declare class SigilFrameworkHandler {
    private readonly client;
    private readonly frameworkName;
    private readonly frameworkLanguage;
    private readonly runs;
    private readonly toolRuns;
    private readonly chainSpans;
    private readonly retrieverSpans;
    private readonly agentName?;
    private readonly agentVersion?;
    private readonly providerResolver;
    private readonly provider?;
    private readonly captureInputs;
    private readonly captureOutputs;
    private readonly extraTags;
    private readonly extraMetadata;
    constructor(client: SigilClient, frameworkName: FrameworkName, frameworkLanguage: 'javascript', options?: FrameworkHandlerOptions);
    protected onLLMStart(serialized: unknown, prompts: unknown, runId: string, parentRunId?: string, extraParams?: AnyRecord, callbackTags?: string[], callbackMetadata?: AnyRecord, runName?: string): void;
    protected onChatModelStart(serialized: unknown, messages: unknown, runId: string, parentRunId?: string, extraParams?: AnyRecord, callbackTags?: string[], callbackMetadata?: AnyRecord, runName?: string): void;
    protected onLLMNewToken(token: string, runId: string): void;
    protected onLLMEnd(output: unknown, runId: string): void;
    protected onLLMError(error: unknown, runId: string): void;
    protected onToolStart(serialized: unknown, input: unknown, runId: string, parentRunId?: string, callbackTags?: string[], callbackMetadata?: AnyRecord, runName?: string, extraParams?: AnyRecord): void;
    protected onToolEnd(output: unknown, runId: string): void;
    protected onToolError(error: unknown, runId: string): void;
    protected onChainStart(serialized: unknown, runId: string, parentRunId?: string, callbackTags?: string[], callbackMetadata?: AnyRecord, callbackRunType?: string, runName?: string, extraParams?: AnyRecord): void;
    protected onChainEnd(runId: string): void;
    protected onChainError(error: unknown, runId: string): void;
    protected onRetrieverStart(serialized: unknown, runId: string, parentRunId?: string, callbackTags?: string[], callbackMetadata?: AnyRecord, runName?: string, extraParams?: AnyRecord): void;
    protected onRetrieverEnd(runId: string): void;
    protected onRetrieverError(error: unknown, runId: string): void;
    private startPayload;
    private getFrameworkTracer;
    private setFrameworkSpanAttributes;
    private endFrameworkSpan;
    private buildFrameworkContext;
}
export {};
//# sourceMappingURL=shared.d.ts.map