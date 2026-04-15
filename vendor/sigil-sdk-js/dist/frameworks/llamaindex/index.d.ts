import type { SigilClient } from '../../client.js';
import { type FrameworkHandlerOptions, SigilFrameworkHandler } from '../shared.js';
export type { FrameworkHandlerOptions };
type CallbackConfig = Record<string, unknown> & {
    callbackManager?: unknown;
};
type LlamaIndexEvent = {
    detail?: unknown;
    reason?: unknown;
};
type LlamaIndexCallbackHandler = (event: LlamaIndexEvent) => void;
type LlamaIndexCallbackManager = {
    on(event: string, handler: LlamaIndexCallbackHandler): unknown;
    off(event: string, handler: LlamaIndexCallbackHandler): unknown;
};
export interface LlamaIndexCallbackRegistration {
    handler: SigilLlamaIndexHandler;
    detach: () => void;
}
export declare class SigilLlamaIndexHandler extends SigilFrameworkHandler {
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
export declare function createSigilLlamaIndexHandler(client: SigilClient, options?: FrameworkHandlerOptions): SigilLlamaIndexHandler;
export declare function attachSigilLlamaIndexCallbacks(callbackManager: LlamaIndexCallbackManager, client: SigilClient, options?: FrameworkHandlerOptions): LlamaIndexCallbackRegistration;
export declare function withSigilLlamaIndexCallbacks<T extends CallbackConfig>(config: T | undefined, client: SigilClient, options?: FrameworkHandlerOptions): T & {
    callbackManager: LlamaIndexCallbackManager;
};
//# sourceMappingURL=index.d.ts.map