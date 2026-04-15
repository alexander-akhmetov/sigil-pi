import { GRPCGenerationExporter } from './grpc.js';
import { HTTPGenerationExporter } from './http.js';
export function createDefaultGenerationExporter(config) {
    switch (config.protocol) {
        case 'http':
            return new HTTPGenerationExporter(config.endpoint, config.headers);
        case 'grpc':
            return new GRPCGenerationExporter(config.endpoint, config.headers, config.insecure);
        case 'none':
            return new NoopGenerationExporter();
        default:
            return new UnavailableGenerationExporter(new Error(`unsupported generation export protocol: ${config.protocol}`));
    }
}
class NoopGenerationExporter {
    async exportGenerations(request) {
        return {
            results: request.generations.map((generation) => ({
                generationId: generation.id,
                accepted: true,
            })),
        };
    }
}
class UnavailableGenerationExporter {
    reason;
    constructor(reason) {
        this.reason = reason;
    }
    async exportGenerations() {
        throw this.reason;
    }
}
//# sourceMappingURL=default.js.map