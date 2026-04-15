export { SigilClient } from './client.js';
export { defaultConfig } from './config.js';
export { agentNameFromContext, agentVersionFromContext, conversationIdFromContext, conversationTitleFromContext, userIdFromContext, withAgentName, withAgentVersion, withConversationId, withConversationTitle, withUserId, } from './context.js';
export * as anthropic from './providers/anthropic.js';
export * as gemini from './providers/gemini.js';
export * as openai from './providers/openai.js';
import { SigilClient } from './client.js';
/** Convenience factory equivalent to `new SigilClient(config)`. */
export function createSigilClient(config = {}) {
    return new SigilClient(config);
}
//# sourceMappingURL=index.js.map