/**
 * Sets up OTel SDK providers for metrics and traces, exporting via OTLP/HTTP.
 * Returns a tracer and meter to pass into SigilClient so its internal
 * instruments actually export data.
 */

import type { Meter, Tracer } from "@opentelemetry/api";
import {
  AggregationTemporalityPreference,
  OTLPMetricExporter,
} from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { OtlpConfig } from "./config.js";

const INSTRUMENTATION_SCOPE = "sigil-pi";

export interface TelemetryProviders {
  tracer: Tracer;
  meter: Meter;
  shutdown: () => Promise<void>;
}

export function createTelemetryProviders(otlp: OtlpConfig): TelemetryProviders {
  const base = otlp.endpoint.replace(/\/+$/, "");

  const metricExporter = new OTLPMetricExporter({
    url: `${base}/v1/metrics`,
    headers: otlp.headers,
    temporalityPreference: AggregationTemporalityPreference.DELTA,
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  });
  const meterProvider = new MeterProvider({
    readers: [metricReader],
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${base}/v1/traces`,
    headers: otlp.headers,
  });
  const tracerProvider = new BasicTracerProvider({
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });

  return {
    tracer: tracerProvider.getTracer(INSTRUMENTATION_SCOPE),
    meter: meterProvider.getMeter(INSTRUMENTATION_SCOPE),
    shutdown: async () => {
      await Promise.allSettled([
        meterProvider.shutdown(),
        tracerProvider.shutdown(),
      ]);
    },
  };
}
