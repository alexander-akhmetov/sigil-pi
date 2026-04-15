import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultProtoPath = join(__dirname, '../../proto/sigil/v1/generation_ingest.proto');
const protoLoadOptions = {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: false,
    oneofs: true,
};
export class GRPCGenerationExporter {
    endpoint;
    headers;
    insecure;
    initPromise;
    client;
    constructor(endpoint, headers, insecure = false) {
        const parsed = parseGRPCEndpoint(endpoint);
        this.endpoint = parsed.host;
        this.insecure = insecure || parsed.insecure;
        this.headers = headers ? { ...headers } : {};
    }
    async exportGenerations(request) {
        await this.ensureClient();
        const client = this.client;
        if (client === undefined || typeof client.ExportGenerations !== 'function') {
            throw new Error('grpc exporter client is unavailable');
        }
        const metadata = new grpc.Metadata();
        for (const [key, value] of Object.entries(this.headers)) {
            metadata.set(key, value);
        }
        const grpcRequest = {
            generations: request.generations.map(mapGenerationToProto),
        };
        const response = await new Promise((resolve, reject) => {
            client.ExportGenerations?.(grpcRequest, metadata, (error, result) => {
                if (error !== null) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
        return parseGRPCExportResponse(response, request);
    }
    async shutdown() {
        if (this.client !== undefined) {
            this.client.close();
            this.client = undefined;
        }
    }
    async ensureClient() {
        if (this.client !== undefined) {
            return;
        }
        if (this.initPromise !== undefined) {
            await this.initPromise;
            return;
        }
        this.initPromise = this.initializeClient();
        await this.initPromise;
        this.initPromise = undefined;
    }
    async initializeClient() {
        const packageDefinition = await protoLoader.load(defaultProtoPath, protoLoadOptions);
        const loaded = grpc.loadPackageDefinition(packageDefinition);
        const clientCtor = loaded.sigil?.v1?.GenerationIngestService;
        if (clientCtor === undefined) {
            throw new Error('failed to load sigil.v1.GenerationIngestService from proto');
        }
        const credentials = this.insecure ? grpc.credentials.createInsecure() : grpc.credentials.createSsl();
        this.client = new clientCtor(this.endpoint, credentials);
    }
}
function parseGRPCEndpoint(endpoint) {
    const trimmed = endpoint.trim();
    if (trimmed.length === 0) {
        throw new Error('generation export endpoint is required');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsed = new URL(trimmed);
        return {
            host: parsed.host,
            insecure: parsed.protocol === 'http:',
        };
    }
    if (trimmed.startsWith('grpc://')) {
        return {
            host: trimmed.slice('grpc://'.length),
            insecure: false,
        };
    }
    return {
        host: trimmed,
        insecure: false,
    };
}
function parseGRPCExportResponse(response, request) {
    if (!isObject(response) || !Array.isArray(response.results)) {
        throw new Error('invalid grpc generation export response payload');
    }
    return {
        results: response.results.map((result, index) => {
            if (!isObject(result)) {
                throw new Error('invalid grpc generation export result payload');
            }
            return {
                generationId: asString(result.generationId) ?? asString(result.generation_id) ?? request.generations[index]?.id ?? '',
                accepted: Boolean(result.accepted),
                error: asString(result.error),
            };
        }),
    };
}
function mapGenerationToProto(generation) {
    return {
        id: generation.id,
        conversationId: generation.conversationId,
        operationName: generation.operationName,
        mode: generation.mode === 'STREAM' ? 'GENERATION_MODE_STREAM' : 'GENERATION_MODE_SYNC',
        traceId: generation.traceId,
        spanId: generation.spanId,
        model: {
            provider: generation.model.provider,
            name: generation.model.name,
        },
        responseId: generation.responseId,
        responseModel: generation.responseModel,
        systemPrompt: generation.systemPrompt,
        maxTokens: generation.maxTokens === undefined ? undefined : toInt64String(generation.maxTokens),
        temperature: generation.temperature,
        topP: generation.topP,
        toolChoice: generation.toolChoice,
        thinkingEnabled: generation.thinkingEnabled,
        input: generation.input?.map(mapMessageToProto),
        output: generation.output?.map(mapMessageToProto),
        tools: generation.tools?.map(mapToolToProto),
        usage: mapUsageToProto(generation.usage),
        stopReason: generation.stopReason,
        startedAt: mapTimestamp(generation.startedAt),
        completedAt: mapTimestamp(generation.completedAt),
        tags: generation.tags ?? {},
        metadata: mapStructToProto(generation.metadata),
        rawArtifacts: generation.artifacts?.map(mapArtifactToProto),
        callError: generation.callError,
        agentName: generation.agentName,
        agentVersion: generation.agentVersion,
    };
}
function mapMessageToProto(message) {
    const parts = message.parts?.map(mapMessagePartToProto) ?? [];
    if (parts.length === 0 && typeof message.content === 'string') {
        parts.push({
            text: message.content,
        });
    }
    return {
        role: toMessageRoleEnum(message.role),
        name: message.name ?? '',
        parts,
    };
}
function mapMessagePartToProto(part) {
    switch (part.type) {
        case 'text':
            return withPartMetadata({
                text: part.text,
            }, part.metadata?.providerType);
        case 'thinking':
            return withPartMetadata({
                thinking: part.thinking,
            }, part.metadata?.providerType);
        case 'tool_call':
            return withPartMetadata({
                toolCall: {
                    id: part.toolCall.id ?? '',
                    name: part.toolCall.name,
                    inputJson: toBytePayload(part.toolCall.inputJSON),
                },
            }, part.metadata?.providerType);
        case 'tool_result':
            return withPartMetadata({
                toolResult: {
                    toolCallId: part.toolResult.toolCallId ?? '',
                    name: part.toolResult.name ?? '',
                    content: part.toolResult.content ?? '',
                    contentJson: toBytePayload(part.toolResult.contentJSON),
                    isError: part.toolResult.isError ?? false,
                },
            }, part.metadata?.providerType);
    }
}
function mapToolToProto(tool) {
    return {
        name: tool.name,
        description: tool.description ?? '',
        type: tool.type ?? '',
        inputSchemaJson: toBytePayload(tool.inputSchemaJSON),
    };
}
function mapUsageToProto(usage) {
    if (usage === undefined) {
        return undefined;
    }
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
    return {
        inputTokens: toInt64String(inputTokens),
        outputTokens: toInt64String(outputTokens),
        totalTokens: toInt64String(totalTokens),
        cacheReadInputTokens: toInt64String(usage.cacheReadInputTokens),
        cacheWriteInputTokens: toInt64String(usage.cacheWriteInputTokens),
        reasoningTokens: toInt64String(usage.reasoningTokens),
    };
}
function mapArtifactToProto(artifact) {
    return {
        kind: toArtifactKindEnum(artifact.type),
        name: artifact.name ?? artifact.type,
        contentType: artifact.mimeType ?? 'application/json',
        payload: toBytePayload(artifact.payload),
        recordId: artifact.recordId ?? '',
        uri: artifact.uri ?? '',
    };
}
function withPartMetadata(part, providerType) {
    if (providerType === undefined || providerType.trim().length === 0) {
        return part;
    }
    return {
        ...part,
        metadata: {
            providerType,
        },
    };
}
function toBytePayload(value) {
    if (value === undefined || value.length === 0) {
        return Buffer.from([]);
    }
    return Buffer.from(value, 'utf8');
}
function mapStructToProto(metadata) {
    if (metadata === undefined) {
        return undefined;
    }
    const normalized = normalizeMetadata(metadata);
    if (Object.keys(normalized).length === 0) {
        return undefined;
    }
    return {
        fields: mapStructFields(normalized),
    };
}
function normalizeMetadata(metadata) {
    try {
        const encoded = JSON.stringify(metadata, (_key, value) => {
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        });
        if (encoded === undefined) {
            return {};
        }
        const decoded = JSON.parse(encoded);
        if (!isObject(decoded)) {
            return {};
        }
        return decoded;
    }
    catch {
        return {};
    }
}
function mapStructFields(objectValue) {
    const fields = {};
    for (const [key, value] of Object.entries(objectValue)) {
        const mappedValue = mapStructValue(value);
        if (mappedValue !== undefined) {
            fields[key] = mappedValue;
        }
    }
    return fields;
}
function mapStructValue(value) {
    if (value === null) {
        return { nullValue: 'NULL_VALUE' };
    }
    switch (typeof value) {
        case 'string':
            return { stringValue: value };
        case 'number':
            return Number.isFinite(value) ? { numberValue: value } : { stringValue: String(value) };
        case 'boolean':
            return { boolValue: value };
        case 'object':
            if (Array.isArray(value)) {
                const values = value
                    .map((entry) => mapStructValue(entry))
                    .filter((entry) => entry !== undefined);
                return { listValue: { values } };
            }
            if (isObject(value)) {
                return { structValue: { fields: mapStructFields(value) } };
            }
            return { nullValue: 'NULL_VALUE' };
        default:
            return undefined;
    }
}
function mapTimestamp(date) {
    const milliseconds = date.getTime();
    const seconds = Math.floor(milliseconds / 1_000);
    const nanos = (milliseconds - seconds * 1_000) * 1_000_000;
    return {
        seconds: seconds.toString(),
        nanos,
    };
}
function toInt64String(value) {
    if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
        return '0';
    }
    return Math.trunc(value).toString();
}
function toMessageRoleEnum(role) {
    const normalized = role.trim().toLowerCase();
    switch (normalized) {
        case 'assistant':
            return 'MESSAGE_ROLE_ASSISTANT';
        case 'tool':
            return 'MESSAGE_ROLE_TOOL';
        case 'user':
        default:
            return 'MESSAGE_ROLE_USER';
    }
}
function toArtifactKindEnum(kind) {
    const normalized = kind.trim().toLowerCase();
    switch (normalized) {
        case 'request':
            return 'ARTIFACT_KIND_REQUEST';
        case 'response':
            return 'ARTIFACT_KIND_RESPONSE';
        case 'tools':
            return 'ARTIFACT_KIND_TOOLS';
        case 'provider_event':
            return 'ARTIFACT_KIND_PROVIDER_EVENT';
        default:
            return 'ARTIFACT_KIND_UNSPECIFIED';
    }
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
//# sourceMappingURL=grpc.js.map