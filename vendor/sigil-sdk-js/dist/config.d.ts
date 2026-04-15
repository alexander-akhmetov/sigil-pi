import type { ApiConfig, ContentCaptureMode, EmbeddingCaptureConfig, GenerationExportConfig, SigilLogger, SigilSdkConfig, SigilSdkConfigInput } from './types.js';
export declare const defaultGenerationExportConfig: GenerationExportConfig;
export declare const defaultAPIConfig: ApiConfig;
export declare const defaultEmbeddingCaptureConfig: EmbeddingCaptureConfig;
export declare const defaultLogger: SigilLogger;
export declare const defaultContentCaptureMode: ContentCaptureMode;
export declare function defaultConfig(): SigilSdkConfig;
export declare function mergeConfig(config: SigilSdkConfigInput): SigilSdkConfig;
//# sourceMappingURL=config.d.ts.map