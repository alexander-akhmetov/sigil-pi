import type { Message as AnthropicMessage, MessageCreateParams, RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages';
import type { SigilClient } from '../client.js';
import type { GenerationResult } from '../types.js';
type AnyRecord = Record<string, unknown>;
type MessagesCreateRequest = MessageCreateParams & AnyRecord;
type MessagesCreateResponse = AnthropicMessage & AnyRecord;
type MessagesStreamEvent = RawMessageStreamEvent & AnyRecord;
/** Optional Sigil fields applied during Anthropic helper mapping. */
export interface AnthropicOptions {
    conversationId?: string;
    agentName?: string;
    agentVersion?: string;
    tags?: Record<string, string>;
    metadata?: Record<string, unknown>;
    rawArtifacts?: boolean;
}
/** Streaming summary accepted by Anthropic messages stream wrapper. */
export interface MessagesStreamSummary {
    events?: MessagesStreamEvent[];
    finalResponse?: MessagesCreateResponse;
    outputText?: string;
    firstChunkAt?: Date | string | number;
}
declare function anthropicMessagesCreate(client: SigilClient, request: MessagesCreateRequest, providerCall: (request: MessagesCreateRequest) => Promise<MessagesCreateResponse>, options?: AnthropicOptions): Promise<MessagesCreateResponse>;
declare function anthropicMessagesStream(client: SigilClient, request: MessagesCreateRequest, providerCall: (request: MessagesCreateRequest) => Promise<MessagesStreamSummary>, options?: AnthropicOptions): Promise<MessagesStreamSummary>;
declare function anthropicMessagesFromRequestResponse(request: MessagesCreateRequest, response: MessagesCreateResponse, options?: AnthropicOptions): GenerationResult;
declare function anthropicMessagesFromStream(request: MessagesCreateRequest, summary: MessagesStreamSummary, options?: AnthropicOptions): GenerationResult;
export declare const messages: {
    readonly create: typeof anthropicMessagesCreate;
    readonly stream: typeof anthropicMessagesStream;
    readonly fromRequestResponse: typeof anthropicMessagesFromRequestResponse;
    readonly fromStream: typeof anthropicMessagesFromStream;
};
export {};
//# sourceMappingURL=anthropic.d.ts.map