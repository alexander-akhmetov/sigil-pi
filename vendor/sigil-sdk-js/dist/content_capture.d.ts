import type { ContentCaptureMode, ContentCaptureResolver, Generation } from './types.js';
export declare const metadataKeyContentCaptureMode = "sigil.sdk.content_capture_mode";
/**
 * Returns the effective mode from an override and a fallback. `'default'` is
 * transparent — it falls through to the fallback.
 */
export declare function resolveContentCaptureMode(override: ContentCaptureMode, fallback: ContentCaptureMode): ContentCaptureMode;
/**
 * Resolves the effective mode at the client level. `'default'` resolves to
 * `'no_tool_content'` for backward compatibility.
 */
export declare function resolveClientContentCaptureMode(mode: ContentCaptureMode): ContentCaptureMode;
/**
 * Invokes the resolver callback safely, catching thrown errors. Returns
 * `'default'` when the resolver is undefined. Errors are treated as
 * `'metadata_only'` (fail-closed).
 */
export declare function callContentCaptureResolver(resolver: ContentCaptureResolver | undefined, metadata: Record<string, unknown> | undefined): ContentCaptureMode;
/** Sets the content capture mode marker on the generation metadata. */
export declare function stampContentCaptureMetadata(generation: Generation, mode: ContentCaptureMode): void;
/**
 * Strips sensitive content from a generation while preserving message
 * structure (roles, part types), tool names/IDs, usage, timing, and all
 * other metadata fields. `errorCategory` is the classified error category
 * used to replace the raw `callError` text.
 */
export declare function stripContent(generation: Generation, errorCategory: string): void;
/**
 * Determines whether tool execution content (arguments, results) should be
 * included in span attributes. Resolves the effective mode from the
 * explicit tool override, client default, resolver, and legacy
 * `includeContent`.
 */
export declare function shouldIncludeToolContent(toolMode: ContentCaptureMode, clientDefault: ContentCaptureMode, resolverMode: ContentCaptureMode, legacyInclude: boolean): boolean;
//# sourceMappingURL=content_capture.d.ts.map