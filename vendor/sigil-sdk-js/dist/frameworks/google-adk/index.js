import { SigilFrameworkHandler } from '../shared.js';
const sigilGoogleAdkPluginName = 'sigil_google_adk_plugin';
const sigilGoogleAdkPluginMarker = Symbol.for('sigil.google_adk.plugin');
export class SigilGoogleAdkHandler extends SigilFrameworkHandler {
    name = 'sigil_google_adk_handler';
    constructor(client, options = {}) {
        super(client, 'google-adk', 'javascript', options);
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
class SigilGoogleAdkPlugin {
    name = sigilGoogleAdkPluginName;
    [sigilGoogleAdkPluginMarker] = true;
    handler;
    invocationRunIds = new Map();
    agentRunStacks = new Map();
    llmRunStacks = new Map();
    llmTokenSources = new Map();
    toolRunIds = new Map();
    fallbackToolRunIds = new Map();
    pendingUserMessages = new Map();
    fallbackInvocationIds = new WeakMap();
    sequence = 0;
    constructor(client, options = {}) {
        this.handler = new SigilGoogleAdkHandler(client, options);
    }
    async onUserMessageCallback(params) {
        const invocationId = this.resolveInvocationId(params.invocationContext);
        const messages = mapAdkUserMessage(params.userMessage);
        if (messages.length > 0) {
            this.pendingUserMessages.set(invocationId, messages);
        }
        return undefined;
    }
    async beforeRunCallback(params) {
        const invocationContext = params.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext);
        const runId = `adk_invocation:${invocationId}`;
        this.invocationRunIds.set(invocationId, runId);
        await this.handler.handleChainStart({ name: this.resolveAgentName(invocationContext) || 'google_adk_runner' }, undefined, runId, undefined, undefined, this.metadataFromInvocation(invocationContext), 'invocation', this.resolveAgentName(invocationContext));
        return undefined;
    }
    async onEventCallback(params) {
        const invocationId = this.resolveInvocationId(params.invocationContext, {
            invocationId: params.event?.invocationId,
        });
        const llmRunId = this.peekModelRunId(invocationId);
        if (llmRunId === undefined) {
            return undefined;
        }
        const event = params.event;
        const isPartial = asBoolean(event?.partial);
        const isFinal = asBoolean(event?.turnComplete);
        if (isFinal || !isPartial) {
            return undefined;
        }
        const token = extractEventText(event);
        if (token.length === 0) {
            return undefined;
        }
        this.llmTokenSources.set(llmRunId, 'event');
        await this.handler.handleLLMNewToken(token, undefined, llmRunId);
        return undefined;
    }
    async afterRunCallback(params) {
        const invocationId = this.resolveInvocationId(params.invocationContext);
        const runId = this.invocationRunIds.get(invocationId);
        if (runId !== undefined) {
            await this.handler.handleChainEnd(undefined, runId);
            this.invocationRunIds.delete(invocationId);
        }
        const llmRuns = this.llmRunStacks.get(invocationId) ?? [];
        for (const llmRunId of llmRuns) {
            this.llmTokenSources.delete(llmRunId);
        }
        this.llmRunStacks.delete(invocationId);
        this.agentRunStacks.delete(invocationId);
        this.fallbackToolRunIds.delete(invocationId);
        this.pendingUserMessages.delete(invocationId);
    }
    async beforeAgentCallback(params) {
        const callbackContext = params.callbackContext;
        const invocationContext = callbackContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, callbackContext);
        const runId = `adk_agent:${invocationId}:${++this.sequence}`;
        const stack = this.agentRunStacks.get(invocationId) ?? [];
        const parentRunId = stack.length > 0 ? stack[stack.length - 1] : this.invocationRunIds.get(invocationId);
        stack.push(runId);
        this.agentRunStacks.set(invocationId, stack);
        const agentName = this.resolveAgentName(invocationContext, callbackContext) || 'google_adk_agent';
        await this.handler.handleChainStart({ name: agentName }, undefined, runId, parentRunId, undefined, this.metadataFromInvocation(invocationContext, callbackContext), 'agent', agentName);
        return undefined;
    }
    async afterAgentCallback(params) {
        const callbackContext = params.callbackContext;
        const invocationContext = callbackContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, callbackContext);
        const stack = this.agentRunStacks.get(invocationId) ?? [];
        const runId = stack.pop();
        if (runId === undefined) {
            return undefined;
        }
        if (stack.length === 0) {
            this.agentRunStacks.delete(invocationId);
        }
        else {
            this.agentRunStacks.set(invocationId, stack);
        }
        await this.handler.handleChainEnd(undefined, runId);
        return undefined;
    }
    async beforeModelCallback(params) {
        const callbackContext = params.callbackContext;
        const invocationContext = callbackContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, callbackContext);
        const llmRunId = `adk_llm:${invocationId}:${++this.sequence}`;
        const modelRunStack = this.llmRunStacks.get(invocationId) ?? [];
        const agentRunStack = this.agentRunStacks.get(invocationId) ?? [];
        const parentRunId = modelRunStack.length > 0
            ? modelRunStack[modelRunStack.length - 1]
            : agentRunStack.length > 0
                ? agentRunStack[agentRunStack.length - 1]
                : this.invocationRunIds.get(invocationId);
        modelRunStack.push(llmRunId);
        this.llmRunStacks.set(invocationId, modelRunStack);
        const modelName = asString(params.llmRequest?.model);
        const agentName = this.resolveAgentName(invocationContext, callbackContext);
        const pendingUserMessages = this.pendingUserMessages.get(invocationId) ?? [];
        const requestMessages = mapAdkContentsToChatMessages(params.llmRequest?.contents);
        const messages = mergeAdkUserMessages(requestMessages, pendingUserMessages);
        this.pendingUserMessages.delete(invocationId);
        await this.handler.handleChatModelStart({
            name: agentName,
            kwargs: modelName.length > 0 ? { model: modelName } : undefined,
        }, [messages], llmRunId, parentRunId, {
            invocation_params: {
                model: modelName,
                stream: resolveRequestStream(params.llmRequest, invocationContext),
            },
        }, undefined, this.metadataFromInvocation(invocationContext, callbackContext), agentName);
        return undefined;
    }
    async afterModelCallback(params) {
        const callbackContext = params.callbackContext;
        const invocationContext = callbackContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, callbackContext);
        const llmRunId = this.peekModelRunId(invocationId);
        if (llmRunId === undefined) {
            return undefined;
        }
        const text = extractContentText(params.llmResponse?.content);
        const isPartial = asBoolean(params.llmResponse?.partial) || params.llmResponse?.turnComplete === false;
        if (isPartial) {
            if (text.length > 0 && this.llmTokenSources.get(llmRunId) !== 'event') {
                this.llmTokenSources.set(llmRunId, 'model');
                await this.handler.handleLLMNewToken(text, undefined, llmRunId);
            }
            return params.llmResponse;
        }
        this.popModelRunId(invocationId);
        this.llmTokenSources.delete(llmRunId);
        const usageMetadata = params.llmResponse?.usageMetadata;
        const output = {
            generations: text.length > 0 ? [[{ text }]] : [],
            llm_output: {
                model_name: asString(params.llmResponse?.customMetadata?.model) ||
                    asString(params.llmResponse?.customMetadata?.model_name) ||
                    undefined,
                finish_reason: asString(params.llmResponse?.finishReason) || undefined,
                token_usage: {
                    prompt_tokens: asNumber(usageMetadata?.promptTokenCount),
                    completion_tokens: asNumber(usageMetadata?.candidatesTokenCount),
                    total_tokens: asNumber(usageMetadata?.totalTokenCount),
                },
            },
        };
        await this.handler.handleLLMEnd(output, llmRunId);
        return params.llmResponse;
    }
    async onModelErrorCallback(params) {
        const callbackContext = params.callbackContext;
        const invocationContext = callbackContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, callbackContext);
        const llmRunId = this.popModelRunId(invocationId);
        if (llmRunId !== undefined) {
            this.llmTokenSources.delete(llmRunId);
            await this.handler.handleLLMError(params.error, llmRunId);
        }
        return undefined;
    }
    async beforeToolCallback(params) {
        const toolContext = params.toolContext;
        const invocationContext = toolContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, toolContext);
        const callId = asString(toolContext.functionCallId);
        const runId = callId.length > 0 ? `adk_tool:${invocationId}:${callId}` : `adk_tool:${invocationId}:${++this.sequence}`;
        if (callId.length > 0) {
            this.toolRunIds.set(`${invocationId}:${callId}`, runId);
        }
        else {
            const stack = this.fallbackToolRunIds.get(invocationId) ?? [];
            stack.push(runId);
            this.fallbackToolRunIds.set(invocationId, stack);
        }
        await this.handler.handleToolStart({
            name: asString(params.tool?.name),
            description: asString(params.tool?.description),
        }, params.toolArgs, runId, this.peekModelRunId(invocationId), undefined, this.metadataFromInvocation(invocationContext, toolContext, {
            event_id: callId,
        }), asString(params.tool?.name));
        return undefined;
    }
    async afterToolCallback(params) {
        const toolContext = params.toolContext;
        const invocationContext = toolContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, toolContext);
        const callId = asString(toolContext.functionCallId);
        let runId;
        if (callId.length > 0) {
            runId = this.toolRunIds.get(`${invocationId}:${callId}`);
        }
        else {
            const stack = this.fallbackToolRunIds.get(invocationId);
            runId = stack?.pop();
            if (stack !== undefined && stack.length === 0) {
                this.fallbackToolRunIds.delete(invocationId);
            }
        }
        if (runId !== undefined) {
            if (callId.length > 0) {
                this.toolRunIds.delete(`${invocationId}:${callId}`);
            }
            await this.handler.handleToolEnd(params.result, runId);
        }
        return params.result;
    }
    async onToolErrorCallback(params) {
        const toolContext = params.toolContext;
        const invocationContext = toolContext.invocationContext;
        const invocationId = this.resolveInvocationId(invocationContext, toolContext);
        const callId = asString(toolContext.functionCallId);
        let runId;
        if (callId.length > 0) {
            runId = this.toolRunIds.get(`${invocationId}:${callId}`);
        }
        else {
            const stack = this.fallbackToolRunIds.get(invocationId);
            runId = stack?.pop();
            if (stack !== undefined && stack.length === 0) {
                this.fallbackToolRunIds.delete(invocationId);
            }
        }
        if (runId !== undefined) {
            if (callId.length > 0) {
                this.toolRunIds.delete(`${invocationId}:${callId}`);
            }
            await this.handler.handleToolError(params.error, runId);
        }
        return undefined;
    }
    resolveInvocationId(invocationContext, fallbackContext) {
        const explicit = asString(invocationContext?.invocationId) || asString(fallbackContext?.invocationId);
        if (explicit.length > 0) {
            return explicit;
        }
        const stableContext = this.resolveStableInvocationContext(invocationContext, fallbackContext);
        if (stableContext !== undefined) {
            const existing = this.fallbackInvocationIds.get(stableContext);
            if (existing !== undefined) {
                return existing;
            }
            const assigned = `adk_invocation:${++this.sequence}`;
            this.fallbackInvocationIds.set(stableContext, assigned);
            return assigned;
        }
        return `adk_invocation:${++this.sequence}`;
    }
    resolveStableInvocationContext(invocationContext, fallbackContext) {
        if (isRecord(invocationContext)) {
            return invocationContext;
        }
        if (isRecord(fallbackContext?.invocationContext)) {
            return fallbackContext.invocationContext;
        }
        if (isRecord(fallbackContext)) {
            return fallbackContext;
        }
        return undefined;
    }
    resolveAgentName(invocationContext, callbackContext) {
        return asString(callbackContext?.agentName) || asString(invocationContext?.agent?.name);
    }
    metadataFromInvocation(invocationContext, callbackContext, extra) {
        return {
            session_id: asString(invocationContext?.session?.id),
            conversation_id: asString(invocationContext?.session?.id),
            invocation_id: asString(invocationContext?.invocationId) || asString(callbackContext?.invocationId),
            thread_id: asString(invocationContext?.branch),
            component_name: asString(callbackContext?.agentName) || asString(invocationContext?.agent?.name),
            app_name: asString(invocationContext?.appName),
            user_id: asString(invocationContext?.userId),
            ...extra,
        };
    }
    peekModelRunId(invocationId) {
        const stack = this.llmRunStacks.get(invocationId);
        if (stack === undefined || stack.length === 0) {
            return undefined;
        }
        return stack[stack.length - 1];
    }
    popModelRunId(invocationId) {
        const stack = this.llmRunStacks.get(invocationId);
        if (stack === undefined || stack.length === 0) {
            return undefined;
        }
        const runId = stack.pop();
        if (stack.length === 0) {
            this.llmRunStacks.delete(invocationId);
        }
        return runId;
    }
}
export function createSigilGoogleAdkHandler(client, options = {}) {
    return new SigilGoogleAdkHandler(client, options);
}
export function createSigilGoogleAdkPlugin(client, options = {}) {
    return new SigilGoogleAdkPlugin(client, options);
}
export function withSigilGoogleAdkPlugins(config, client, options = {}) {
    const plugin = createSigilGoogleAdkPlugin(client, options);
    const base = { ...(config ?? {}) };
    const existingValue = base.plugins;
    const plugins = Array.isArray(existingValue)
        ? [...existingValue]
        : existingValue === undefined
            ? []
            : [existingValue];
    if (!plugins.some(isSigilGoogleAdkPlugin)) {
        plugins.push(plugin);
    }
    return {
        ...base,
        plugins,
    };
}
function isSigilGoogleAdkPlugin(plugin) {
    if (!isRecord(plugin)) {
        return false;
    }
    return plugin[sigilGoogleAdkPluginMarker] === true;
}
function mapAdkContentsToChatMessages(contents) {
    if (!Array.isArray(contents)) {
        return [];
    }
    const messages = [];
    for (const content of contents) {
        const text = extractContentText(content);
        if (text.length === 0) {
            continue;
        }
        messages.push({
            role: asString(read(content, 'role')) || 'user',
            content: text,
        });
    }
    return messages;
}
function mapAdkUserMessage(userMessage) {
    if (Array.isArray(userMessage)) {
        return mapAdkContentsToChatMessages(userMessage);
    }
    if (isRecord(userMessage)) {
        const role = asString(read(userMessage, 'role')) || 'user';
        const content = extractContentText(userMessage) || asString(read(userMessage, 'text')) || asString(read(userMessage, 'content'));
        if (content.length > 0) {
            return [{ role, content }];
        }
    }
    if (typeof userMessage === 'string' && userMessage.trim().length > 0) {
        return [{ role: 'user', content: userMessage.trim() }];
    }
    return [];
}
function mergeAdkUserMessages(requestMessages, pendingMessages) {
    if (requestMessages.length === 0) {
        return pendingMessages;
    }
    if (pendingMessages.length === 0) {
        return requestMessages;
    }
    const firstRequest = requestMessages[0];
    if (firstRequest === undefined) {
        return pendingMessages;
    }
    const duplicate = pendingMessages.some((message) => message.role === firstRequest.role && message.content === firstRequest.content);
    if (duplicate) {
        return requestMessages;
    }
    return [...pendingMessages, ...requestMessages];
}
function resolveRequestStream(llmRequest, invocationContext) {
    const config = isRecord(llmRequest?.config) ? llmRequest?.config : undefined;
    const generationConfig = isRecord(read(config, 'generationConfig')) ? read(config, 'generationConfig') : undefined;
    const stream = read(llmRequest, 'stream') ??
        read(llmRequest, 'streaming') ??
        read(config, 'stream') ??
        read(config, 'streaming') ??
        read(generationConfig, 'stream') ??
        read(generationConfig, 'streaming') ??
        read(invocationContext, 'stream') ??
        read(invocationContext, 'streaming');
    return asBoolean(stream);
}
function extractEventText(event) {
    if (!event) {
        return '';
    }
    return (extractContentText(event.content) ||
        extractContentText(event.partial) ||
        asString(event.text) ||
        asString(event.delta) ||
        asString(read(event.content, 'text')) ||
        asString(read(event.partial, 'text')));
}
function extractContentText(content) {
    if (!isRecord(content)) {
        return '';
    }
    const parts = read(content, 'parts');
    if (!Array.isArray(parts)) {
        return '';
    }
    const textParts = [];
    for (const part of parts) {
        const text = asString(read(part, 'text'));
        if (text.length > 0) {
            textParts.push(text);
        }
    }
    return textParts.join(' ').trim();
}
function read(value, key) {
    if (!isRecord(value)) {
        return undefined;
    }
    return value[key];
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function asString(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}
function asNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return value;
}
function asBoolean(value) {
    return value === true;
}
//# sourceMappingURL=index.js.map