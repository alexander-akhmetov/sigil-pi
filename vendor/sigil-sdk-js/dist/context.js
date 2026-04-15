import { AsyncLocalStorage } from 'node:async_hooks';
const storage = new AsyncLocalStorage();
export function withConversationId(conversationId, callback) {
    return runWithContext({ conversationId }, callback);
}
export function withConversationTitle(conversationTitle, callback) {
    return runWithContext({ conversationTitle }, callback);
}
export function withUserId(userId, callback) {
    return runWithContext({ userId }, callback);
}
export function withAgentName(agentName, callback) {
    return runWithContext({ agentName }, callback);
}
export function withAgentVersion(agentVersion, callback) {
    return runWithContext({ agentVersion }, callback);
}
export function conversationIdFromContext() {
    return normalizedString(storage.getStore()?.conversationId);
}
export function conversationTitleFromContext() {
    return normalizedString(storage.getStore()?.conversationTitle);
}
export function userIdFromContext() {
    return normalizedString(storage.getStore()?.userId);
}
export function agentNameFromContext() {
    return normalizedString(storage.getStore()?.agentName);
}
export function agentVersionFromContext() {
    return normalizedString(storage.getStore()?.agentVersion);
}
function runWithContext(nextValues, callback) {
    const currentValues = storage.getStore() ?? {};
    const mergedValues = { ...currentValues };
    for (const [key, value] of Object.entries(nextValues)) {
        const normalized = normalizedString(value);
        if (normalized === undefined) {
            delete mergedValues[key];
            continue;
        }
        mergedValues[key] = normalized;
    }
    return storage.run(mergedValues, callback);
}
function normalizedString(value) {
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
//# sourceMappingURL=context.js.map