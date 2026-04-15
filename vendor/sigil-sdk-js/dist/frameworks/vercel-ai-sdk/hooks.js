import { buildFrameworkMetadata, buildFrameworkTags, extractStepNumber, isTextChunk, mapInputMessages, mapModelFromStepStart, mapResponseFromStepFinish, mapStepOutput, mapUsageFromStepFinish, parseToolCallFinish, parseToolCallStart, resolveConversationId, shouldTreatStepAsError, } from './mapping.js';
export class SigilVercelAiSdkInstrumentation {
    client;
    agentName;
    agentVersion;
    captureInputs;
    captureOutputs;
    extraTags;
    extraMetadata;
    resolveConversationIdFn;
    callSequence = 0;
    constructor(client, options = {}) {
        this.client = client;
        this.agentName = normalizeOptionalString(options.agentName);
        this.agentVersion = normalizeOptionalString(options.agentVersion);
        this.captureInputs = options.captureInputs ?? true;
        this.captureOutputs = options.captureOutputs ?? true;
        this.extraTags = { ...(options.extraTags ?? {}) };
        this.extraMetadata = { ...(options.extraMetadata ?? {}) };
        this.resolveConversationIdFn = options.resolveConversationId;
    }
    generateTextHooks(callOptions = {}) {
        return this.createHooks('SYNC', 'generateText', callOptions, false);
    }
    streamTextHooks(callOptions = {}) {
        return this.createHooks('STREAM', 'streamText', callOptions, true);
    }
    createHooks(mode, operationName, callOptions, includeStreamHandlers) {
        const callID = `call-${++this.callSequence}`;
        const callStartedAt = new Date();
        const state = {
            stepStates: new Map(),
            toolStates: new Map(),
            completedToolCallIds: new Set(),
            nextSyntheticStepNumber: 0,
        };
        const explicitConversationId = normalizeOptionalString(callOptions.conversationId);
        const callAgentName = normalizeOptionalString(callOptions.agentName) ?? this.agentName;
        const mergedCallMetadata = {
            ...this.extraMetadata,
            ...(callOptions.extraMetadata ?? {}),
        };
        const tags = buildFrameworkTags(this.extraTags);
        let streamObservedStartAt;
        let hasCreatedStreamStepState = false;
        const noteStreamObservedStartAt = (timestamp) => {
            if (mode !== 'STREAM') {
                return;
            }
            if (streamObservedStartAt === undefined || timestamp.getTime() < streamObservedStartAt.getTime()) {
                streamObservedStartAt = timestamp;
            }
        };
        const createGenerationRecorder = (params) => {
            const model = mapModelFromStepStart(params.stepStartEvent);
            return mode === 'STREAM'
                ? this.client.startStreamingGeneration({
                    conversationId: params.conversationId,
                    agentName: callAgentName,
                    agentVersion: this.agentVersion,
                    mode,
                    operationName,
                    model: {
                        provider: model.provider,
                        name: model.modelName,
                    },
                    tags,
                    metadata: buildFrameworkMetadata(mergedCallMetadata, undefined, undefined),
                    startedAt: params.startedAt,
                })
                : this.client.startGeneration({
                    conversationId: params.conversationId,
                    agentName: callAgentName,
                    agentVersion: this.agentVersion,
                    mode,
                    operationName,
                    model: {
                        provider: model.provider,
                        name: model.modelName,
                    },
                    tags,
                    metadata: buildFrameworkMetadata(mergedCallMetadata, undefined, undefined),
                    startedAt: params.startedAt,
                });
        };
        const ensureStepRecorder = (stepState, conversationId) => {
            if (stepState.recorder !== undefined) {
                return stepState.recorder;
            }
            const recorder = createGenerationRecorder({
                stepStartEvent: stepState.stepStartEvent,
                conversationId,
                startedAt: stepState.startedAt,
            });
            stepState.recorder = recorder;
            return recorder;
        };
        const createStepState = (params) => {
            const conversation = resolveConversationId({
                explicitConversationId,
                resolver: this.resolveConversationIdFn,
                stepStartEvent: params.stepStartEvent,
                fallbackSeed: `${callID}:step-${params.stepNumber}`,
            });
            const stepState = {
                recorder: mode === 'STREAM' && hasStepStartModelRef(params.stepStartEvent)
                    ? createGenerationRecorder({
                        stepStartEvent: params.stepStartEvent,
                        conversationId: conversation.conversationId,
                        startedAt: params.startedAt,
                    })
                    : undefined,
                startedAt: params.startedAt,
                inputMessages: params.inputMessages,
                conversation,
                fallbackSeed: `${callID}:step-${params.stepNumber}`,
                firstTokenRecorded: false,
                firstTokenAt: undefined,
                stepStartEvent: params.stepStartEvent,
                toolCallIds: new Set(),
                hasToolCalls: false,
            };
            state.stepStates.set(params.stepNumber, stepState);
            if (mode === 'STREAM') {
                hasCreatedStreamStepState = true;
            }
            return stepState;
        };
        const resolveOrCreateStepStateForFinish = (params) => {
            const resolvedStepNumber = resolveStepNumberForEvent(state, params.eventStepNumber);
            if (resolvedStepNumber !== undefined) {
                const resolvedState = state.stepStates.get(resolvedStepNumber);
                if (resolvedState !== undefined) {
                    return { stepNumber: resolvedStepNumber, stepState: resolvedState };
                }
            }
            const syntheticStepNumber = extractStepNumber({ stepNumber: params.eventStepNumber }, state.nextSyntheticStepNumber);
            state.nextSyntheticStepNumber = Math.max(state.nextSyntheticStepNumber + 1, syntheticStepNumber + 1);
            const syntheticStepStartEvent = {
                stepNumber: syntheticStepNumber,
                model: params.responseModel !== undefined ? { modelId: params.responseModel } : undefined,
            };
            const now = new Date();
            const syntheticStartedAt = mode === 'STREAM' ? (hasCreatedStreamStepState ? now : (streamObservedStartAt ?? callStartedAt)) : now;
            const syntheticStepState = createStepState({
                stepNumber: syntheticStepNumber,
                stepStartEvent: syntheticStepStartEvent,
                startedAt: syntheticStartedAt,
                inputMessages: [],
            });
            return { stepNumber: syntheticStepNumber, stepState: syntheticStepState };
        };
        const resolveOrCreateStepStateForObservedEvent = (params) => {
            const resolvedStepNumber = resolveStepNumberForEvent(state, params.eventStepNumber);
            if (resolvedStepNumber !== undefined) {
                const resolvedState = state.stepStates.get(resolvedStepNumber);
                if (resolvedState !== undefined) {
                    return { stepNumber: resolvedStepNumber, stepState: resolvedState };
                }
            }
            const syntheticStepNumber = extractStepNumber({ stepNumber: params.eventStepNumber }, state.nextSyntheticStepNumber);
            state.nextSyntheticStepNumber = Math.max(state.nextSyntheticStepNumber + 1, syntheticStepNumber + 1);
            const syntheticStepStartEvent = {
                stepNumber: syntheticStepNumber,
            };
            const syntheticStepState = createStepState({
                stepNumber: syntheticStepNumber,
                stepStartEvent: syntheticStepStartEvent,
                startedAt: params.observedAt,
                inputMessages: [],
            });
            return { stepNumber: syntheticStepNumber, stepState: syntheticStepState };
        };
        const parseJSONIfPossible = (value) => {
            if (typeof value !== 'string') {
                return undefined;
            }
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return undefined;
            }
            try {
                return JSON.parse(trimmed);
            }
            catch {
                return trimmed;
            }
        };
        const extractToolPartsFromStepOutput = (output) => {
            const toolCalls = [];
            const toolResults = [];
            if (!Array.isArray(output)) {
                return { toolCalls, toolResults };
            }
            for (const message of output) {
                if (!Array.isArray(message.parts)) {
                    continue;
                }
                for (const part of message.parts) {
                    if (part.type === 'tool_call') {
                        toolCalls.push(part.toolCall);
                        continue;
                    }
                    if (part.type === 'tool_result') {
                        toolResults.push(part.toolResult);
                    }
                }
            }
            return { toolCalls, toolResults };
        };
        const recordToolExecutionFromStepFinish = (params) => {
            const { toolCalls, toolResults } = extractToolPartsFromStepOutput(params.output);
            if (toolResults.length === 0) {
                return undefined;
            }
            const toolCallsByID = new Map();
            const toolCallsByName = new Map();
            for (const toolCall of toolCalls) {
                if (toolCall.id !== undefined) {
                    toolCallsByID.set(toolCall.id, toolCall);
                }
                const existing = toolCallsByName.get(toolCall.name) ?? [];
                existing.push(toolCall);
                toolCallsByName.set(toolCall.name, existing);
            }
            let firstError;
            for (const [index, toolResult] of toolResults.entries()) {
                let toolCallID = toolResult.toolCallId;
                let matchedToolCall = toolCallID !== undefined ? toolCallsByID.get(toolCallID) : undefined;
                if (matchedToolCall === undefined && toolResult.name !== undefined) {
                    const matchingByName = toolCallsByName.get(toolResult.name);
                    matchedToolCall = matchingByName?.shift();
                }
                if (toolCallID === undefined || toolCallID.length === 0) {
                    toolCallID = matchedToolCall?.id ?? `${callID}:step-${params.stepNumber}:tool-${index}`;
                }
                if (state.completedToolCallIds.has(toolCallID)) {
                    continue;
                }
                const liveToolState = state.toolStates.get(toolCallID);
                if (liveToolState !== undefined) {
                    try {
                        const toolResultPayload = {
                            completedAt: new Date(),
                        };
                        if (this.captureInputs) {
                            toolResultPayload.arguments = liveToolState.input;
                        }
                        if (this.captureOutputs) {
                            toolResultPayload.result = parseJSONIfPossible(toolResult.contentJSON) ?? toolResult.content;
                        }
                        if (toolResult.isError) {
                            liveToolState.recorder.setCallError(toolResult.content ?? new Error('tool call failed'));
                        }
                        liveToolState.recorder.setResult(toolResultPayload);
                    }
                    finally {
                        liveToolState.recorder.end();
                    }
                    const recorderError = liveToolState.recorder.getError();
                    if (firstError === undefined && recorderError !== undefined && !toolResult.isError) {
                        firstError = recorderError;
                    }
                    state.toolStates.delete(toolCallID);
                    const liveStepState = state.stepStates.get(liveToolState.stepNumber);
                    liveStepState?.toolCallIds.delete(toolCallID);
                    state.completedToolCallIds.add(toolCallID);
                    continue;
                }
                const resolvedToolName = toolResult.name ?? matchedToolCall?.name ?? 'framework_tool';
                const recorder = this.client.startToolExecution({
                    toolName: resolvedToolName,
                    toolCallId: toolCallID,
                    conversationId: params.conversationId,
                    agentName: callAgentName,
                    agentVersion: this.agentVersion,
                    includeContent: this.captureInputs || this.captureOutputs,
                    startedAt: params.stepState.startedAt,
                });
                try {
                    const toolResultPayload = {
                        completedAt: new Date(),
                    };
                    if (this.captureInputs) {
                        toolResultPayload.arguments = parseJSONIfPossible(matchedToolCall?.inputJSON);
                    }
                    if (this.captureOutputs) {
                        toolResultPayload.result = parseJSONIfPossible(toolResult.contentJSON) ?? toolResult.content;
                    }
                    if (toolResult.isError) {
                        recorder.setCallError(toolResult.content ?? new Error('tool call failed'));
                    }
                    recorder.setResult(toolResultPayload);
                }
                finally {
                    recorder.end();
                }
                const recorderError = recorder.getError();
                if (firstError === undefined && recorderError !== undefined && !toolResult.isError) {
                    firstError = recorderError;
                }
                state.completedToolCallIds.add(toolCallID);
            }
            return firstError;
        };
        const hooks = {
            experimental_onStepStart: (event) => {
                noteStreamObservedStartAt(new Date());
                const fallbackStep = state.nextSyntheticStepNumber;
                const stepNumber = extractStepNumber(event, fallbackStep);
                state.nextSyntheticStepNumber = Math.max(state.nextSyntheticStepNumber + 1, stepNumber + 1);
                if (state.stepStates.has(stepNumber)) {
                    return;
                }
                const inputMessages = this.captureInputs ? mapInputMessages(event.messages) : [];
                createStepState({
                    stepNumber,
                    stepStartEvent: event,
                    startedAt: new Date(),
                    inputMessages,
                });
            },
            onStepFinish: (event) => {
                const response = mapResponseFromStepFinish(event);
                const { stepNumber, stepState } = resolveOrCreateStepStateForFinish({
                    eventStepNumber: event.stepNumber,
                    responseModel: response.responseModel,
                });
                const conversation = stepState.conversation;
                if (stepState.recorder === undefined && response.responseModel !== undefined) {
                    stepState.stepStartEvent = {
                        ...stepState.stepStartEvent,
                        model: {
                            ...(stepState.stepStartEvent.model !== null && typeof stepState.stepStartEvent.model === 'object'
                                ? stepState.stepStartEvent.model
                                : {}),
                            modelId: response.responseModel,
                        },
                    };
                }
                let recorder;
                try {
                    recorder = ensureStepRecorder(stepState, conversation.conversationId);
                }
                catch (error) {
                    state.stepStates.delete(stepNumber);
                    if (stepState.toolCallIds.size > 0) {
                        closeStepTools(state, stepState, error);
                    }
                    throw error;
                }
                if (stepState.firstTokenAt !== undefined) {
                    recorder.setFirstTokenAt(stepState.firstTokenAt);
                }
                const outputMapping = mapStepOutput(event);
                const metadata = buildFrameworkMetadata(mergedCallMetadata, outputMapping.stepType, this.captureOutputs ? outputMapping.reasoningText : undefined);
                const usage = mapUsageFromStepFinish(event);
                const isError = shouldTreatStepAsError(event);
                try {
                    recorder.setResult({
                        conversationId: conversation.conversationId,
                        agentName: callAgentName,
                        agentVersion: this.agentVersion,
                        operationName,
                        input: this.captureInputs ? stepState.inputMessages : undefined,
                        output: this.captureOutputs ? outputMapping.output : undefined,
                        usage,
                        stopReason: response.finishReason,
                        responseId: response.responseId,
                        responseModel: response.responseModel,
                        tags,
                        metadata,
                        completedAt: new Date(),
                    });
                    if (isError) {
                        recorder.setCallError(event.error ?? new Error('step finished with error'));
                    }
                }
                finally {
                    recorder.end();
                }
                const recorderError = recorder.getError();
                const fallbackToolRecorderError = recordToolExecutionFromStepFinish({
                    stepNumber,
                    stepState,
                    conversationId: conversation.conversationId,
                    output: outputMapping.output,
                });
                state.stepStates.delete(stepNumber);
                if (stepState.toolCallIds.size > 0) {
                    const closeError = isError
                        ? (event.error ?? new Error('parent step failed'))
                        : new Error('tool call did not finish before step completion');
                    closeStepTools(state, stepState, closeError);
                }
                if (recorderError !== undefined) {
                    throw recorderError;
                }
                if (fallbackToolRecorderError !== undefined) {
                    throw fallbackToolRecorderError;
                }
            },
            experimental_onToolCallStart: (event) => {
                const parsed = parseToolCallStart(event);
                if (parsed === undefined) {
                    return;
                }
                state.completedToolCallIds.delete(parsed.toolCallId);
                if (state.toolStates.has(parsed.toolCallId)) {
                    return;
                }
                const startedAt = new Date();
                if (mode === 'STREAM') {
                    noteStreamObservedStartAt(startedAt);
                }
                const { stepNumber, stepState } = resolveOrCreateStepStateForObservedEvent({
                    eventStepNumber: event.stepNumber,
                    observedAt: startedAt,
                });
                const recorder = this.client.startToolExecution({
                    toolName: parsed.toolName,
                    toolCallId: parsed.toolCallId,
                    toolType: parsed.toolType,
                    toolDescription: parsed.description,
                    conversationId: stepState.conversation.conversationId,
                    agentName: callAgentName,
                    agentVersion: this.agentVersion,
                    includeContent: this.captureInputs || this.captureOutputs,
                    startedAt,
                });
                state.toolStates.set(parsed.toolCallId, {
                    recorder,
                    startedAt,
                    stepNumber,
                    input: parsed.input,
                });
                stepState.hasToolCalls = true;
                stepState.toolCallIds.add(parsed.toolCallId);
            },
            experimental_onToolCallFinish: (event) => {
                const parsed = parseToolCallFinish(event);
                if (parsed === undefined) {
                    return;
                }
                const toolState = state.toolStates.get(parsed.toolCallId);
                if (toolState === undefined) {
                    return;
                }
                const completedAt = parsed.durationMs !== undefined ? new Date(toolState.startedAt.getTime() + parsed.durationMs) : new Date();
                try {
                    if (parsed.success) {
                        const result = {
                            completedAt,
                        };
                        if (this.captureInputs) {
                            result.arguments = toolState.input;
                        }
                        if (this.captureOutputs) {
                            result.result = parsed.output;
                        }
                        toolState.recorder.setResult(result);
                    }
                    else {
                        toolState.recorder.setCallError(parsed.error ?? new Error('tool call failed'));
                        toolState.recorder.setResult({ completedAt });
                    }
                }
                finally {
                    toolState.recorder.end();
                }
                const recorderError = toolState.recorder.getError();
                state.toolStates.delete(parsed.toolCallId);
                const stepState = state.stepStates.get(toolState.stepNumber);
                stepState?.toolCallIds.delete(parsed.toolCallId);
                state.completedToolCallIds.add(parsed.toolCallId);
                if (parsed.success && recorderError !== undefined) {
                    throw recorderError;
                }
            },
        };
        if (includeStreamHandlers) {
            const finalizeStreamFailure = (error) => {
                const observedAt = new Date();
                const fallbackStreamStartedAt = streamObservedStartAt ?? (hasCreatedStreamStepState ? observedAt : callStartedAt);
                noteStreamObservedStartAt(observedAt);
                if (state.stepStates.size === 0) {
                    resolveOrCreateStepStateForObservedEvent({
                        eventStepNumber: undefined,
                        observedAt: fallbackStreamStartedAt,
                    });
                }
                const stepEntries = [...state.stepStates.entries()];
                let firstError;
                for (const [, stepState] of stepEntries) {
                    let recorder = stepState.recorder;
                    if (recorder === undefined) {
                        try {
                            recorder = ensureStepRecorder(stepState, stepState.conversation.conversationId);
                        }
                        catch (error) {
                            if (firstError === undefined) {
                                firstError = error instanceof Error ? error : new Error(String(error));
                            }
                            if (stepState.toolCallIds.size > 0) {
                                closeStepTools(state, stepState, error);
                            }
                            continue;
                        }
                    }
                    if (stepState.firstTokenAt !== undefined) {
                        recorder.setFirstTokenAt(stepState.firstTokenAt);
                    }
                    try {
                        recorder.setCallError(error);
                    }
                    finally {
                        recorder.end();
                    }
                    const recorderError = recorder.getError();
                    if (firstError === undefined && recorderError !== undefined) {
                        firstError = recorderError;
                    }
                    if (stepState.toolCallIds.size > 0) {
                        closeStepTools(state, stepState, error);
                    }
                }
                state.stepStates.clear();
                if (state.toolStates.size > 0) {
                    closeAllTools(state, error);
                }
                if (firstError !== undefined) {
                    throw firstError;
                }
            };
            hooks.onChunk = (event) => {
                const observedAt = new Date();
                noteStreamObservedStartAt(observedAt);
                const { stepState } = resolveOrCreateStepStateForObservedEvent({
                    eventStepNumber: event.stepNumber,
                    observedAt,
                });
                if (!isTextChunk(event)) {
                    return;
                }
                const recorder = stepState.recorder;
                if (recorder === undefined || stepState.firstTokenRecorded) {
                    if (!stepState.firstTokenRecorded) {
                        stepState.firstTokenRecorded = true;
                        stepState.firstTokenAt = observedAt;
                    }
                    return;
                }
                stepState.firstTokenRecorded = true;
                stepState.firstTokenAt = undefined;
                recorder.setFirstTokenAt(observedAt);
            };
            hooks.onError = (event) => {
                finalizeStreamFailure(unwrapStreamError(event));
            };
            hooks.onAbort = (event) => {
                const abortError = unwrapStreamAbortError(event);
                finalizeStreamFailure(abortError);
            };
        }
        return hooks;
    }
}
function unwrapStreamError(event) {
    if (event === null || typeof event !== 'object' || !('error' in event)) {
        return event;
    }
    return event.error;
}
function unwrapStreamAbortError(event) {
    const unwrapped = unwrapStreamError(event);
    if (unwrapped === undefined || unwrapped === null) {
        return new Error('stream aborted');
    }
    if (unwrapped instanceof Error) {
        return unwrapped;
    }
    if (typeof unwrapped === 'string') {
        const trimmed = unwrapped.trim();
        return new Error(trimmed.length > 0 ? trimmed : 'stream aborted');
    }
    return new Error('stream aborted');
}
function closeStepTools(state, stepState, error) {
    for (const toolCallId of stepState.toolCallIds) {
        const toolState = state.toolStates.get(toolCallId);
        if (toolState === undefined) {
            continue;
        }
        try {
            toolState.recorder.setCallError(error);
        }
        finally {
            toolState.recorder.end();
        }
        state.toolStates.delete(toolCallId);
        state.completedToolCallIds.add(toolCallId);
    }
    stepState.toolCallIds.clear();
}
function closeAllTools(state, error) {
    const entries = [...state.toolStates.entries()];
    for (const [toolCallId, toolState] of entries) {
        try {
            toolState.recorder.setCallError(error);
        }
        finally {
            toolState.recorder.end();
        }
        state.toolStates.delete(toolCallId);
        state.completedToolCallIds.add(toolCallId);
        const stepState = state.stepStates.get(toolState.stepNumber);
        stepState?.toolCallIds.delete(toolCallId);
    }
}
function resolveStepNumberForEvent(state, eventStepNumber) {
    const parsed = parseOptionalStepNumber(eventStepNumber);
    if (parsed !== undefined) {
        if (state.stepStates.has(parsed)) {
            return parsed;
        }
        return undefined;
    }
    if (state.stepStates.size !== 1) {
        return undefined;
    }
    const [only] = state.stepStates.keys();
    return only;
}
function parseOptionalStepNumber(value) {
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) {
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
function hasStepStartModelRef(event) {
    const model = event.model;
    if (model === null || typeof model !== 'object') {
        return false;
    }
    const modelRef = model;
    return hasNonEmptyString(modelRef.modelId) || hasNonEmptyString(modelRef.id) || hasNonEmptyString(modelRef.name);
}
function hasNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
//# sourceMappingURL=hooks.js.map