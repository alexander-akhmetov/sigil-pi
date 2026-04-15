import type { ExportGenerationsRequest, ExportGenerationsResponse, GenerationExporter } from '../types.js';
export declare class GRPCGenerationExporter implements GenerationExporter {
    private readonly endpoint;
    private readonly headers;
    private readonly insecure;
    private initPromise;
    private client;
    constructor(endpoint: string, headers?: Record<string, string>, insecure?: boolean);
    exportGenerations(request: ExportGenerationsRequest): Promise<ExportGenerationsResponse>;
    shutdown(): Promise<void>;
    private ensureClient;
    private initializeClient;
}
//# sourceMappingURL=grpc.d.ts.map