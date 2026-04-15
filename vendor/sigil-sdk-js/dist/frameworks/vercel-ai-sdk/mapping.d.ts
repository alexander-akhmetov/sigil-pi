import type { Message, TokenUsage } from '../../types.js';
import type { ConversationResolution, SigilVercelAiSdkOptions, StepFinishEvent, StepOutputMapping, StepStartEvent, StreamChunkEvent, ToolCallFinishEvent, ToolCallStartEvent } from './types.js';
export declare function frameworkIdentity(): {
    name: string;
    source: string;
    language: string;
};
export declare function buildFrameworkTags(extraTags: Record<string, string> | undefined): Record<string, string>;
export declare function buildFrameworkMetadata(extraMetadata: Record<string, unknown> | undefined, stepType: string | undefined, reasoningText: string | undefined): Record<string, unknown>;
export declare function fallbackConversationId(suffix: string): string;
export declare function resolveConversationId(params: {
    explicitConversationId?: string;
    resolver?: SigilVercelAiSdkOptions['resolveConversationId'];
    stepStartEvent: StepStartEvent;
    fallbackSeed: string;
}): ConversationResolution;
export declare function extractStepNumber(event: {
    stepNumber?: unknown;
}, fallback: number): number;
export declare function mapModelFromStepStart(event: StepStartEvent): {
    provider: string;
    modelName: string;
};
export declare function mapResponseFromStepFinish(event: StepFinishEvent): {
    responseId?: string;
    responseModel?: string;
    finishReason?: string;
};
export declare function shouldTreatStepAsError(event: StepFinishEvent): boolean;
export declare function mapUsageFromStepFinish(event: StepFinishEvent): TokenUsage | undefined;
export declare function mapInputMessages(messages: unknown): Message[];
export declare function mapStepOutput(event: StepFinishEvent): StepOutputMapping;
export declare function parseToolCallStart(event: ToolCallStartEvent): {
    toolCallId: string;
    toolName: string;
    input: unknown;
    toolType?: string;
    description?: string;
} | undefined;
export declare function parseToolCallFinish(event: ToolCallFinishEvent): {
    toolCallId: string;
    success: boolean;
    output: unknown;
    error: unknown;
    durationMs?: number;
} | undefined;
export declare function isTextChunk(event: StreamChunkEvent): boolean;
export declare function normalizeMetadata(raw: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=mapping.d.ts.map