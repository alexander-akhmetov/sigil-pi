const frameworkConversationPrefix = 'sigil:framework:vercel-ai-sdk:';
const frameworkName = 'vercel-ai-sdk';
const frameworkSource = 'framework';
const frameworkLanguage = 'typescript';
const stepTypeMetadataKey = 'sigil.framework.step_type';
const reasoningTextMetadataKey = 'sigil.framework.reasoning_text';
const maxMetadataDepth = 5;
export function frameworkIdentity() {
    return {
        name: frameworkName,
        source: frameworkSource,
        language: frameworkLanguage,
    };
}
export function buildFrameworkTags(extraTags) {
    return {
        ...(extraTags ?? {}),
        'sigil.framework.name': frameworkName,
        'sigil.framework.source': frameworkSource,
        'sigil.framework.language': frameworkLanguage,
    };
}
export function buildFrameworkMetadata(extraMetadata, stepType, reasoningText) {
    const raw = {
        ...(extraMetadata ?? {}),
        'sigil.framework.name': frameworkName,
        'sigil.framework.source': frameworkSource,
        'sigil.framework.language': frameworkLanguage,
    };
    if (stepType !== undefined) {
        raw[stepTypeMetadataKey] = stepType;
    }
    if (reasoningText !== undefined) {
        raw[reasoningTextMetadataKey] = reasoningText;
    }
    return normalizeMetadata(raw);
}
export function fallbackConversationId(suffix) {
    return `${frameworkConversationPrefix}${suffix}`;
}
export function resolveConversationId(params) {
    const explicit = asString(params.explicitConversationId);
    if (explicit.length > 0) {
        return { conversationId: explicit, source: 'explicit' };
    }
    const fromResolver = asString(params.resolver?.(params.stepStartEvent));
    if (fromResolver.length > 0) {
        return { conversationId: fromResolver, source: 'resolver' };
    }
    return {
        conversationId: fallbackConversationId(params.fallbackSeed),
        source: 'fallback',
    };
}
export function extractStepNumber(event, fallback) {
    const stepNumber = asNonNegativeInt(event.stepNumber);
    if (stepNumber !== undefined) {
        return stepNumber;
    }
    return fallback;
}
export function mapModelFromStepStart(event) {
    const model = asRecord(event.model);
    const modelName = asString(model?.modelId) || asString(model?.id) || asString(model?.name) || 'unknown';
    const provider = normalizeProvider(asString(model?.provider), modelName);
    return {
        provider,
        modelName,
    };
}
export function mapResponseFromStepFinish(event) {
    const response = asRecord(event.response);
    const responseId = asString(response?.id);
    const responseModel = asString(response?.modelId) || asString(event.modelId);
    const finishReason = asString(event.finishReason);
    return {
        responseId: responseId.length > 0 ? responseId : undefined,
        responseModel: responseModel.length > 0 ? responseModel : undefined,
        finishReason: finishReason.length > 0 ? finishReason : undefined,
    };
}
export function shouldTreatStepAsError(event) {
    const finishReason = asString(event.finishReason).toLowerCase();
    if (finishReason === 'error') {
        return true;
    }
    return event.error !== undefined;
}
export function mapUsageFromStepFinish(event) {
    const usage = asRecord(event.usage);
    if (usage === undefined) {
        return undefined;
    }
    const inputTokens = numberFromCandidates([usage.inputTokens, usage.promptTokens]);
    const outputTokens = numberFromCandidates([usage.outputTokens, usage.completionTokens]);
    const totalTokens = numberFromCandidates([usage.totalTokens]);
    const inputDetails = asRecord(usage.inputTokenDetails);
    const outputDetails = asRecord(usage.outputTokenDetails);
    const cacheReadTokens = numberFromCandidates([inputDetails?.cacheReadTokens]);
    const cacheWriteTokens = numberFromCandidates([inputDetails?.cacheWriteTokens]);
    const cacheCreationTokens = numberFromCandidates([inputDetails?.cacheCreationTokens]);
    const reasoningTokens = numberFromCandidates([outputDetails?.reasoningTokens]);
    const hasUsagePayload = inputTokens !== undefined ||
        outputTokens !== undefined ||
        totalTokens !== undefined ||
        inputDetails !== undefined ||
        outputDetails !== undefined;
    if (!hasUsagePayload) {
        return undefined;
    }
    const resolvedInput = inputTokens ?? 0;
    const resolvedOutput = outputTokens ?? 0;
    const resolvedTotal = totalTokens ?? resolvedInput + resolvedOutput;
    return {
        inputTokens: resolvedInput,
        outputTokens: resolvedOutput,
        totalTokens: resolvedTotal,
        cacheReadInputTokens: cacheReadTokens ?? 0,
        cacheWriteInputTokens: cacheWriteTokens ?? 0,
        cacheCreationInputTokens: cacheCreationTokens ?? 0,
        reasoningTokens: reasoningTokens ?? 0,
    };
}
export function mapInputMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }
    const output = [];
    for (const rawMessage of messages) {
        const message = mapSingleMessage(rawMessage);
        if (message !== undefined) {
            output.push(message);
        }
    }
    return output;
}
export function mapStepOutput(event) {
    const text = asString(event.text);
    const reasoningText = asString(event.reasoningText);
    const parsedToolCalls = parseToolCalls(event.toolCalls);
    const parsedToolResults = parseToolResults(event.toolResults);
    const stepType = deriveStepType({
        stepType: event.stepType,
        stepNumber: event.stepNumber,
        hasToolResults: parsedToolResults.length > 0,
    });
    const assistantParts = [];
    if (text.length > 0) {
        assistantParts.push({
            type: 'text',
            text,
        });
    }
    for (const toolCall of parsedToolCalls) {
        assistantParts.push({
            type: 'tool_call',
            toolCall: {
                id: toolCall.id,
                name: toolCall.name,
                inputJSON: toolCall.inputJSON,
            },
        });
    }
    const outputMessages = [];
    if (assistantParts.length > 0) {
        outputMessages.push({
            role: 'assistant',
            content: text.length > 0 ? text : undefined,
            parts: assistantParts,
        });
    }
    for (const toolResult of parsedToolResults) {
        outputMessages.push({
            role: 'tool',
            name: toolResult.name,
            content: toolResult.content,
            parts: [
                {
                    type: 'tool_result',
                    toolResult: {
                        toolCallId: toolResult.toolCallId,
                        name: toolResult.name,
                        content: toolResult.content,
                        contentJSON: toolResult.contentJSON,
                        isError: toolResult.isError,
                    },
                },
            ],
        });
    }
    return {
        output: outputMessages.length > 0 ? outputMessages : undefined,
        stepType,
        reasoningText: reasoningText.length > 0 ? reasoningText : undefined,
    };
}
export function parseToolCallStart(event) {
    const toolCall = asRecord(event.toolCall);
    const toolCallId = asString(toolCall?.toolCallId);
    if (toolCallId.length === 0) {
        return undefined;
    }
    const toolName = asString(toolCall?.toolName) || 'framework_tool';
    const toolType = asString(toolCall?.type);
    const description = asString(toolCall?.description);
    const input = toolCall?.input;
    return {
        toolCallId,
        toolName,
        input,
        toolType: toolType.length > 0 ? toolType : undefined,
        description: description.length > 0 ? description : undefined,
    };
}
export function parseToolCallFinish(event) {
    const toolCall = asRecord(event.toolCall);
    const toolCallId = asString(toolCall?.toolCallId);
    if (toolCallId.length === 0) {
        return undefined;
    }
    const success = asBoolean(event.success, event.error === undefined);
    const durationMs = asNonNegativeInt(event.durationMs);
    return {
        toolCallId,
        success,
        output: event.output,
        error: event.error,
        durationMs,
    };
}
export function isTextChunk(event) {
    const directType = asString(event.type);
    if (isTextChunkType(directType)) {
        return true;
    }
    const chunk = asRecord(event.chunk);
    return isTextChunkType(asString(chunk?.type));
}
function isTextChunkType(type) {
    return type === 'text' || type === 'text-delta';
}
export function normalizeMetadata(raw) {
    const output = {};
    const seen = new WeakSet();
    for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = key.trim();
        if (normalizedKey.length === 0) {
            continue;
        }
        const normalizedValue = normalizeMetadataValue(value, 0, seen);
        if (normalizedValue !== undefined) {
            output[normalizedKey] = normalizedValue;
        }
    }
    return output;
}
function normalizeMetadataValue(value, depth, seen) {
    if (depth > maxMetadataDepth || value === undefined) {
        return undefined;
    }
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
    }
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
        return undefined;
    }
    if (Array.isArray(value)) {
        const normalizedItems = [];
        for (const item of value) {
            const normalized = normalizeMetadataValue(item, depth + 1, seen);
            if (normalized !== undefined) {
                normalizedItems.push(normalized);
            }
        }
        return normalizedItems;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    if (seen.has(value)) {
        return '[circular]';
    }
    seen.add(value);
    try {
        const output = {};
        for (const [key, nestedValue] of Object.entries(value)) {
            const normalizedKey = key.trim();
            if (normalizedKey.length === 0) {
                continue;
            }
            const normalizedValue = normalizeMetadataValue(nestedValue, depth + 1, seen);
            if (normalizedValue !== undefined) {
                output[normalizedKey] = normalizedValue;
            }
        }
        return output;
    }
    finally {
        seen.delete(value);
    }
}
function normalizeProvider(explicitProvider, modelName) {
    const normalizedProvider = explicitProvider.trim().toLowerCase();
    const canonicalProvider = canonicalizeProvider(normalizedProvider);
    if (canonicalProvider !== undefined) {
        return canonicalProvider;
    }
    if (normalizedProvider.length > 0) {
        return 'custom';
    }
    return inferProviderFromModel(modelName);
}
function canonicalizeProvider(normalizedProvider) {
    if (matchesProvider(normalizedProvider, 'openai')) {
        return 'openai';
    }
    if (matchesProvider(normalizedProvider, 'anthropic')) {
        return 'anthropic';
    }
    if (matchesProvider(normalizedProvider, 'gemini') || matchesProvider(normalizedProvider, 'google')) {
        return 'gemini';
    }
    return undefined;
}
function matchesProvider(value, providerPrefix) {
    if (value === providerPrefix) {
        return true;
    }
    if (!value.startsWith(providerPrefix)) {
        return false;
    }
    const separator = value.charAt(providerPrefix.length);
    return separator === '.' || separator === ':' || separator === '/' || separator === '_' || separator === '-';
}
function inferProviderFromModel(modelName) {
    const normalized = modelName.trim().toLowerCase();
    if (normalized.startsWith('gpt-') ||
        normalized.startsWith('o1') ||
        normalized.startsWith('o3') ||
        normalized.startsWith('o4')) {
        return 'openai';
    }
    if (normalized.startsWith('claude-')) {
        return 'anthropic';
    }
    if (normalized.startsWith('gemini-')) {
        return 'gemini';
    }
    return 'custom';
}
function normalizeStepType(value) {
    const normalized = asString(value).toLowerCase();
    if (normalized === 'initial' || normalized === 'continue' || normalized === 'tool-result') {
        return normalized;
    }
    return undefined;
}
function deriveStepType(params) {
    const explicit = normalizeStepType(params.stepType);
    if (explicit !== undefined) {
        return explicit;
    }
    if (params.hasToolResults) {
        return 'tool-result';
    }
    const stepNumber = asNonNegativeInt(params.stepNumber);
    if (stepNumber === 0) {
        return 'initial';
    }
    if (stepNumber !== undefined) {
        return 'continue';
    }
    return undefined;
}
function parseToolCalls(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const output = [];
    for (const rawToolCall of value) {
        const toolCall = asRecord(rawToolCall);
        if (toolCall === undefined) {
            continue;
        }
        const id = asString(toolCall.toolCallId) || asString(toolCall.callId) || asString(toolCall.id);
        const name = asString(toolCall.toolName) || asString(toolCall.name);
        if (name.length === 0) {
            continue;
        }
        output.push({
            id: id.length > 0 ? id : undefined,
            name,
            inputJSON: maybeJSONStringify(toolCall.input ?? toolCall.arguments),
        });
    }
    return output;
}
function parseToolResults(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const output = [];
    for (const rawToolResult of value) {
        const toolResult = asRecord(rawToolResult);
        if (toolResult === undefined) {
            continue;
        }
        const toolCallId = asString(toolResult.toolCallId) || asString(toolResult.callId) || asString(toolResult.id);
        const name = asString(toolResult.toolName) || asString(toolResult.name);
        const isError = asBoolean(toolResult.isError, false);
        const rawContent = toolResult.output ?? toolResult.result ?? toolResult.content;
        const content = typeof rawContent === 'string' ? rawContent.trim() : undefined;
        const contentJSON = content === undefined ? maybeJSONStringify(rawContent) : undefined;
        output.push({
            toolCallId: toolCallId.length > 0 ? toolCallId : undefined,
            name: name.length > 0 ? name : undefined,
            content,
            contentJSON,
            isError,
        });
    }
    return output;
}
function mapSingleMessage(rawMessage) {
    if (!isRecord(rawMessage)) {
        const text = asString(rawMessage);
        if (text.length === 0) {
            return undefined;
        }
        return {
            role: 'user',
            content: text,
        };
    }
    const role = normalizeRole(rawMessage.role ?? rawMessage.type);
    const name = asString(rawMessage.name);
    const messageName = name.length > 0 ? name : undefined;
    const content = rawMessage.content;
    if (typeof content === 'string') {
        const text = content.trim();
        if (text.length === 0) {
            return undefined;
        }
        return {
            role,
            name: messageName,
            content: text,
        };
    }
    const parts = mapMessageParts(content);
    const fallbackText = extractFallbackText(content);
    const textFromParts = extractTextFromParts(parts);
    const messageContent = fallbackText.length > 0 ? fallbackText : textFromParts;
    if (parts.length === 0 && messageContent.length === 0) {
        return undefined;
    }
    return {
        role,
        name: messageName,
        content: messageContent.length > 0 ? messageContent : undefined,
        parts: parts.length > 0 ? parts : undefined,
    };
}
function mapMessageParts(content) {
    const rawParts = Array.isArray(content) ? content : isRecord(content) ? [content] : [];
    const parts = [];
    for (const rawPart of rawParts) {
        const mapped = mapSinglePart(rawPart);
        if (mapped !== undefined) {
            parts.push(mapped);
        }
    }
    return parts;
}
function mapSinglePart(rawPart) {
    if (typeof rawPart === 'string') {
        const text = rawPart.trim();
        if (text.length === 0) {
            return undefined;
        }
        return {
            type: 'text',
            text,
        };
    }
    const part = asRecord(rawPart);
    if (part === undefined) {
        return undefined;
    }
    const type = asString(part.type).toLowerCase();
    const text = asString(part.text);
    if (type === 'text' || (type.length === 0 && text.length > 0)) {
        if (text.length === 0) {
            return undefined;
        }
        return {
            type: 'text',
            text,
        };
    }
    if (type === 'reasoning' || type === 'thinking') {
        const thinking = text;
        if (thinking.length === 0) {
            return undefined;
        }
        return {
            type: 'thinking',
            thinking,
        };
    }
    if (type === 'tool-call' || type === 'tool_call') {
        const name = asString(part.toolName) || asString(part.name);
        if (name.length === 0) {
            return undefined;
        }
        const id = asString(part.toolCallId) || asString(part.callId) || asString(part.id);
        const inputJSON = maybeJSONStringify(part.input ?? part.arguments);
        return {
            type: 'tool_call',
            toolCall: {
                id: id.length > 0 ? id : undefined,
                name,
                inputJSON,
            },
        };
    }
    if (type === 'tool-result' || type === 'tool_result') {
        const toolCallId = asString(part.toolCallId) || asString(part.callId) || asString(part.id);
        const name = asString(part.toolName) || asString(part.name);
        const rawResult = part.result ?? part.output ?? part.content;
        const content = typeof rawResult === 'string' ? rawResult.trim() : undefined;
        const contentJSON = content === undefined ? maybeJSONStringify(rawResult) : undefined;
        const isError = asBoolean(part.isError, false);
        return {
            type: 'tool_result',
            toolResult: {
                toolCallId: toolCallId.length > 0 ? toolCallId : undefined,
                name: name.length > 0 ? name : undefined,
                content,
                contentJSON,
                isError,
            },
        };
    }
    return undefined;
}
function extractFallbackText(content) {
    if (!isRecord(content)) {
        return '';
    }
    return asString(content.text);
}
function extractTextFromParts(parts) {
    const textParts = parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text.trim())
        .filter((part) => part.length > 0);
    return textParts.join(' ').trim();
}
function normalizeRole(value) {
    const normalized = asString(value).toLowerCase();
    if (normalized === 'assistant' || normalized === 'ai') {
        return 'assistant';
    }
    if (normalized === 'tool') {
        return 'tool';
    }
    return 'user';
}
function maybeJSONStringify(value) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        if (isJSON(trimmed)) {
            return trimmed;
        }
        return JSON.stringify(trimmed);
    }
    try {
        const encoded = JSON.stringify(value);
        if (encoded === undefined || encoded === 'null') {
            return undefined;
        }
        return encoded;
    }
    catch {
        return undefined;
    }
}
function numberFromCandidates(values) {
    for (const value of values) {
        const parsed = asNonNegativeInt(value);
        if (parsed !== undefined) {
            return parsed;
        }
    }
    return undefined;
}
function asRecord(value) {
    return isRecord(value) ? value : undefined;
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
function asBoolean(value, fallback) {
    if (typeof value === 'boolean') {
        return value;
    }
    return fallback;
}
function asNonNegativeInt(value) {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return undefined;
        }
        if (value < 0) {
            return undefined;
        }
        return Math.trunc(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        const parsed = Number.parseInt(trimmed, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
            return undefined;
        }
        return parsed;
    }
    return undefined;
}
function isJSON(value) {
    try {
        JSON.parse(value);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=mapping.js.map