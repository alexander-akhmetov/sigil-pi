import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
const frameworkInstrumentationName = 'github.com/grafana/sigil/sdks/js/frameworks';
const spanAttrOperationName = 'gen_ai.operation.name';
const spanAttrConversationID = 'gen_ai.conversation.id';
const spanAttrFrameworkName = 'sigil.framework.name';
const spanAttrFrameworkSource = 'sigil.framework.source';
const spanAttrFrameworkLanguage = 'sigil.framework.language';
const spanAttrFrameworkRunID = 'sigil.framework.run_id';
const spanAttrFrameworkThreadID = 'sigil.framework.thread_id';
const spanAttrFrameworkParentRunID = 'sigil.framework.parent_run_id';
const spanAttrFrameworkComponentName = 'sigil.framework.component_name';
const spanAttrFrameworkRunType = 'sigil.framework.run_type';
const spanAttrFrameworkTags = 'sigil.framework.tags';
const spanAttrFrameworkRetryAttempt = 'sigil.framework.retry_attempt';
const spanAttrFrameworkLangGraphNode = 'sigil.framework.langgraph.node';
const spanAttrFrameworkEventID = 'sigil.framework.event_id';
const spanAttrErrorType = 'error.type';
const spanAttrErrorCategory = 'error.category';
const frameworkSource = 'handler';
const maxFrameworkMetadataDepth = 5;
export class SigilFrameworkHandler {
    client;
    frameworkName;
    frameworkLanguage;
    runs = new Map();
    toolRuns = new Map();
    chainSpans = new Map();
    retrieverSpans = new Map();
    agentName;
    agentVersion;
    providerResolver;
    provider;
    captureInputs;
    captureOutputs;
    extraTags;
    extraMetadata;
    constructor(client, frameworkName, frameworkLanguage, options = {}) {
        this.client = client;
        this.frameworkName = frameworkName;
        this.frameworkLanguage = frameworkLanguage;
        this.agentName = options.agentName;
        this.agentVersion = options.agentVersion;
        this.providerResolver = options.providerResolver ?? 'auto';
        this.provider = options.provider;
        this.captureInputs = options.captureInputs ?? true;
        this.captureOutputs = options.captureOutputs ?? true;
        this.extraTags = { ...(options.extraTags ?? {}) };
        this.extraMetadata = { ...(options.extraMetadata ?? {}) };
    }
    onLLMStart(serialized, prompts, runId, parentRunId, extraParams, callbackTags, callbackMetadata, runName) {
        const runKey = String(runId);
        if (runKey.length === 0 || this.runs.has(runKey)) {
            return;
        }
        const invocationParams = asRecord(extraParams?.invocation_params);
        const modelName = resolveModelName(serialized, invocationParams);
        const provider = resolveProvider(this.provider, this.providerResolver, modelName, serialized, invocationParams);
        const stream = isStreaming(invocationParams);
        const input = this.captureInputs ? mapPromptInputs(prompts) : [];
        const context = this.buildFrameworkContext({
            runId: runKey,
            parentRunId,
            runType: 'llm',
            runName,
            serialized,
            invocationParams,
            extraParams,
            callbackTags,
            callbackMetadata,
        });
        const payload = this.startPayload(runKey, provider, modelName, context);
        const recorder = stream ? this.client.startStreamingGeneration(payload) : this.client.startGeneration(payload);
        this.runs.set(runKey, {
            recorder,
            input,
            captureOutputs: this.captureOutputs,
            outputChunks: [],
            firstTokenRecorded: false,
        });
    }
    onChatModelStart(serialized, messages, runId, parentRunId, extraParams, callbackTags, callbackMetadata, runName) {
        const runKey = String(runId);
        if (runKey.length === 0 || this.runs.has(runKey)) {
            return;
        }
        const invocationParams = asRecord(extraParams?.invocation_params);
        const modelName = resolveModelName(serialized, invocationParams);
        const provider = resolveProvider(this.provider, this.providerResolver, modelName, serialized, invocationParams);
        const stream = isStreaming(invocationParams);
        const input = this.captureInputs ? mapChatInputs(messages) : [];
        const context = this.buildFrameworkContext({
            runId: runKey,
            parentRunId,
            runType: 'chat',
            runName,
            serialized,
            invocationParams,
            extraParams,
            callbackTags,
            callbackMetadata,
        });
        const payload = this.startPayload(runKey, provider, modelName, context);
        const recorder = stream ? this.client.startStreamingGeneration(payload) : this.client.startGeneration(payload);
        this.runs.set(runKey, {
            recorder,
            input,
            captureOutputs: this.captureOutputs,
            outputChunks: [],
            firstTokenRecorded: false,
        });
    }
    onLLMNewToken(token, runId) {
        const runState = this.runs.get(String(runId));
        if (runState === undefined) {
            return;
        }
        if (typeof token !== 'string' || token.trim().length === 0) {
            return;
        }
        if (runState.captureOutputs) {
            runState.outputChunks.push(token);
        }
        if (!runState.firstTokenRecorded) {
            runState.firstTokenRecorded = true;
            runState.recorder.setFirstTokenAt(new Date());
        }
    }
    onLLMEnd(output, runId) {
        const runState = this.runs.get(String(runId));
        if (runState === undefined) {
            return;
        }
        this.runs.delete(String(runId));
        try {
            const llmOutput = asRecord(read(output, 'llm_output'));
            const responseModel = asString(read(llmOutput, 'model_name'));
            const stopReason = asString(read(llmOutput, 'finish_reason'));
            const usage = mapUsage(read(llmOutput, 'token_usage'));
            let mappedOutput;
            if (runState.captureOutputs) {
                mappedOutput = mapOutputMessages(output);
                if ((mappedOutput?.length ?? 0) === 0 && runState.outputChunks.length > 0) {
                    mappedOutput = [{ role: 'assistant', content: runState.outputChunks.join('') }];
                }
            }
            const result = {
                input: runState.input,
                output: mappedOutput,
                usage,
                responseModel: responseModel.length > 0 ? responseModel : undefined,
                stopReason: stopReason.length > 0 ? stopReason : undefined,
            };
            runState.recorder.setResult(result);
        }
        finally {
            runState.recorder.end();
        }
        const recorderError = runState.recorder.getError();
        if (recorderError !== undefined) {
            throw recorderError;
        }
    }
    onLLMError(error, runId) {
        const runState = this.runs.get(String(runId));
        if (runState === undefined) {
            return;
        }
        this.runs.delete(String(runId));
        try {
            runState.recorder.setCallError(error);
            if (runState.captureOutputs && runState.outputChunks.length > 0) {
                runState.recorder.setResult({
                    input: runState.input,
                    output: [{ role: 'assistant', content: runState.outputChunks.join('') }],
                });
            }
        }
        finally {
            runState.recorder.end();
        }
        const recorderError = runState.recorder.getError();
        if (recorderError !== undefined) {
            throw recorderError;
        }
    }
    onToolStart(serialized, input, runId, parentRunId, callbackTags, callbackMetadata, runName, extraParams) {
        const runKey = String(runId);
        if (runKey.length === 0 || this.toolRuns.has(runKey)) {
            return;
        }
        const invocationParams = asRecord(extraParams?.invocation_params);
        const context = this.buildFrameworkContext({
            runId: runKey,
            parentRunId,
            runType: 'tool',
            runName,
            serialized,
            invocationParams,
            extraParams,
            callbackTags,
            callbackMetadata,
        });
        const toolName = resolveToolName(serialized, context.componentName);
        const recorder = this.client.startToolExecution({
            toolName,
            toolDescription: resolveToolDescription(serialized),
            conversationId: context.conversationId,
            agentName: this.agentName,
            agentVersion: this.agentVersion,
            includeContent: this.captureInputs || this.captureOutputs,
        });
        this.toolRuns.set(runKey, {
            recorder,
            arguments: this.captureInputs ? resolveToolArguments(input, extraParams) : undefined,
            captureOutputs: this.captureOutputs,
        });
    }
    onToolEnd(output, runId) {
        const runState = this.toolRuns.get(String(runId));
        if (runState === undefined) {
            return;
        }
        this.toolRuns.delete(String(runId));
        try {
            const result = {};
            if (runState.arguments !== undefined) {
                result.arguments = runState.arguments;
            }
            if (runState.captureOutputs) {
                result.result = output;
            }
            runState.recorder.setResult(result);
        }
        finally {
            runState.recorder.end();
        }
        const recorderError = runState.recorder.getError();
        if (recorderError !== undefined) {
            throw recorderError;
        }
    }
    onToolError(error, runId) {
        const runState = this.toolRuns.get(String(runId));
        if (runState === undefined) {
            return;
        }
        this.toolRuns.delete(String(runId));
        try {
            runState.recorder.setCallError(error);
        }
        finally {
            runState.recorder.end();
        }
        const recorderError = runState.recorder.getError();
        if (recorderError !== undefined) {
            throw recorderError;
        }
    }
    onChainStart(serialized, runId, parentRunId, callbackTags, callbackMetadata, callbackRunType, runName, extraParams) {
        const runKey = String(runId);
        if (runKey.length === 0 || this.chainSpans.has(runKey)) {
            return;
        }
        const invocationParams = asRecord(extraParams?.invocation_params);
        const context = this.buildFrameworkContext({
            runId: runKey,
            parentRunId,
            runType: notEmpty(callbackRunType) ? String(callbackRunType).trim() : 'chain',
            runName,
            serialized,
            invocationParams,
            extraParams,
            callbackTags,
            callbackMetadata,
        });
        const spanName = notEmpty(context.componentName)
            ? `${this.frameworkName}.chain ${context.componentName}`
            : `${this.frameworkName}.chain`;
        const span = this.getFrameworkTracer().startSpan(spanName, { kind: SpanKind.INTERNAL });
        this.setFrameworkSpanAttributes(span, context, 'framework_chain');
        this.chainSpans.set(runKey, span);
    }
    onChainEnd(runId) {
        this.endFrameworkSpan(this.chainSpans, runId, undefined);
    }
    onChainError(error, runId) {
        this.endFrameworkSpan(this.chainSpans, runId, error);
    }
    onRetrieverStart(serialized, runId, parentRunId, callbackTags, callbackMetadata, runName, extraParams) {
        const runKey = String(runId);
        if (runKey.length === 0 || this.retrieverSpans.has(runKey)) {
            return;
        }
        const invocationParams = asRecord(extraParams?.invocation_params);
        const context = this.buildFrameworkContext({
            runId: runKey,
            parentRunId,
            runType: 'retriever',
            runName,
            serialized,
            invocationParams,
            extraParams,
            callbackTags,
            callbackMetadata,
        });
        const spanName = notEmpty(context.componentName)
            ? `${this.frameworkName}.retriever ${context.componentName}`
            : `${this.frameworkName}.retriever`;
        const span = this.getFrameworkTracer().startSpan(spanName, { kind: SpanKind.INTERNAL });
        this.setFrameworkSpanAttributes(span, context, 'framework_retriever');
        this.retrieverSpans.set(runKey, span);
    }
    onRetrieverEnd(runId) {
        this.endFrameworkSpan(this.retrieverSpans, runId, undefined);
    }
    onRetrieverError(error, runId) {
        this.endFrameworkSpan(this.retrieverSpans, runId, error);
    }
    startPayload(_runId, provider, modelName, context) {
        return {
            conversationId: context.conversationId,
            agentName: this.agentName,
            agentVersion: this.agentVersion,
            model: {
                provider,
                name: modelName,
            },
            tags: context.tags,
            metadata: context.metadata,
        };
    }
    getFrameworkTracer() {
        const internalClient = this.client;
        return internalClient.tracer ?? trace.getTracer(frameworkInstrumentationName);
    }
    setFrameworkSpanAttributes(span, context, operationName) {
        span.setAttribute(spanAttrOperationName, operationName);
        span.setAttribute(spanAttrFrameworkName, this.frameworkName);
        span.setAttribute(spanAttrFrameworkSource, frameworkSource);
        span.setAttribute(spanAttrFrameworkLanguage, this.frameworkLanguage);
        span.setAttribute(spanAttrFrameworkRunID, asString(context.metadata[spanAttrFrameworkRunID]));
        if (notEmpty(context.conversationId)) {
            span.setAttribute(spanAttrConversationID, context.conversationId);
        }
        if (notEmpty(context.threadId)) {
            span.setAttribute(spanAttrFrameworkThreadID, context.threadId);
        }
        if (notEmpty(context.parentRunId)) {
            span.setAttribute(spanAttrFrameworkParentRunID, context.parentRunId);
        }
        if (notEmpty(context.componentName)) {
            span.setAttribute(spanAttrFrameworkComponentName, context.componentName);
        }
        if (notEmpty(context.runType)) {
            span.setAttribute(spanAttrFrameworkRunType, context.runType);
        }
        if (context.retryAttempt !== undefined) {
            span.setAttribute(spanAttrFrameworkRetryAttempt, context.retryAttempt);
        }
        if (notEmpty(context.langgraphNode)) {
            span.setAttribute(spanAttrFrameworkLangGraphNode, context.langgraphNode);
        }
        if (notEmpty(context.eventId)) {
            span.setAttribute(spanAttrFrameworkEventID, context.eventId);
        }
    }
    endFrameworkSpan(spans, runId, error) {
        const runKey = String(runId);
        const span = spans.get(runKey);
        if (span === undefined) {
            return;
        }
        spans.delete(runKey);
        if (error === undefined) {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return;
        }
        span.setAttribute(spanAttrErrorType, 'framework_error');
        span.setAttribute(spanAttrErrorCategory, 'sdk_error');
        span.recordException(asError(error));
        span.setStatus({ code: SpanStatusCode.ERROR, message: asError(error).message });
        span.end();
    }
    buildFrameworkContext(params) {
        const conversation = resolveFrameworkConversationContext(this.frameworkName, params.runId, params.serialized, params.invocationParams, params.extraParams, params.callbackMetadata);
        const componentName = resolveComponentName(params.serialized, params.callbackMetadata, params.extraParams, params.runName);
        const retryAttempt = resolveFrameworkRetryAttempt(params.callbackMetadata, params.extraParams, params.invocationParams, params.serialized);
        const parentRunId = normalizeRunID(params.parentRunId);
        const runType = params.runType.trim();
        const frameworkTags = normalizeFrameworkTags(params.callbackTags ?? read(params.extraParams, 'tags') ?? read(params.callbackMetadata, 'tags'));
        const langgraphNode = this.frameworkName === 'langgraph'
            ? resolveLangGraphNode(params.callbackMetadata, params.extraParams, params.invocationParams, params.serialized)
            : '';
        const eventId = resolveFrameworkEventID(params.callbackMetadata, params.extraParams, params.invocationParams, params.serialized);
        const rawMetadata = {
            ...this.extraMetadata,
            [spanAttrFrameworkRunID]: params.runId,
            [spanAttrFrameworkRunType]: runType,
        };
        if (conversation.threadId.length > 0) {
            rawMetadata[spanAttrFrameworkThreadID] = conversation.threadId;
        }
        if (parentRunId.length > 0) {
            rawMetadata[spanAttrFrameworkParentRunID] = parentRunId;
        }
        if (componentName.length > 0) {
            rawMetadata[spanAttrFrameworkComponentName] = componentName;
        }
        if (frameworkTags.length > 0) {
            rawMetadata[spanAttrFrameworkTags] = frameworkTags;
        }
        if (retryAttempt !== undefined) {
            rawMetadata[spanAttrFrameworkRetryAttempt] = retryAttempt;
        }
        if (langgraphNode.length > 0) {
            rawMetadata[spanAttrFrameworkLangGraphNode] = langgraphNode;
        }
        if (eventId.length > 0) {
            rawMetadata[spanAttrFrameworkEventID] = eventId;
        }
        const metadata = normalizeFrameworkMetadata(rawMetadata);
        const tags = {
            ...this.extraTags,
            'sigil.framework.name': this.frameworkName,
            'sigil.framework.source': frameworkSource,
            'sigil.framework.language': this.frameworkLanguage,
        };
        return {
            conversationId: conversation.conversationId,
            threadId: conversation.threadId,
            metadata,
            tags,
            componentName,
            parentRunId,
            runType,
            retryAttempt,
            langgraphNode,
            eventId,
        };
    }
}
function resolveProvider(explicitProvider, resolver, modelName, serialized, invocationParams) {
    const explicit = normalizeProvider(explicitProvider);
    if (explicit.length > 0) {
        return explicit;
    }
    if (typeof resolver === 'function') {
        const resolved = normalizeProvider(resolver({
            modelName,
            serialized,
            invocationParams,
        }));
        return resolved.length > 0 ? resolved : 'custom';
    }
    for (const payload of [asRecord(invocationParams), asRecord(serialized)]) {
        const fromProvider = normalizeProvider(asString(read(payload, 'provider')));
        if (fromProvider.length > 0) {
            return fromProvider;
        }
        const fromLsProvider = normalizeProvider(asString(read(payload, 'ls_provider')));
        if (fromLsProvider.length > 0) {
            return fromLsProvider;
        }
    }
    return inferProviderFromModelName(modelName);
}
function resolveModelName(serialized, invocationParams) {
    for (const payload of [asRecord(invocationParams), asRecord(serialized)]) {
        for (const key of ['model', 'model_name', 'ls_model_name']) {
            const value = asString(read(payload, key));
            if (value.length > 0) {
                return value;
            }
        }
        const kwargs = asRecord(read(payload, 'kwargs'));
        for (const key of ['model', 'model_name']) {
            const value = asString(read(kwargs, key));
            if (value.length > 0) {
                return value;
            }
        }
    }
    return 'unknown';
}
function isStreaming(invocationParams) {
    if (invocationParams === undefined) {
        return false;
    }
    return asBoolean(read(invocationParams, 'stream')) || asBoolean(read(invocationParams, 'streaming'));
}
function resolveFrameworkThreadId(serialized, invocationParams, extraParams, callbackMetadata) {
    for (const payload of [callbackMetadata, extraParams, invocationParams, serialized]) {
        const threadId = threadIdFromPayload(payload);
        if (threadId.length > 0) {
            return threadId;
        }
    }
    return '';
}
function resolveFrameworkConversationContext(frameworkName, runId, serialized, invocationParams, extraParams, callbackMetadata) {
    for (const payload of [callbackMetadata, extraParams, invocationParams, serialized]) {
        const conversationId = conversationIdFromPayload(payload);
        if (conversationId.length > 0) {
            const threadId = threadIdFromPayload(payload);
            if (threadId.length > 0) {
                return { conversationId, threadId };
            }
            return {
                conversationId,
                threadId: resolveFrameworkThreadId(serialized, invocationParams, extraParams, callbackMetadata),
            };
        }
    }
    const threadId = resolveFrameworkThreadId(serialized, invocationParams, extraParams, callbackMetadata);
    if (threadId.length > 0) {
        return { conversationId: threadId, threadId };
    }
    // Deterministic fallback when frameworks do not expose session/conversation identity.
    return { conversationId: `sigil:framework:${frameworkName}:${runId}`, threadId: '' };
}
function threadIdFromPayload(payload) {
    const candidates = [
        asString(read(payload, 'thread_id')),
        asString(read(payload, 'threadId')),
        asString(read(read(payload, 'metadata'), 'thread_id')),
        asString(read(read(payload, 'metadata'), 'threadId')),
        asString(read(read(payload, 'configurable'), 'thread_id')),
        asString(read(read(payload, 'configurable'), 'threadId')),
        asString(read(read(payload, 'config'), 'thread_id')),
        asString(read(read(payload, 'config'), 'threadId')),
        asString(read(read(read(payload, 'config'), 'metadata'), 'thread_id')),
        asString(read(read(read(payload, 'config'), 'metadata'), 'threadId')),
        asString(read(read(read(payload, 'config'), 'configurable'), 'thread_id')),
        asString(read(read(read(payload, 'config'), 'configurable'), 'threadId')),
    ];
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function conversationIdFromPayload(payload) {
    const candidates = [
        asString(read(payload, 'conversation_id')),
        asString(read(payload, 'conversationId')),
        asString(read(payload, 'session_id')),
        asString(read(payload, 'sessionId')),
        asString(read(payload, 'group_id')),
        asString(read(payload, 'groupId')),
        asString(read(read(payload, 'metadata'), 'conversation_id')),
        asString(read(read(payload, 'metadata'), 'conversationId')),
        asString(read(read(payload, 'metadata'), 'session_id')),
        asString(read(read(payload, 'metadata'), 'sessionId')),
        asString(read(read(payload, 'metadata'), 'group_id')),
        asString(read(read(payload, 'metadata'), 'groupId')),
        asString(read(read(payload, 'configurable'), 'conversation_id')),
        asString(read(read(payload, 'configurable'), 'conversationId')),
        asString(read(read(payload, 'configurable'), 'session_id')),
        asString(read(read(payload, 'configurable'), 'sessionId')),
        asString(read(read(payload, 'configurable'), 'group_id')),
        asString(read(read(payload, 'configurable'), 'groupId')),
        asString(read(read(payload, 'config'), 'conversation_id')),
        asString(read(read(payload, 'config'), 'conversationId')),
        asString(read(read(payload, 'config'), 'session_id')),
        asString(read(read(payload, 'config'), 'sessionId')),
        asString(read(read(payload, 'config'), 'group_id')),
        asString(read(read(payload, 'config'), 'groupId')),
    ];
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function resolveComponentName(serialized, callbackMetadata, extraParams, runName) {
    const candidates = [
        asString(read(serialized, 'name')),
        idPath(read(serialized, 'id')),
        idPath(read(serialized, 'lc_id')),
        asString(read(read(serialized, 'kwargs'), 'name')),
        asString(read(callbackMetadata, 'component_name')),
        asString(read(extraParams, 'component_name')),
        asString(runName),
    ];
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function resolveLangGraphNode(callbackMetadata, extraParams, invocationParams, serialized) {
    for (const payload of [callbackMetadata, extraParams, invocationParams, asRecord(serialized)]) {
        const candidate = langGraphNodeFromPayload(payload);
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function langGraphNodeFromPayload(payload) {
    const candidates = [
        asString(read(payload, 'langgraph_node')),
        asString(read(payload, 'langgraph_node_name')),
        asString(read(payload, 'node_name')),
        asString(read(payload, 'node')),
        asString(read(read(payload, 'metadata'), 'langgraph_node')),
        asString(read(read(payload, 'metadata'), 'langgraph_node_name')),
        asString(read(read(payload, 'configurable'), 'langgraph_node')),
        asString(read(read(payload, 'configurable'), 'langgraph_node_name')),
        asString(read(read(read(payload, 'config'), 'metadata'), 'langgraph_node')),
        asString(read(read(read(payload, 'config'), 'configurable'), 'langgraph_node')),
        asString(read(read(read(payload, 'config'), 'configurable'), '__pregel_node')),
    ];
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return '';
}
function resolveFrameworkRetryAttempt(...payloads) {
    for (const payload of payloads) {
        const value = retryAttemptFromPayload(payload);
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}
function resolveFrameworkEventID(...payloads) {
    for (const payload of payloads) {
        const candidates = [
            asString(read(payload, 'event_id')),
            asString(read(payload, 'eventId')),
            asString(read(payload, 'invocation_id')),
            asString(read(payload, 'invocationId')),
            asString(read(read(payload, 'metadata'), 'event_id')),
            asString(read(read(payload, 'metadata'), 'eventId')),
            asString(read(read(payload, 'metadata'), 'invocation_id')),
            asString(read(read(payload, 'metadata'), 'invocationId')),
        ];
        for (const candidate of candidates) {
            if (candidate.length > 0) {
                return candidate;
            }
        }
    }
    return '';
}
function retryAttemptFromPayload(payload) {
    const candidates = [
        read(payload, 'retry_attempt'),
        read(payload, 'retryAttempt'),
        read(payload, 'attempt'),
        read(payload, 'retry'),
        read(read(payload, 'metadata'), 'retry_attempt'),
        read(read(payload, 'metadata'), 'retryAttempt'),
        read(read(payload, 'configurable'), 'retry_attempt'),
        read(read(payload, 'configurable'), 'retryAttempt'),
    ];
    for (const candidate of candidates) {
        const parsed = asMaybeInt(candidate);
        if (parsed !== undefined) {
            return parsed;
        }
    }
    return undefined;
}
function normalizeFrameworkTags(raw) {
    const values = Array.isArray(raw) ? raw : [raw];
    const seen = new Set();
    const output = [];
    for (const value of values) {
        if (typeof value !== 'string') {
            continue;
        }
        const trimmed = value.trim();
        if (trimmed.length === 0 || seen.has(trimmed)) {
            continue;
        }
        seen.add(trimmed);
        output.push(trimmed);
    }
    return output;
}
function normalizeFrameworkMetadata(raw) {
    const out = {};
    const seen = new WeakSet();
    for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = key.trim();
        if (normalizedKey.length === 0) {
            continue;
        }
        const normalizedValue = normalizeFrameworkMetadataValue(value, 0, seen);
        if (normalizedValue !== undefined) {
            out[normalizedKey] = normalizedValue;
        }
    }
    return out;
}
function normalizeFrameworkMetadataValue(value, depth, seen) {
    if (depth > maxFrameworkMetadataDepth || value === undefined) {
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
        const normalized = value
            .map((item) => normalizeFrameworkMetadataValue(item, depth + 1, seen))
            .filter((item) => item !== undefined);
        return normalized;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    if (seen.has(value)) {
        return '[circular]';
    }
    seen.add(value);
    try {
        const normalizedObject = {};
        for (const [key, nestedValue] of Object.entries(value)) {
            const nestedKey = key.trim();
            if (nestedKey.length === 0) {
                continue;
            }
            const normalizedNestedValue = normalizeFrameworkMetadataValue(nestedValue, depth + 1, seen);
            if (normalizedNestedValue !== undefined) {
                normalizedObject[nestedKey] = normalizedNestedValue;
            }
        }
        return normalizedObject;
    }
    finally {
        seen.delete(value);
    }
}
function normalizeRunID(runId) {
    if (typeof runId !== 'string') {
        return '';
    }
    return runId.trim();
}
function resolveToolName(serialized, componentName) {
    const candidates = [
        asString(read(serialized, 'name')),
        asString(read(serialized, 'tool_name')),
        componentName,
        'framework_tool',
    ];
    for (const candidate of candidates) {
        if (candidate.length > 0) {
            return candidate;
        }
    }
    return 'framework_tool';
}
function resolveToolDescription(serialized) {
    const description = asString(read(serialized, 'description'));
    if (description.length > 0) {
        return description;
    }
    return undefined;
}
function resolveToolArguments(input, extraParams) {
    const explicitInputs = read(extraParams, 'inputs');
    if (explicitInputs !== undefined) {
        return explicitInputs;
    }
    if (typeof input === 'string') {
        return input.trim();
    }
    return input;
}
function idPath(value) {
    if (!Array.isArray(value)) {
        return '';
    }
    const parts = value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    return parts.join('.');
}
function mapPromptInputs(prompts) {
    if (!Array.isArray(prompts)) {
        return [];
    }
    const input = [];
    for (const prompt of prompts) {
        if (typeof prompt !== 'string') {
            continue;
        }
        const trimmed = prompt.trim();
        if (trimmed.length === 0) {
            continue;
        }
        input.push({ role: 'user', content: trimmed });
    }
    return input;
}
function mapChatInputs(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }
    const output = [];
    for (const batch of messages) {
        if (!Array.isArray(batch)) {
            continue;
        }
        for (const message of batch) {
            const text = extractMessageText(message);
            if (text.length === 0) {
                continue;
            }
            output.push({
                role: normalizeRole(extractMessageRole(message)),
                content: text,
            });
        }
    }
    return output;
}
function mapOutputMessages(output) {
    const generations = read(output, 'generations');
    if (!Array.isArray(generations)) {
        return [];
    }
    const texts = [];
    for (const candidates of generations) {
        if (!Array.isArray(candidates)) {
            continue;
        }
        for (const candidate of candidates) {
            const text = extractGenerationText(candidate);
            if (text.length > 0) {
                texts.push(text);
            }
        }
    }
    if (texts.length === 0) {
        return [];
    }
    return [{ role: 'assistant', content: texts.join('\n') }];
}
function extractGenerationText(candidate) {
    const text = asString(read(candidate, 'text'));
    if (text.length > 0) {
        return text;
    }
    return extractMessageText(read(candidate, 'message'));
}
function extractMessageText(message) {
    const content = read(message, 'content');
    if (typeof content === 'string') {
        return content.trim();
    }
    if (Array.isArray(content)) {
        const parts = [];
        for (const item of content) {
            if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed.length > 0) {
                    parts.push(trimmed);
                }
                continue;
            }
            const text = asString(read(item, 'text'));
            if (text.length > 0) {
                parts.push(text);
            }
        }
        return parts.join(' ').trim();
    }
    if (isRecord(content)) {
        return asString(read(content, 'text'));
    }
    return '';
}
function extractMessageRole(message) {
    const role = asString(read(message, 'role'));
    if (role.length > 0) {
        return role;
    }
    return asString(read(message, 'type'));
}
function normalizeRole(role) {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'assistant' || normalized === 'ai') {
        return 'assistant';
    }
    if (normalized === 'tool') {
        return 'tool';
    }
    return 'user';
}
function mapUsage(rawUsage) {
    const usage = asRecord(rawUsage);
    if (usage === undefined) {
        return undefined;
    }
    const inputTokens = asInt(read(usage, 'prompt_tokens')) || asInt(read(usage, 'input_tokens'));
    const outputTokens = asInt(read(usage, 'completion_tokens')) || asInt(read(usage, 'output_tokens'));
    const totalTokens = asInt(read(usage, 'total_tokens')) || inputTokens + outputTokens;
    if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) {
        return undefined;
    }
    return {
        inputTokens,
        outputTokens,
        totalTokens,
    };
}
function inferProviderFromModelName(modelName) {
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
function normalizeProvider(value) {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized === 'openai' || normalized === 'anthropic' || normalized === 'gemini') {
        return normalized;
    }
    if (normalized.length === 0) {
        return '';
    }
    return 'custom';
}
function read(value, key) {
    if (isRecord(value)) {
        return value[key];
    }
    return undefined;
}
function asRecord(value) {
    return isRecord(value) ? value : undefined;
}
function asString(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
}
function asInt(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
}
function asMaybeInt(value) {
    if (value === undefined || value === null || typeof value === 'boolean') {
        return undefined;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || !Number.isInteger(value)) {
            return undefined;
        }
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        const parsed = Number.parseInt(trimmed, 10);
        if (Number.isNaN(parsed)) {
            return undefined;
        }
        return parsed;
    }
    return undefined;
}
function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
    }
    return false;
}
function asError(value) {
    if (value instanceof Error) {
        return value;
    }
    if (typeof value === 'string') {
        return new Error(value);
    }
    return new Error('framework callback error');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function notEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
//# sourceMappingURL=shared.js.map