import type { SigilClient } from '../../client.js';
import { type FrameworkHandlerOptions, SigilFrameworkHandler } from '../shared.js';
export type { FrameworkHandlerOptions };
type PluginConfig = Record<string, unknown> & {
    plugins?: unknown;
};
type GoogleAdkInvocationContext = {
    invocationId?: unknown;
    session?: {
        id?: unknown;
    };
    agent?: {
        name?: unknown;
    };
    appName?: unknown;
    userId?: unknown;
    branch?: unknown;
};
type GoogleAdkCallbackContext = {
    invocationId?: unknown;
    agentName?: unknown;
    invocationContext?: GoogleAdkInvocationContext;
};
type GoogleAdkLlmRequest = {
    model?: unknown;
    contents?: unknown;
    config?: unknown;
};
type GoogleAdkLlmResponse = {
    content?: unknown;
    partial?: unknown;
    turnComplete?: unknown;
    finishReason?: unknown;
    usageMetadata?: {
        promptTokenCount?: unknown;
        candidatesTokenCount?: unknown;
        totalTokenCount?: unknown;
    };
    customMetadata?: Record<string, unknown>;
};
type GoogleAdkEvent = {
    id?: unknown;
    invocationId?: unknown;
    content?: unknown;
    partial?: unknown;
    text?: unknown;
    delta?: unknown;
    turnComplete?: unknown;
};
type GoogleAdkTool = {
    name?: unknown;
    description?: unknown;
};
type GoogleAdkToolContext = {
    functionCallId?: unknown;
    invocationId?: unknown;
    agentName?: unknown;
    invocationContext?: GoogleAdkInvocationContext;
};
type GoogleAdkPlugin = {
    name: string;
    onUserMessageCallback(params: {
        invocationContext: GoogleAdkInvocationContext;
        userMessage: unknown;
    }): Promise<unknown>;
    beforeRunCallback(params: {
        invocationContext: GoogleAdkInvocationContext;
    }): Promise<unknown>;
    onEventCallback(params: {
        invocationContext: GoogleAdkInvocationContext;
        event: GoogleAdkEvent;
    }): Promise<unknown>;
    afterRunCallback(params: {
        invocationContext: GoogleAdkInvocationContext;
    }): Promise<void>;
    beforeAgentCallback(params: {
        callbackContext: GoogleAdkCallbackContext;
    }): Promise<unknown>;
    afterAgentCallback(params: {
        callbackContext: GoogleAdkCallbackContext;
    }): Promise<unknown>;
    beforeModelCallback(params: {
        callbackContext: GoogleAdkCallbackContext;
        llmRequest: GoogleAdkLlmRequest;
    }): Promise<unknown>;
    afterModelCallback(params: {
        callbackContext: GoogleAdkCallbackContext;
        llmResponse: GoogleAdkLlmResponse;
    }): Promise<unknown>;
    onModelErrorCallback(params: {
        callbackContext: GoogleAdkCallbackContext;
        llmRequest: GoogleAdkLlmRequest;
        error: Error;
    }): Promise<unknown>;
    beforeToolCallback(params: {
        tool: GoogleAdkTool;
        toolArgs: Record<string, unknown>;
        toolContext: GoogleAdkToolContext;
    }): Promise<unknown>;
    afterToolCallback(params: {
        tool: GoogleAdkTool;
        toolArgs: Record<string, unknown>;
        toolContext: GoogleAdkToolContext;
        result: unknown;
    }): Promise<unknown>;
    onToolErrorCallback(params: {
        tool: GoogleAdkTool;
        toolArgs: Record<string, unknown>;
        toolContext: GoogleAdkToolContext;
        error: Error;
    }): Promise<unknown>;
};
export declare class SigilGoogleAdkHandler extends SigilFrameworkHandler {
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
export declare function createSigilGoogleAdkHandler(client: SigilClient, options?: FrameworkHandlerOptions): SigilGoogleAdkHandler;
export declare function createSigilGoogleAdkPlugin(client: SigilClient, options?: FrameworkHandlerOptions): GoogleAdkPlugin;
export declare function withSigilGoogleAdkPlugins<T extends PluginConfig>(config: T | undefined, client: SigilClient, options?: FrameworkHandlerOptions): T & {
    plugins: unknown[];
};
//# sourceMappingURL=index.d.ts.map