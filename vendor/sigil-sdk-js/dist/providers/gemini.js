const thinkingBudgetMetadataKey = 'sigil.gen_ai.request.thinking.budget_tokens';
const thinkingLevelMetadataKey = 'sigil.gen_ai.request.thinking.level';
const usageToolUsePromptTokensMetadataKey = 'sigil.gen_ai.usage.tool_use_prompt_tokens';
async function geminiGenerateContent(client, model, contents, config, providerCall, options = {}) {
    const controls = mapGeminiRequestControls(config);
    return client.startGeneration({
        conversationId: options.conversationId,
        agentName: options.agentName,
        agentVersion: options.agentVersion,
        model: {
            provider: 'gemini',
            name: model,
        },
        systemPrompt: extractGeminiSystemPrompt(config),
        maxTokens: controls.maxTokens,
        temperature: controls.temperature,
        topP: controls.topP,
        toolChoice: controls.toolChoice,
        thinkingEnabled: controls.thinkingEnabled,
        tools: mapGeminiTools(config),
        tags: options.tags,
        metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget, controls.thinkingLevel),
    }, async (recorder) => {
        const response = await providerCall(model, contents, config);
        recorder.setResult(geminiFromRequestResponse(model, contents, config, response, options));
        return response;
    });
}
async function geminiGenerateContentStream(client, model, contents, config, providerCall, options = {}) {
    const controls = mapGeminiRequestControls(config);
    return client.startStreamingGeneration({
        conversationId: options.conversationId,
        agentName: options.agentName,
        agentVersion: options.agentVersion,
        model: {
            provider: 'gemini',
            name: model,
        },
        systemPrompt: extractGeminiSystemPrompt(config),
        maxTokens: controls.maxTokens,
        temperature: controls.temperature,
        topP: controls.topP,
        toolChoice: controls.toolChoice,
        thinkingEnabled: controls.thinkingEnabled,
        tools: mapGeminiTools(config),
        tags: options.tags,
        metadata: metadataWithThinkingBudget(options.metadata, controls.thinkingBudget, controls.thinkingLevel),
    }, async (recorder) => {
        const summary = await providerCall(model, contents, config);
        const firstChunkAt = asDate(summary.firstChunkAt);
        if (firstChunkAt !== undefined) {
            recorder.setFirstTokenAt(firstChunkAt);
        }
        recorder.setResult(geminiFromStream(model, contents, config, summary, options));
        return summary;
    });
}
async function geminiEmbedContent(client, model, contents, config, providerCall, options = {}) {
    const requestedDimensions = readIntFromAny(config?.outputDimensionality) ??
        readIntFromAny(config?.output_dimensionality);
    return client.startEmbedding({
        agentName: options.agentName,
        agentVersion: options.agentVersion,
        model: {
            provider: 'gemini',
            name: model,
        },
        dimensions: requestedDimensions,
        tags: options.tags,
        metadata: options.metadata,
    }, async (recorder) => {
        const response = await providerCall(model, contents, config);
        recorder.setResult(geminiEmbeddingFromResponse(model, contents, config, response));
        return response;
    });
}
function geminiEmbeddingFromResponse(_model, contents, config, response) {
    const result = {
        inputCount: embeddingInputCount(contents),
        inputTexts: embeddingInputTexts(contents),
    };
    const requestedDimensions = readIntFromAny(config?.outputDimensionality) ??
        readIntFromAny(config?.output_dimensionality);
    if (!isRecord(response)) {
        if (requestedDimensions !== undefined && requestedDimensions > 0) {
            result.dimensions = requestedDimensions;
        }
        return result;
    }
    const embeddings = Array.isArray(response.embeddings) ? response.embeddings : [];
    let inputTokens = 0;
    for (const embedding of embeddings) {
        if (!isRecord(embedding)) {
            continue;
        }
        const statistics = isRecord(embedding.statistics) ? embedding.statistics : undefined;
        const tokenCount = readIntFromAny(statistics?.tokenCount) ?? readIntFromAny(statistics?.token_count);
        if (tokenCount !== undefined && tokenCount > 0) {
            inputTokens += tokenCount;
        }
        if (result.dimensions === undefined && Array.isArray(embedding.values) && embedding.values.length > 0) {
            result.dimensions = embedding.values.length;
        }
    }
    if (inputTokens > 0) {
        result.inputTokens = inputTokens;
    }
    if (result.dimensions === undefined && requestedDimensions !== undefined && requestedDimensions > 0) {
        result.dimensions = requestedDimensions;
    }
    return result;
}
function geminiFromRequestResponse(model, contents, config, response, options = {}) {
    const controls = mapGeminiRequestControls(config);
    const output = mapGeminiResponseOutput(response);
    const usageMetadata = geminiUsageMetadata(response.usageMetadata);
    const result = {
        responseId: asString(response.responseId),
        responseModel: asString(response.modelVersion) || model,
        maxTokens: controls.maxTokens,
        temperature: controls.temperature,
        topP: controls.topP,
        toolChoice: controls.toolChoice,
        thinkingEnabled: controls.thinkingEnabled,
        input: mapGeminiInput(contents),
        output,
        tools: mapGeminiTools(config),
        usage: mapGeminiUsage(response.usageMetadata),
        stopReason: mapGeminiStopReason(response),
        metadata: mergeMetadata(metadataWithThinkingBudget(options.metadata, controls.thinkingBudget, controls.thinkingLevel), usageMetadata),
        tags: options.tags ? { ...options.tags } : undefined,
    };
    if (options.rawArtifacts) {
        result.artifacts = [
            jsonArtifact('request', 'gemini.models.request', { model, contents, config }),
            jsonArtifact('response', 'gemini.models.response', response),
        ];
        if ((result.tools ?? []).length > 0) {
            result.artifacts.push(jsonArtifact('tools', 'gemini.models.tools', result.tools));
        }
    }
    return result;
}
function geminiFromStream(model, contents, config, summary, options = {}) {
    const controls = mapGeminiRequestControls(config);
    const responses = summary.responses ?? [];
    const finalResponse = summary.finalResponse ?? (responses.length > 0 ? responses[responses.length - 1] : undefined);
    const outputText = summary.outputText ?? extractGeminiStreamText(responses);
    const fallbackOutput = outputText.length > 0 ? [{ role: 'assistant', content: outputText }] : [];
    const streamUsageMetadata = geminiStreamUsageMetadata(responses);
    const result = finalResponse
        ? {
            ...geminiFromRequestResponse(model, contents, config, finalResponse, options),
            output: mapGeminiResponseOutput(finalResponse).length > 0 ? mapGeminiResponseOutput(finalResponse) : fallbackOutput,
        }
        : {
            responseModel: model,
            maxTokens: controls.maxTokens,
            temperature: controls.temperature,
            topP: controls.topP,
            toolChoice: controls.toolChoice,
            thinkingEnabled: controls.thinkingEnabled,
            input: mapGeminiInput(contents),
            output: fallbackOutput,
            tools: mapGeminiTools(config),
            metadata: mergeMetadata(metadataWithThinkingBudget(options.metadata, controls.thinkingBudget, controls.thinkingLevel), streamUsageMetadata),
            tags: options.tags ? { ...options.tags } : undefined,
        };
    if (options.rawArtifacts) {
        const existing = result.artifacts ?? [];
        if (!existing.some((artifact) => artifact.type === 'request')) {
            existing.push(jsonArtifact('request', 'gemini.models.request', { model, contents, config }));
        }
        if ((result.tools ?? []).length > 0 && !existing.some((artifact) => artifact.type === 'tools')) {
            existing.push(jsonArtifact('tools', 'gemini.models.tools', result.tools));
        }
        existing.push(jsonArtifact('provider_event', 'gemini.models.stream_events', responses));
        result.artifacts = existing;
    }
    return result;
}
export const models = {
    generateContent: geminiGenerateContent,
    generateContentStream: geminiGenerateContentStream,
    embedContent: geminiEmbedContent,
    fromRequestResponse: geminiFromRequestResponse,
    fromStream: geminiFromStream,
    embeddingFromResponse: geminiEmbeddingFromResponse,
};
function embeddingInputCount(contents) {
    let count = 0;
    for (const content of contents) {
        if (content !== undefined && content !== null) {
            count += 1;
        }
    }
    return count;
}
function embeddingInputTexts(contents) {
    const output = [];
    for (const content of contents) {
        if (typeof content === 'string') {
            const text = content.trim();
            if (text.length > 0) {
                output.push(text);
            }
            continue;
        }
        if (!isRecord(content)) {
            continue;
        }
        const text = extractText(content.parts);
        if (text.length > 0) {
            output.push(text);
        }
    }
    return output.length > 0 ? output : undefined;
}
function mapGeminiInput(contents) {
    const input = [];
    for (const rawContent of contents) {
        if (typeof rawContent === 'string') {
            const text = rawContent.trim();
            if (text.length > 0) {
                input.push({ role: 'user', content: text });
            }
            continue;
        }
        if (!isRecord(rawContent)) {
            continue;
        }
        const role = normalizeRole(asString(rawContent.role));
        const parts = mapGeminiParts(rawContent.parts, role);
        const text = extractText(rawContent.parts);
        if (parts.length > 0) {
            const hasToolResult = parts.some((part) => part.type === 'tool_result');
            input.push({
                role: hasToolResult ? 'tool' : role,
                content: text || undefined,
                parts,
            });
            continue;
        }
        if (text.length > 0) {
            input.push({ role, content: text });
        }
    }
    return input;
}
function mapGeminiResponseOutput(response) {
    const output = [];
    const candidates = Array.isArray(response.candidates)
        ? response.candidates
        : [];
    for (const rawCandidate of candidates) {
        if (!isRecord(rawCandidate) || !isRecord(rawCandidate.content)) {
            continue;
        }
        const role = normalizeRole(asString(rawCandidate.content.role) || 'assistant');
        const parts = mapGeminiParts(rawCandidate.content.parts, role);
        const text = extractText(rawCandidate.content.parts);
        if (parts.length === 0 && text.length === 0) {
            continue;
        }
        output.push({
            role,
            content: text || undefined,
            parts: parts.length > 0 ? parts : undefined,
        });
    }
    return output;
}
function mapGeminiParts(rawParts, role) {
    if (!Array.isArray(rawParts)) {
        return [];
    }
    const parts = [];
    for (const rawPart of rawParts) {
        if (!isRecord(rawPart)) {
            continue;
        }
        if (typeof rawPart.text === 'string' && rawPart.text.trim().length > 0) {
            if (rawPart.thought === true && role === 'assistant') {
                parts.push({
                    type: 'thinking',
                    thinking: rawPart.text,
                    metadata: { providerType: 'thought' },
                });
            }
            else {
                parts.push({
                    type: 'text',
                    text: rawPart.text,
                    metadata: { providerType: 'text' },
                });
            }
        }
        if (isRecord(rawPart.functionCall)) {
            const name = asString(rawPart.functionCall.name);
            if (name.length > 0) {
                parts.push({
                    type: 'tool_call',
                    toolCall: {
                        id: asString(rawPart.functionCall.id) || undefined,
                        name,
                        inputJSON: jsonString(rawPart.functionCall.args),
                    },
                    metadata: { providerType: 'function_call' },
                });
            }
        }
        if (isRecord(rawPart.functionResponse)) {
            const responseValue = rawPart.functionResponse.response;
            parts.push({
                type: 'tool_result',
                toolResult: {
                    toolCallId: asString(rawPart.functionResponse.id) || undefined,
                    name: asString(rawPart.functionResponse.name) || undefined,
                    content: extractText(responseValue) || undefined,
                    contentJSON: jsonString(responseValue),
                    isError: typeof rawPart.functionResponse.isError === 'boolean' ? rawPart.functionResponse.isError : undefined,
                },
                metadata: { providerType: 'function_response' },
            });
        }
    }
    return parts;
}
function mapGeminiTools(config) {
    if (!isRecord(config) || !Array.isArray(config.tools)) {
        return [];
    }
    const out = [];
    for (const rawTool of config.tools) {
        if (!isRecord(rawTool) || !Array.isArray(rawTool.functionDeclarations)) {
            continue;
        }
        for (const rawDeclaration of rawTool.functionDeclarations) {
            if (!isRecord(rawDeclaration)) {
                continue;
            }
            const name = asString(rawDeclaration.name);
            if (name.length === 0) {
                continue;
            }
            out.push({
                name,
                description: asString(rawDeclaration.description) || undefined,
                type: 'function',
                inputSchemaJSON: hasValue(rawDeclaration.parametersJsonSchema)
                    ? jsonString(rawDeclaration.parametersJsonSchema)
                    : undefined,
            });
        }
    }
    return out;
}
function mapGeminiUsage(rawUsage) {
    if (!isRecord(rawUsage)) {
        return undefined;
    }
    const inputTokens = readIntFromAny(rawUsage.promptTokenCount);
    const outputTokens = readIntFromAny(rawUsage.candidatesTokenCount);
    const totalTokens = readIntFromAny(rawUsage.totalTokenCount);
    const cacheReadInputTokens = readIntFromAny(rawUsage.cachedContentTokenCount);
    const cacheCreationInputTokens = readIntFromAny(rawUsage.cacheCreationInputTokenCount);
    const toolUsePromptTokens = readIntFromAny(rawUsage.toolUsePromptTokenCount);
    const reasoningTokens = readIntFromAny(rawUsage.thoughtsTokenCount);
    const out = {};
    if (inputTokens !== undefined) {
        out.inputTokens = inputTokens;
    }
    if (outputTokens !== undefined) {
        out.outputTokens = outputTokens;
    }
    if (totalTokens !== undefined) {
        out.totalTokens = totalTokens;
    }
    else if (inputTokens !== undefined || outputTokens !== undefined) {
        out.totalTokens = (inputTokens ?? 0) + (outputTokens ?? 0) + (toolUsePromptTokens ?? 0) + (reasoningTokens ?? 0);
    }
    if (cacheReadInputTokens !== undefined) {
        out.cacheReadInputTokens = cacheReadInputTokens;
    }
    if (cacheCreationInputTokens !== undefined) {
        out.cacheCreationInputTokens = cacheCreationInputTokens;
    }
    if (reasoningTokens !== undefined) {
        out.reasoningTokens = reasoningTokens;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
function geminiUsageMetadata(rawUsage) {
    if (!isRecord(rawUsage)) {
        return undefined;
    }
    const toolUsePromptTokens = readIntFromAny(rawUsage.toolUsePromptTokenCount ?? rawUsage.tool_use_prompt_token_count);
    if (toolUsePromptTokens === undefined || toolUsePromptTokens <= 0) {
        return undefined;
    }
    return {
        [usageToolUsePromptTokensMetadataKey]: toolUsePromptTokens,
    };
}
function mapGeminiStopReason(response) {
    const candidates = Array.isArray(response.candidates)
        ? response.candidates
        : [];
    let stopReason;
    for (const rawCandidate of candidates) {
        if (!isRecord(rawCandidate)) {
            continue;
        }
        const candidateStopReason = asString(rawCandidate.finishReason);
        if (candidateStopReason.length > 0) {
            stopReason = candidateStopReason.toUpperCase();
        }
    }
    return stopReason;
}
function mapGeminiRequestControls(config) {
    if (!isRecord(config)) {
        return {};
    }
    const toolConfig = isRecord(config.toolConfig) ? config.toolConfig : undefined;
    const functionCallingConfig = toolConfig && isRecord(toolConfig.functionCallingConfig) ? toolConfig.functionCallingConfig : undefined;
    const thinkingConfig = isRecord(config.thinkingConfig) ? config.thinkingConfig : undefined;
    return {
        maxTokens: readIntFromAny(config.maxOutputTokens),
        temperature: readNumberFromAny(config.temperature),
        topP: readNumberFromAny(config.topP),
        toolChoice: canonicalToolChoice(functionCallingConfig?.mode),
        thinkingEnabled: typeof thinkingConfig?.includeThoughts === 'boolean' ? thinkingConfig.includeThoughts : undefined,
        thinkingBudget: readIntFromAny(thinkingConfig?.thinkingBudget),
        thinkingLevel: geminiThinkingLevel(thinkingConfig?.thinkingLevel),
    };
}
function extractGeminiSystemPrompt(config) {
    if (!isRecord(config)) {
        return undefined;
    }
    const instruction = config.systemInstruction;
    if (!hasValue(instruction)) {
        return undefined;
    }
    if (typeof instruction === 'string') {
        const text = instruction.trim();
        return text.length > 0 ? text : undefined;
    }
    if (isRecord(instruction) && Array.isArray(instruction.parts)) {
        const chunks = instruction.parts
            .map((part) => {
            if (!isRecord(part)) {
                return '';
            }
            return typeof part.text === 'string' ? part.text.trim() : '';
        })
            .filter((chunk) => chunk.length > 0);
        if (chunks.length > 0) {
            return chunks.join('\n');
        }
    }
    const fallback = extractText(instruction);
    return fallback.length > 0 ? fallback : undefined;
}
function extractGeminiStreamText(responses) {
    const chunks = [];
    for (const response of responses) {
        const output = mapGeminiResponseOutput(response);
        for (const message of output) {
            if (typeof message.content === 'string' && message.content.trim().length > 0) {
                chunks.push(message.content.trim());
            }
        }
    }
    return chunks.join('\n');
}
function normalizeRole(value) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'assistant' || normalized === 'model') {
        return 'assistant';
    }
    if (normalized === 'tool') {
        return 'tool';
    }
    return 'user';
}
function canonicalToolChoice(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized.length > 0 ? normalized : undefined;
    }
    if (isRecord(value) && 'value' in value) {
        const normalized = String(value.value ?? '')
            .trim()
            .toLowerCase();
        return normalized.length > 0 ? normalized : undefined;
    }
    return jsonString(value);
}
function metadataWithThinkingBudget(metadata, thinkingBudget, thinkingLevel) {
    if (thinkingBudget === undefined && thinkingLevel === undefined) {
        return metadata ? { ...metadata } : undefined;
    }
    const out = metadata ? { ...metadata } : {};
    if (thinkingBudget !== undefined) {
        out[thinkingBudgetMetadataKey] = thinkingBudget;
    }
    if (thinkingLevel !== undefined) {
        out[thinkingLevelMetadataKey] = thinkingLevel;
    }
    return out;
}
function geminiThinkingLevel(value) {
    const raw = asString(value).toLowerCase();
    if (raw.length === 0 || raw === 'thinking_level_unspecified') {
        return undefined;
    }
    if (raw === 'thinking_level_low' || raw === 'low') {
        return 'low';
    }
    if (raw === 'thinking_level_medium' || raw === 'medium') {
        return 'medium';
    }
    if (raw === 'thinking_level_high' || raw === 'high') {
        return 'high';
    }
    if (raw === 'thinking_level_minimal' || raw === 'minimal') {
        return 'minimal';
    }
    return raw;
}
function geminiStreamUsageMetadata(responses) {
    for (let index = responses.length - 1; index >= 0; index -= 1) {
        const metadata = geminiUsageMetadata(responses[index].usageMetadata);
        if (metadata !== undefined) {
            return metadata;
        }
    }
    return undefined;
}
function mergeMetadata(base, extra) {
    if (base === undefined) {
        return extra ? { ...extra } : undefined;
    }
    if (extra === undefined) {
        return { ...base };
    }
    return { ...base, ...extra };
}
function extractText(value) {
    if (!hasValue(value)) {
        return '';
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    if (Array.isArray(value)) {
        const chunks = [];
        for (const item of value) {
            const chunk = extractText(item);
            if (chunk.length > 0) {
                chunks.push(chunk);
            }
        }
        return chunks.join('\n');
    }
    if (isRecord(value)) {
        if (typeof value.text === 'string' && value.text.trim().length > 0) {
            return value.text.trim();
        }
        if ('content' in value && value.content !== undefined && value.content !== null) {
            return extractText(value.content);
        }
    }
    return String(value).trim();
}
function asString(value) {
    if (typeof value === 'string') {
        return value.trim();
    }
    return value === undefined || value === null ? '' : String(value).trim();
}
function readIntFromAny(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const asInt = Math.trunc(value);
        return Number.isNaN(asInt) ? undefined : asInt;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value.trim(), 10);
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}
function readNumberFromAny(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.trim());
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}
function jsonArtifact(type, name, payload) {
    return {
        type,
        name,
        payload: jsonString(payload),
        mimeType: 'application/json',
    };
}
function jsonString(value) {
    try {
        return JSON.stringify(value, objectKeySorter);
    }
    catch {
        return String(value ?? '');
    }
}
function objectKeySorter(_key, value) {
    if (!isRecord(value) || Array.isArray(value)) {
        return value;
    }
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
        sorted[key] = value[key];
    }
    return sorted;
}
function hasValue(value) {
    return value !== undefined && value !== null;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function asDate(value) {
    if (value === undefined) {
        return undefined;
    }
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date;
}
//# sourceMappingURL=gemini.js.map