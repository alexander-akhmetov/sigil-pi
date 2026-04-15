const tenantHeaderName = 'X-Scope-OrgID';
const authorizationHeaderName = 'Authorization';
const defaultExportAuthConfig = {
    mode: 'none',
};
export const defaultGenerationExportConfig = {
    protocol: 'http',
    endpoint: 'http://localhost:8080/api/v1/generations:export',
    auth: defaultExportAuthConfig,
    insecure: true,
    batchSize: 100,
    flushIntervalMs: 1_000,
    queueSize: 2_000,
    maxRetries: 5,
    initialBackoffMs: 100,
    maxBackoffMs: 5_000,
    payloadMaxBytes: 4 << 20,
};
export const defaultAPIConfig = {
    endpoint: 'http://localhost:8080',
};
export const defaultEmbeddingCaptureConfig = {
    captureInput: false,
    maxInputItems: 20,
    maxTextLength: 1024,
};
export const defaultLogger = {
    debug(message, ...args) {
        console.debug(message, ...args);
    },
    warn(message, ...args) {
        console.warn(message, ...args);
    },
    error(message, ...args) {
        console.error(message, ...args);
    },
};
export const defaultContentCaptureMode = 'default';
export function defaultConfig() {
    return {
        generationExport: cloneGenerationExportConfig(defaultGenerationExportConfig),
        api: cloneAPIConfig(defaultAPIConfig),
        embeddingCapture: cloneEmbeddingCaptureConfig(defaultEmbeddingCaptureConfig),
        contentCapture: defaultContentCaptureMode,
    };
}
export function mergeConfig(config) {
    return {
        generationExport: mergeGenerationExportConfig(config.generationExport),
        api: mergeAPIConfig(config.api),
        embeddingCapture: mergeEmbeddingCaptureConfig(config.embeddingCapture),
        contentCapture: config.contentCapture ?? defaultContentCaptureMode,
        contentCaptureResolver: config.contentCaptureResolver,
        generationExporter: config.generationExporter,
        tracer: config.tracer,
        meter: config.meter,
        logger: config.logger,
        now: config.now,
        sleep: config.sleep,
    };
}
function mergeGenerationExportConfig(config) {
    const auth = mergeAuthConfig(config?.auth);
    const headers = config?.headers !== undefined ? { ...config.headers } : undefined;
    const merged = {
        ...defaultGenerationExportConfig,
        ...config,
        auth,
        headers,
    };
    merged.headers = resolveHeadersWithAuth(merged.headers, merged.auth, 'generation export');
    return merged;
}
function mergeAPIConfig(config) {
    return {
        ...defaultAPIConfig,
        ...config,
    };
}
function mergeEmbeddingCaptureConfig(config) {
    return {
        ...defaultEmbeddingCaptureConfig,
        ...config,
    };
}
function mergeAuthConfig(config) {
    return {
        ...defaultExportAuthConfig,
        ...config,
    };
}
function resolveHeadersWithAuth(headers, auth, label) {
    const mode = (auth.mode ?? 'none').trim().toLowerCase();
    const tenantId = auth.tenantId?.trim() ?? '';
    const bearerToken = auth.bearerToken?.trim() ?? '';
    const out = headers ? { ...headers } : undefined;
    if (mode === 'none') {
        const basicUser = auth.basicUser?.trim() ?? '';
        const basicPassword = auth.basicPassword?.trim() ?? '';
        if (tenantId.length > 0 || bearerToken.length > 0 || basicUser.length > 0 || basicPassword.length > 0) {
            throw new Error(`${label} auth mode "none" does not allow credentials`);
        }
        return out;
    }
    if (mode === 'tenant') {
        if (tenantId.length === 0) {
            throw new Error(`${label} auth mode "tenant" requires tenantId`);
        }
        if (bearerToken.length > 0) {
            throw new Error(`${label} auth mode "tenant" does not allow bearerToken`);
        }
        if (hasHeaderKey(out, tenantHeaderName)) {
            return out;
        }
        return {
            ...(out ?? {}),
            [tenantHeaderName]: tenantId,
        };
    }
    if (mode === 'bearer') {
        if (bearerToken.length === 0) {
            throw new Error(`${label} auth mode "bearer" requires bearerToken`);
        }
        if (tenantId.length > 0) {
            throw new Error(`${label} auth mode "bearer" does not allow tenantId`);
        }
        if (hasHeaderKey(out, authorizationHeaderName)) {
            return out;
        }
        return {
            ...(out ?? {}),
            [authorizationHeaderName]: formatBearerTokenValue(bearerToken),
        };
    }
    if (mode === 'basic') {
        const password = auth.basicPassword?.trim() ?? '';
        if (password.length === 0) {
            throw new Error(`${label} auth mode "basic" requires basicPassword`);
        }
        let user = auth.basicUser?.trim() ?? '';
        if (user.length === 0) {
            user = tenantId;
        }
        if (user.length === 0) {
            throw new Error(`${label} auth mode "basic" requires basicUser or tenantId`);
        }
        const result = { ...(out ?? {}) };
        if (!hasHeaderKey(result, authorizationHeaderName)) {
            const encoded = new TextEncoder().encode(`${user}:${password}`);
            result[authorizationHeaderName] = `Basic ${btoa(String.fromCharCode(...encoded))}`;
        }
        if (tenantId.length > 0 && !hasHeaderKey(result, tenantHeaderName)) {
            result[tenantHeaderName] = tenantId;
        }
        return result;
    }
    throw new Error(`unsupported ${label} auth mode: ${auth.mode}`);
}
function hasHeaderKey(headers, key) {
    if (headers === undefined) {
        return false;
    }
    const target = key.toLowerCase();
    return Object.keys(headers).some((existing) => existing.toLowerCase() === target);
}
function formatBearerTokenValue(token) {
    const value = token.trim();
    if (value.toLowerCase().startsWith('bearer ')) {
        return `Bearer ${value.slice(7).trim()}`;
    }
    return `Bearer ${value}`;
}
function cloneGenerationExportConfig(config) {
    return {
        ...config,
        auth: { ...config.auth },
        headers: config.headers ? { ...config.headers } : undefined,
    };
}
function cloneAPIConfig(config) {
    return {
        ...config,
    };
}
function cloneEmbeddingCaptureConfig(config) {
    return {
        ...config,
    };
}
//# sourceMappingURL=config.js.map