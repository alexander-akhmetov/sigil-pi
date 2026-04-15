import type { ExportGenerationsRequest, ExportGenerationsResponse, GenerationExporter } from '../types.js';
export declare class HTTPGenerationExporter implements GenerationExporter {
    private readonly endpoint;
    private readonly headers;
    constructor(endpoint: string, headers?: Record<string, string>);
    exportGenerations(request: ExportGenerationsRequest): Promise<ExportGenerationsResponse>;
}
//# sourceMappingURL=http.d.ts.map