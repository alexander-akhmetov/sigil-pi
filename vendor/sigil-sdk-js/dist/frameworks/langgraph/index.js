import { SigilFrameworkHandler } from '../shared.js';
export class SigilLangGraphHandler extends SigilFrameworkHandler {
    name = 'sigil_langgraph_handler';
    constructor(client, options = {}) {
        super(client, 'langgraph', 'javascript', options);
    }
    async handleLLMStart(serialized, prompts, runId, parentRunId, extraParams, tags, metadata, runName) {
        this.onLLMStart(serialized, prompts, runId, parentRunId, extraParams, tags, metadata, runName);
    }
    async handleChatModelStart(serialized, messages, runId, parentRunId, extraParams, tags, metadata, runName) {
        this.onChatModelStart(serialized, messages, runId, parentRunId, extraParams, tags, metadata, runName);
    }
    async handleLLMNewToken(token, _idx, runId) {
        this.onLLMNewToken(token, runId);
    }
    async handleLLMEnd(output, runId) {
        this.onLLMEnd(output, runId);
    }
    async handleLLMError(error, runId) {
        this.onLLMError(error, runId);
    }
    async handleToolStart(serialized, input, runId, parentRunId, tags, metadata, runName) {
        this.onToolStart(serialized, input, runId, parentRunId, tags, metadata, runName);
    }
    async handleToolEnd(output, runId) {
        this.onToolEnd(output, runId);
    }
    async handleToolError(error, runId) {
        this.onToolError(error, runId);
    }
    async handleChainStart(serialized, _inputs, runId, parentRunId, tags, metadata, runType, runName) {
        this.onChainStart(serialized, runId, parentRunId, tags, metadata, runType, runName);
    }
    async handleChainEnd(_outputs, runId) {
        this.onChainEnd(runId);
    }
    async handleChainError(error, runId) {
        this.onChainError(error, runId);
    }
    async handleRetrieverStart(serialized, _query, runId, parentRunId, tags, metadata, runName) {
        this.onRetrieverStart(serialized, runId, parentRunId, tags, metadata, runName);
    }
    async handleRetrieverEnd(_documents, runId) {
        this.onRetrieverEnd(runId);
    }
    async handleRetrieverError(error, runId) {
        this.onRetrieverError(error, runId);
    }
}
export function createSigilLangGraphHandler(client, options = {}) {
    return new SigilLangGraphHandler(client, options);
}
export function withSigilLangGraphCallbacks(config, client, options = {}) {
    const handler = createSigilLangGraphHandler(client, options);
    const base = { ...(config ?? {}) };
    const existingValue = base.callbacks;
    const callbacks = Array.isArray(existingValue)
        ? [...existingValue]
        : existingValue === undefined
            ? []
            : [existingValue];
    if (!callbacks.some((callback) => callback instanceof SigilLangGraphHandler)) {
        callbacks.push(handler);
    }
    return {
        ...base,
        callbacks,
    };
}
//# sourceMappingURL=index.js.map