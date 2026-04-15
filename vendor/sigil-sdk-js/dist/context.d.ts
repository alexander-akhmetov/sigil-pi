export declare function withConversationId<T>(conversationId: string, callback: () => T): T;
export declare function withConversationTitle<T>(conversationTitle: string, callback: () => T): T;
export declare function withUserId<T>(userId: string, callback: () => T): T;
export declare function withAgentName<T>(agentName: string, callback: () => T): T;
export declare function withAgentVersion<T>(agentVersion: string, callback: () => T): T;
export declare function conversationIdFromContext(): string | undefined;
export declare function conversationTitleFromContext(): string | undefined;
export declare function userIdFromContext(): string | undefined;
export declare function agentNameFromContext(): string | undefined;
export declare function agentVersionFromContext(): string | undefined;
//# sourceMappingURL=context.d.ts.map