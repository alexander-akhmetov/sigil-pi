import type { SigilClient } from '../../client.js';
import { type FrameworkHandlerOptions, SigilFrameworkHandler } from '../shared.js';
export type { FrameworkHandlerOptions };
type OpenAIAgentsHookTarget = {
    on(event: string, listener: (...args: unknown[]) => void): unknown;
    off(event: string, listener: (...args: unknown[]) => void): unknown;
};
export interface OpenAIAgentsHookRegistration {
    handler: SigilOpenAIAgentsHandler;
    detach: () => void;
}
export declare class SigilOpenAIAgentsHandler extends SigilFrameworkHandler {
    name: string;
    constructor(client: SigilClient, options?: FrameworkHandlerOptions);
    handleLLMStart(serialized: unknown, prompts: unknown, runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<void>;
    handleChatModelStart(serialized: unknown, messages: unknown, runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<void>;
    handleLLMNewToken(token: string, _idx: unknown, runId: string): Promise<void>;
    handleLLMEnd(output: unknown, runId: string): Promise<void>;
    handleLLMError(error: unknown, runId: string): Promise<void>;
    handleToolStart(serialized: unknown, input: unknown, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<void>;
    handleToolEnd(output: unknown, runId: string): Promise<void>;
    handleToolError(error: unknown, runId: string): Promise<void>;
    handleChainStart(serialized: unknown, _inputs: unknown, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runType?: string, runName?: string): Promise<void>;
    handleChainEnd(_outputs: unknown, runId: string): Promise<void>;
    handleChainError(error: unknown, runId: string): Promise<void>;
    handleRetrieverStart(serialized: unknown, _query: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<void>;
    handleRetrieverEnd(_documents: unknown, runId: string): Promise<void>;
    handleRetrieverError(error: unknown, runId: string): Promise<void>;
}
export declare function createSigilOpenAIAgentsHandler(client: SigilClient, options?: FrameworkHandlerOptions): SigilOpenAIAgentsHandler;
export declare function withSigilOpenAIAgentsHooks(target: OpenAIAgentsHookTarget, client: SigilClient, options?: FrameworkHandlerOptions): OpenAIAgentsHookRegistration;
export declare const attachSigilOpenAIAgentsHooks: typeof withSigilOpenAIAgentsHooks;
//# sourceMappingURL=index.d.ts.map