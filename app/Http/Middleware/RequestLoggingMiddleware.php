<?php

namespace App\Http\Middleware;

use App\Services\LoggingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequestLoggingMiddleware
{
    /**
     * Handle an incoming request.
     * Captures request context and logs the canonical log line
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $startMemory = memory_get_usage(true);

        // Generate request ID and trace ID if not present
        $requestId = $request->header('X-Request-ID') ?? LoggingService::generateRequestId();
        $traceId = $request->header('X-Trace-ID') ?? LoggingService::generateTraceId();
        $spanId = LoggingService::generateRequestId();

        // Store IDs in request attributes for use throughout the request lifecycle
        $request->attributes->set('request_id', $requestId);
        $request->attributes->set('trace_id', $traceId);
        $request->attributes->set('span_id', $spanId);

        // Add IDs to response headers for client tracing
        $response = $next($request);

        // Calculate response time
        $responseTime = (microtime(true) - $startTime) * 1000; // Convert to milliseconds
        $memoryDelta = memory_get_usage(true) - $startMemory;

        // Store response metrics in request attributes for logging
        $request->attributes->set('response_status_code', $response->getStatusCode());
        $request->attributes->set('response_time_ms', round($responseTime, 2));
        $request->attributes->set('memory_delta_bytes', $memoryDelta);

        // Add trace headers to response
        $response->headers->set('X-Request-ID', $requestId);
        $response->headers->set('X-Trace-ID', $traceId);
        $response->headers->set('X-Span-ID', $spanId);

        // Get accumulated context from request lifecycle
        $accumulatedContext = LoggingService::getContext($request);

        // Add performance metrics to context
        $accumulatedContext['performance'] = [
            'response_time_ms' => round($responseTime, 2),
            'memory_delta_mb' => round($memoryDelta / 1024 / 1024, 2),
            'start_memory_mb' => round($startMemory / 1024 / 1024, 2),
            'end_memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
        ];

        // Determine log level based on response status
        $logLevel = $this->determineLogLevel($response->getStatusCode());

        // Log the canonical log line (wide event)
        LoggingService::logWideEvent($request, $accumulatedContext, $logLevel);

        return $response;
    }

    /**
     * Determine log level based on HTTP status code
     *
     * @param int $statusCode
     * @return string
     */
    private function determineLogLevel(int $statusCode): string
    {
        if ($statusCode >= 500) {
            return 'error';
        } elseif ($statusCode >= 400) {
            return 'warning';
        }

        return 'info';
    }
}

