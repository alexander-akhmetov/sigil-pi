import { SigilVercelAiSdkInstrumentation } from './hooks.js';
export { SigilVercelAiSdkInstrumentation } from './hooks.js';
export { buildFrameworkMetadata, buildFrameworkTags, fallbackConversationId, frameworkIdentity, isTextChunk, mapInputMessages, mapModelFromStepStart, mapResponseFromStepFinish, mapStepOutput, mapUsageFromStepFinish, normalizeMetadata, parseToolCallFinish, parseToolCallStart, resolveConversationId, } from './mapping.js';
export function createSigilVercelAiSdk(client, options = {}) {
    return new SigilVercelAiSdkInstrumentation(client, options);
}
//# sourceMappingURL=index.js.map