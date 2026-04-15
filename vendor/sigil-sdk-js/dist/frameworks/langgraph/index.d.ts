import type { SigilClient } from '../../client.js';
import { type FrameworkHandlerOptions, SigilFrameworkHandler } from '../shared.js';
export type { FrameworkHandlerOptions };
type CallbackConfig = Record<string, unknown> & {
    callbacks?: unknown;
};
export declare class SigilLangGraphHandler extends SigilFrameworkHandler {
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
export declare function createSigilLangGraphHandler(client: SigilClient, options?: FrameworkHandlerOptions): SigilLangGraphHandler;
export declare function withSigilLangGraphCallbacks<T extends CallbackConfig>(config: T | undefined, client: SigilClient, options?: FrameworkHandlerOptions): T & {
    callbacks: unknown[];
};
//# sourceMappingURL=index.d.ts.map