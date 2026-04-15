import type OpenAI from 'openai';
import type { SigilClient } from '../client.js';
import type { EmbeddingResult, GenerationResult } from '../types.js';
type AnyRecord = Record<string, unknown>;
type ChatCreateRequest = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & AnyRecord;
type ChatStreamRequest = OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & AnyRecord;
type ChatResponse = OpenAI.Chat.Completions.ChatCompletion & AnyRecord;
type ChatStreamEvent = OpenAI.Chat.Completions.ChatCompletionChunk;
type ResponsesCreateRequest = OpenAI.Responses.ResponseCreateParamsNonStreaming & AnyRecord;
type ResponsesStreamRequest = OpenAI.Responses.ResponseCreateParamsStreaming & AnyRecord;
type ResponsesResponse = OpenAI.Responses.Response & AnyRecord;
type ResponsesStreamEvent = OpenAI.Responses.ResponseStreamEvent;
type EmbeddingsCreateRequest = AnyRecord;
type EmbeddingsCreateResponse = AnyRecord;
/** Optional Sigil fields applied during OpenAI helper mapping. */
export interface OpenAIOptions {
    conversationId?: string;
    agentName?: string;
    agentVersion?: string;
    tags?: Record<string, string>;
    metadata?: Record<string, unknown>;
    rawArtifacts?: boolean;
}
/** Streaming summary accepted by chat-completions stream wrapper. */
export interface ChatCompletionsStreamSummary {
    events?: ChatStreamEvent[];
    finalResponse?: ChatResponse;
    outputText?: string;
    firstChunkAt?: Date | string | number;
}
/** Streaming summary accepted by responses stream wrapper. */
export interface ResponsesStreamSummary {
    events?: ResponsesStreamEvent[];
    finalResponse?: ResponsesResponse;
    outputText?: string;
    firstChunkAt?: Date | string | number;
}
declare function chatCompletionsCreate(client: SigilClient, request: ChatCreateRequest, providerCall: (request: ChatCreateRequest) => Promise<ChatResponse>, options?: OpenAIOptions): Promise<ChatResponse>;
declare function chatCompletionsStream(client: SigilClient, request: ChatStreamRequest, providerCall: (request: ChatStreamRequest) => Promise<ChatCompletionsStreamSummary>, options?: OpenAIOptions): Promise<ChatCompletionsStreamSummary>;
declare function chatCompletionsFromRequestResponse(request: ChatCreateRequest, response: ChatResponse, options?: OpenAIOptions): GenerationResult;
declare function chatCompletionsFromStream(request: ChatStreamRequest, summary: ChatCompletionsStreamSummary, options?: OpenAIOptions): GenerationResult;
declare function responsesCreate(client: SigilClient, request: ResponsesCreateRequest, providerCall: (request: ResponsesCreateRequest) => Promise<ResponsesResponse>, options?: OpenAIOptions): Promise<ResponsesResponse>;
declare function responsesStream(client: SigilClient, request: ResponsesStreamRequest, providerCall: (request: ResponsesStreamRequest) => Promise<ResponsesStreamSummary>, options?: OpenAIOptions): Promise<ResponsesStreamSummary>;
declare function responsesFromRequestResponse(request: ResponsesCreateRequest, response: ResponsesResponse, options?: OpenAIOptions): GenerationResult;
declare function responsesFromStream(request: ResponsesStreamRequest, summary: ResponsesStreamSummary, options?: OpenAIOptions): GenerationResult;
declare function embeddingsCreate(client: SigilClient, request: EmbeddingsCreateRequest, providerCall: (request: EmbeddingsCreateRequest) => Promise<EmbeddingsCreateResponse>, options?: OpenAIOptions): Promise<EmbeddingsCreateResponse>;
declare function embeddingsFromRequestResponse(request: EmbeddingsCreateRequest, response: EmbeddingsCreateResponse | undefined): EmbeddingResult;
export declare const chat: {
    readonly completions: {
        readonly create: typeof chatCompletionsCreate;
        readonly stream: typeof chatCompletionsStream;
        readonly fromRequestResponse: typeof chatCompletionsFromRequestResponse;
        readonly fromStream: typeof chatCompletionsFromStream;
    };
};
export declare const responses: {
    readonly create: typeof responsesCreate;
    readonly stream: typeof responsesStream;
    readonly fromRequestResponse: typeof responsesFromRequestResponse;
    readonly fromStream: typeof responsesFromStream;
};
export declare const embeddings: {
    readonly create: typeof embeddingsCreate;
    readonly fromRequestResponse: typeof embeddingsFromRequestResponse;
};
export {};
//# sourceMappingURL=openai.d.ts.map