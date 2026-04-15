import { SigilFrameworkHandler } from '../shared.js';
export class SigilOpenAIAgentsHandler extends SigilFrameworkHandler {
    name = 'sigil_openai_agents_handler';
    constructor(client, options = {}) {
        super(client, 'openai-agents', 'javascript', options);
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
export function createSigilOpenAIAgentsHandler(client, options = {}) {
    return new SigilOpenAIAgentsHandler(client, options);
}
export function withSigilOpenAIAgentsHooks(target, client, options = {}) {
    if (!isHookTarget(target)) {
        throw new Error('withSigilOpenAIAgentsHooks expects an OpenAI Agents Runner or Agent (RunHooks/AgentHooks emitter).');
    }
    const handler = createSigilOpenAIAgentsHandler(client, options);
    const contextStacks = new WeakMap();
    const contextIds = new WeakMap();
    const toolRunIds = new Map();
    const fallbackToolRunIds = new Map();
    let sequence = 0;
    const nextRunId = (prefix) => `${prefix}:${++sequence}`;
    const getContextId = (context) => {
        if (!isRecord(context)) {
            return undefined;
        }
        const existing = contextIds.get(context);
        if (existing !== undefined) {
            return existing;
        }
        const assigned = ++sequence;
        contextIds.set(context, assigned);
        return assigned;
    };
    const getStack = (context) => {
        if (!isRecord(context)) {
            return [];
        }
        const existing = contextStacks.get(context);
        if (existing !== undefined) {
            return existing;
        }
        const created = [];
        contextStacks.set(context, created);
        return created;
    };
    const makeContextMetadata = (context, extras) => {
        const conversationId = resolveConversationId(context);
        return {
            conversation_id: conversationId,
            group_id: conversationId,
            ...extras,
        };
    };
    const onAgentStart = async (context, agent, turnInput) => {
        const stack = getStack(context);
        const runId = nextRunId('openai_agent');
        const parentRunId = stack.length > 0 ? stack[stack.length - 1] : undefined;
        stack.push(runId);
        const modelName = resolveModelName(agent);
        const agentName = resolveAgentName(agent);
        await handler.handleChatModelStart({
            name: agentName,
            kwargs: modelName.length > 0 ? { model: modelName } : undefined,
        }, [mapTurnInputToMessages(turnInput)], runId, parentRunId, {
            invocation_params: {
                model: modelName,
            },
        }, undefined, makeContextMetadata(context), agentName);
    };
    const onAgentEnd = async (context, agent, output) => {
        const stack = getStack(context);
        const runId = stack.pop();
        if (runId === undefined) {
            return;
        }
        const modelName = resolveModelName(agent);
        const outputText = normalizeOutputText(output);
        const usage = readUsage(output) ?? readUsage(context);
        await handler.handleLLMEnd({
            generations: outputText.length > 0 ? [[{ text: outputText }]] : [],
            llm_output: {
                model_name: modelName.length > 0 ? modelName : undefined,
                token_usage: usage,
            },
        }, runId);
        const contextId = getContextId(context);
        if (contextId !== undefined) {
            fallbackToolRunIds.delete(contextId);
        }
    };
    const onAgentError = async (context, error) => {
        const stack = getStack(context);
        const runId = stack.pop();
        if (runId === undefined) {
            return;
        }
        const contextId = getContextId(context);
        if (contextId !== undefined) {
            for (const key of toolRunIds.keys()) {
                if (key.startsWith(`${contextId}:`)) {
                    toolRunIds.delete(key);
                }
            }
            fallbackToolRunIds.delete(contextId);
        }
        await handler.handleLLMError(error, runId);
    };
    const onAgentHandoff = async (context, fromAgent, toAgent) => {
        const stack = getStack(context);
        const parentRunId = stack.length > 0 ? stack[stack.length - 1] : undefined;
        const handoffRunId = nextRunId('openai_handoff');
        await handler.handleChainStart({
            name: 'agent_handoff',
            source: resolveAgentName(fromAgent),
            destination: resolveAgentName(toAgent),
        }, undefined, handoffRunId, parentRunId, undefined, makeContextMetadata(context), 'handoff', 'agent_handoff');
        await handler.handleChainEnd(undefined, handoffRunId);
    };
    const onToolStart = async (context, _agent, tool, details) => {
        const callId = resolveToolCallId(details);
        const contextId = getContextId(context);
        const runId = callId.length > 0 ? callId : nextRunId('openai_tool');
        if (contextId !== undefined) {
            if (callId.length > 0) {
                toolRunIds.set(`${contextId}:${callId}`, runId);
            }
            else {
                const stack = fallbackToolRunIds.get(contextId) ?? [];
                stack.push(runId);
                fallbackToolRunIds.set(contextId, stack);
            }
        }
        const stack = getStack(context);
        const parentRunId = stack.length > 0 ? stack[stack.length - 1] : undefined;
        const toolName = resolveToolName(tool, details);
        await handler.handleToolStart({
            name: toolName,
        }, resolveToolArguments(details), runId, parentRunId, undefined, makeContextMetadata(context, {
            event_id: callId,
        }), toolName);
    };
    const onToolEnd = async (context, result, details) => {
        const callId = resolveToolCallId(details);
        const contextId = getContextId(context);
        let runId;
        if (contextId !== undefined) {
            if (callId.length > 0) {
                runId = toolRunIds.get(`${contextId}:${callId}`);
                toolRunIds.delete(`${contextId}:${callId}`);
            }
            else {
                const stack = fallbackToolRunIds.get(contextId);
                runId = stack?.pop();
                if (stack !== undefined && stack.length === 0) {
                    fallbackToolRunIds.delete(contextId);
                }
            }
        }
        if (runId === undefined && callId.length > 0) {
            runId = callId;
        }
        if (runId === undefined) {
            return;
        }
        await handler.handleToolEnd(result, runId);
    };
    const onToolError = async (context, error, details) => {
        const callId = resolveToolCallId(details);
        const contextId = getContextId(context);
        let runId;
        if (contextId !== undefined) {
            if (callId.length > 0) {
                runId = toolRunIds.get(`${contextId}:${callId}`);
                toolRunIds.delete(`${contextId}:${callId}`);
            }
            else {
                const stack = fallbackToolRunIds.get(contextId);
                runId = stack?.pop();
                if (stack !== undefined && stack.length === 0) {
                    fallbackToolRunIds.delete(contextId);
                }
            }
        }
        if (runId === undefined && callId.length > 0) {
            runId = callId;
        }
        if (runId === undefined) {
            return;
        }
        await handler.handleToolError(error, runId);
    };
    const listeners = [
        [
            'agent_start',
            (...args) => {
                if (args.length < 2) {
                    return;
                }
                safelyRun(onAgentStart(args[0], args[1], args[2]));
            },
        ],
        [
            'agent_end',
            (...args) => {
                if (args.length < 2) {
                    return;
                }
                if (args.length >= 3) {
                    safelyRun(onAgentEnd(args[0], args[1], args[2]));
                    return;
                }
                safelyRun(onAgentEnd(args[0], undefined, args[1]));
            },
        ],
        [
            'agent_error',
            (...args) => {
                if (args.length < 2) {
                    return;
                }
                if (args.length >= 3) {
                    safelyRun(onAgentError(args[0], args[2]));
                    return;
                }
                safelyRun(onAgentError(args[0], args[1]));
            },
        ],
        [
            'agent_handoff',
            (...args) => {
                if (args.length < 2) {
                    return;
                }
                if (args.length >= 3) {
                    safelyRun(onAgentHandoff(args[0], args[1], args[2]));
                    return;
                }
                safelyRun(onAgentHandoff(args[0], undefined, args[1]));
            },
        ],
        [
            'agent_tool_start',
            (...args) => {
                if (args.length < 3) {
                    return;
                }
                if (args.length >= 4) {
                    safelyRun(onToolStart(args[0], args[1], args[2], args[3]));
                    return;
                }
                safelyRun(onToolStart(args[0], undefined, args[1], args[2]));
            },
        ],
        [
            'agent_tool_end',
            (...args) => {
                if (args.length < 4) {
                    return;
                }
                if (args.length >= 5) {
                    safelyRun(onToolEnd(args[0], args[3], args[4]));
                    return;
                }
                safelyRun(onToolEnd(args[0], args[2], args[3]));
            },
        ],
        [
            'agent_tool_error',
            (...args) => {
                if (args.length < 4) {
                    return;
                }
                if (args.length >= 5) {
                    safelyRun(onToolError(args[0], args[3], args[4]));
                    return;
                }
                safelyRun(onToolError(args[0], args[2], args[3]));
            },
        ],
    ];
    for (const [event, listener] of listeners) {
        target.on(event, listener);
    }
    return {
        handler,
        detach: () => {
            for (const [event, listener] of listeners) {
                target.off(event, listener);
            }
        },
    };
}
export const attachSigilOpenAIAgentsHooks = withSigilOpenAIAgentsHooks;
function isHookTarget(value) {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value.on === 'function' && typeof value.off === 'function';
}
function mapTurnInputToMessages(turnInput) {
    if (!Array.isArray(turnInput)) {
        const text = normalizeOutputText(turnInput);
        if (text.length === 0) {
            return [];
        }
        return [{ role: 'user', content: text }];
    }
    const messages = [];
    for (const item of turnInput) {
        const role = asString(read(item, 'role')) || 'user';
        const content = normalizeOutputText(read(item, 'content') ?? item);
        if (content.length === 0) {
            continue;
        }
        messages.push({ role, content });
    }
    return messages;
}
function normalizeOutputText(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (Array.isArray(value)) {
        const parts = value.map((entry) => normalizeOutputText(entry)).filter((entry) => entry.length > 0);
        return parts.join(' ').trim();
    }
    if (isRecord(value)) {
        const directText = asString(read(value, 'text'));
        if (directText.length > 0) {
            return directText;
        }
        const outputText = asString(read(value, 'output_text'));
        if (outputText.length > 0) {
            return outputText;
        }
        const content = read(value, 'content');
        const contentText = normalizeOutputText(content);
        if (contentText.length > 0) {
            return contentText;
        }
        const message = read(value, 'message');
        const messageText = normalizeOutputText(message);
        if (messageText.length > 0) {
            return messageText;
        }
        const finalOutput = read(value, 'finalOutput');
        const finalOutputText = normalizeOutputText(finalOutput);
        if (finalOutputText.length > 0) {
            return finalOutputText;
        }
        const maybeStringified = safeStringify(value);
        if (maybeStringified.length > 0 && maybeStringified !== '{}') {
            return maybeStringified;
        }
    }
    return '';
}
function resolveConversationId(context) {
    if (!isRecord(context)) {
        return '';
    }
    const candidates = [
        asString(read(context, 'conversationId')),
        asString(read(context, 'conversation_id')),
        asString(read(context, 'sessionId')),
        asString(read(context, 'session_id')),
        asString(read(context, 'groupId')),
        asString(read(context, 'group_id')),
    ];
    const nestedContext = read(context, 'context');
    if (isRecord(nestedContext)) {
        candidates.push(asString(read(nestedContext, 'conversationId')), asString(read(nestedContext, 'conversation_id')), asString(read(nestedContext, 'sessionId')), asString(read(nestedContext, 'session_id')), asString(read(nestedContext, 'groupId')), asString(read(nestedContext, 'group_id')));
    }
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function resolveModelName(agent) {
    const direct = asString(read(agent, 'model'));
    if (direct.length > 0) {
        return direct;
    }
    const nestedModel = read(agent, 'model');
    if (isRecord(nestedModel)) {
        const nested = asString(read(nestedModel, 'model')) || asString(read(nestedModel, 'name')) || asString(read(nestedModel, 'id'));
        if (nested.length > 0) {
            return nested;
        }
    }
    return '';
}
function resolveAgentName(agent) {
    return asString(read(agent, 'name')) || 'openai_agent';
}
function resolveToolName(tool, details) {
    const fromTool = asString(read(tool, 'name'));
    if (fromTool.length > 0) {
        return fromTool;
    }
    const toolCall = read(details, 'toolCall');
    const fromCall = asString(read(toolCall, 'name'));
    if (fromCall.length > 0) {
        return fromCall;
    }
    return 'framework_tool';
}
function resolveToolCallId(details) {
    const toolCall = read(details, 'toolCall');
    return asString(read(toolCall, 'callId')) || asString(read(toolCall, 'id'));
}
function resolveToolArguments(details) {
    const toolCall = read(details, 'toolCall');
    const raw = read(toolCall, 'arguments');
    if (typeof raw !== 'string') {
        return raw;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return raw;
    }
}
function readUsage(context) {
    if (!isRecord(context)) {
        return undefined;
    }
    const usage = read(context, 'usage');
    if (!isRecord(usage)) {
        return undefined;
    }
    const promptTokens = asNumber(read(usage, 'input_tokens')) ?? asNumber(read(usage, 'inputTokens'));
    const completionTokens = asNumber(read(usage, 'output_tokens')) ?? asNumber(read(usage, 'outputTokens'));
    const totalTokens = asNumber(read(usage, 'total_tokens')) ?? asNumber(read(usage, 'totalTokens'));
    if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
        return undefined;
    }
    return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
    };
}
function safelyRun(task) {
    void task.catch((error) => {
        queueMicrotask(() => {
            throw toError(error);
        });
    });
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
function safeStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return '';
    }
}
function toError(value) {
    if (value instanceof Error) {
        return value;
    }
    return new Error(typeof value === 'string' ? value : 'framework callback failed');
}
//# sourceMappingURL=index.js.map