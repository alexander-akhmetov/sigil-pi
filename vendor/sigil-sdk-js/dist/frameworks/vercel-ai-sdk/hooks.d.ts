import type { SigilClient } from '../../client.js';
import type { CallOptions, GenerateTextHooks, SigilVercelAiSdkOptions, StreamTextHooks } from './types.js';
export declare class SigilVercelAiSdkInstrumentation {
    private readonly client;
    private readonly agentName?;
    private readonly agentVersion?;
    private readonly captureInputs;
    private readonly captureOutputs;
    private readonly extraTags;
    private readonly extraMetadata;
    private readonly resolveConversationIdFn;
    private callSequence;
    constructor(client: SigilClient, options?: SigilVercelAiSdkOptions);
    generateTextHooks(callOptions?: CallOptions): GenerateTextHooks;
    streamTextHooks(callOptions?: CallOptions): StreamTextHooks;
    private createHooks;
}
//# sourceMappingURL=hooks.d.ts.map