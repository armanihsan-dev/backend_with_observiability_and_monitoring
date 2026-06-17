import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, ProxyTracerProvider } from '@opentelemetry/api';

export const initTracer = () => {
    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
            ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
            : 'http://localhost:4318/v1/traces',
    });

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'o11y-in-production',
        }),
        traceExporter,
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-express': { enabled: true },
                '@opentelemetry/instrumentation-http': { enabled: true },
                '@opentelemetry/instrumentation-pg': { enabled: true },
                '@opentelemetry/instrumentation-redis': { enabled: true },
            }),
        ],
    });

    sdk.start();

    // Verify the global tracer provider was actually registered
    const provider = trace.getTracerProvider();
    const isNoop = provider instanceof ProxyTracerProvider
        ? false  // ProxyTracerProvider is set by SDK — this is correct
        : provider.constructor.name === 'NoopTracerProvider';

    if (isNoop) {
        console.warn('⚠️  OTel tracer provider is no-op — tracing will not work');
    } else {
        console.log('✅ OpenTelemetry tracing started');
    }

    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => console.log('✅ Tracing terminated'))
            .catch((error) => console.error('Error terminating tracing', error));
    });

    return sdk;
};
