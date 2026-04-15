import type { Content, GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import type { SigilClient } from '../client.js';
import type { EmbeddingResult, GenerationResult } from '../types.js';
type AnyRecord = Record<string, unknown>;
type GeminiContent = Content & AnyRecord;
type GeminiContents = Array<GeminiContent | string>;
type GeminiConfig = GenerateContentConfig & AnyRecord;
type GeminiResponse = GenerateContentResponse & AnyRecord;
type GeminiEmbedConfig = AnyRecord;
type GeminiEmbedResponse = AnyRecord;
/** Optional Sigil fields applied during Gemini helper mapping. */
export interface GeminiOptions {
    conversationId?: string;
    agentName?: string;
    agentVersion?: string;
    tags?: Record<string, string>;
    metadata?: Record<string, unknown>;
    rawArtifacts?: boolean;
}
/** Streaming summary accepted by Gemini models stream wrapper. */
export interface ModelsStreamSummary {
    responses?: GeminiResponse[];
    finalResponse?: GeminiResponse;
    outputText?: string;
    firstChunkAt?: Date | string | number;
}
declare function geminiGenerateContent(client: SigilClient, model: string, contents: GeminiContents, config: GeminiConfig | undefined, providerCall: (model: string, contents: GeminiContents, config: GeminiConfig | undefined) => Promise<GeminiResponse>, options?: GeminiOptions): Promise<GeminiResponse>;
declare function geminiGenerateContentStream(client: SigilClient, model: string, contents: GeminiContents, config: GeminiConfig | undefined, providerCall: (model: string, contents: GeminiContents, config: GeminiConfig | undefined) => Promise<ModelsStreamSummary>, options?: GeminiOptions): Promise<ModelsStreamSummary>;
declare function geminiEmbedContent(client: SigilClient, model: string, contents: GeminiContents, config: GeminiEmbedConfig | undefined, providerCall: (model: string, contents: GeminiContents, config: GeminiEmbedConfig | undefined) => Promise<GeminiEmbedResponse>, options?: GeminiOptions): Promise<GeminiEmbedResponse>;
declare function geminiEmbeddingFromResponse(_model: string, contents: GeminiContents, config: GeminiEmbedConfig | undefined, response: GeminiEmbedResponse | undefined): EmbeddingResult;
declare function geminiFromRequestResponse(model: string, contents: GeminiContents, config: GeminiConfig | undefined, response: GeminiResponse, options?: GeminiOptions): GenerationResult;
declare function geminiFromStream(model: string, contents: GeminiContents, config: GeminiConfig | undefined, summary: ModelsStreamSummary, options?: GeminiOptions): GenerationResult;
export declare const models: {
    readonly generateContent: typeof geminiGenerateContent;
    readonly generateContentStream: typeof geminiGenerateContentStream;
    readonly embedContent: typeof geminiEmbedContent;
    readonly fromRequestResponse: typeof geminiFromRequestResponse;
    readonly fromStream: typeof geminiFromStream;
    readonly embeddingFromResponse: typeof geminiEmbeddingFromResponse;
};
export {};
//# sourceMappingURL=gemini.d.ts.map