<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LoggingService
{
    /**
     * Generate a unique request ID for tracing
     */
    public static function generateRequestId(): string
    {
        return (string) Str::uuid();
    }

    /**
     * Generate a trace ID for distributed tracing
     */
    public static function generateTraceId(): string
    {
        return (string) Str::uuid();
    }

    /**
     * Log a wide event (canonical log line) with all context
     * This is the single source of truth for each request
     *
     * @param Request $request
     * @param array $context Additional context to include
     * @param string $level Log level (info, error, warning, etc.)
     */
    public static function logWideEvent(Request $request, array $context = [], string $level = 'info'): void
    {
        $logData = self::buildWideEventData($request, $context);

        // Log as JSON structured log
        Log::channel('structured')->{$level}('request', $logData);
    }

    /**
     * Build comprehensive wide event data with high cardinality and dimensionality
     *
     * @param Request $request
     * @param array $additionalContext
     * @return array
     */
    public static function buildWideEventData(Request $request, array $additionalContext = []): array
    {
        $user = $request->user();
        $session = $request->hasSession() ? $request->session() : null;

        // High cardinality fields - essential for debugging
        $baseData = [
            // Request identification
            'request_id' => $request->header('X-Request-ID') ?? $request->attributes->get('request_id'),
            'trace_id' => $request->header('X-Trace-ID') ?? $request->attributes->get('trace_id'),
            'span_id' => $request->attributes->get('span_id'),

            // User identification
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'customer_id' => $user?->customer?->id ?? null,
            'customer_group_id' => $session?->get('customer_group_id') ?? $request->get('customer_group_id'),

            // Request details
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'path' => $request->path(),
            'route' => $request->route()?->getName(),
            'route_params' => $request->route()?->parameters() ?? [],
            'query_params' => $request->query(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'accept_language' => $request->header('accept-language'),

            // Session and state
            'session_id' => $session?->getId(),
            'locale' => $session?->get('locale') ?? $request->cookie('locale') ?? config('app.locale'),
            'currency' => $session?->get('currency') ?? $request->cookie('currency'),

            // Performance metrics
            'timestamp' => now()->toIso8601String(),
            'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'peak_memory_usage_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),

            // Response details (if available)
            'status_code' => $request->attributes->get('response_status_code'),
            'response_time_ms' => $request->attributes->get('response_time_ms'),

            // Application context
            'environment' => config('app.env'),
            'app_version' => config('app.version', '1.0.0'),
        ];

        // Add request body for POST/PUT/PATCH (sanitized)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            $body = $request->all();
            // Remove sensitive fields
            $sensitiveFields = ['password', 'password_confirmation', 'token', 'api_key', 'secret'];
            foreach ($sensitiveFields as $field) {
                if (isset($body[$field])) {
                    $body[$field] = '[REDACTED]';
                }
            }
            $baseData['request_body'] = $body;
        }

        // Add headers (sanitized)
        $headers = $request->headers->all();
        $sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        foreach ($sensitiveHeaders as $header) {
            if (isset($headers[$header])) {
                $headers[$header] = ['[REDACTED]'];
            }
        }
        $baseData['headers'] = $headers;

        // Merge additional context (allows services/controllers to add domain-specific data)
        $logData = array_merge($baseData, $additionalContext);

        // Remove null values to keep logs clean (but keep empty arrays/strings for context)
        return array_filter($logData, fn($value) => $value !== null);
    }

    /**
     * Log an error with full context
     *
     * @param Request $request
     * @param \Throwable $exception
     * @param array $context Additional context
     */
    public static function logError(Request $request, \Throwable $exception, array $context = []): void
    {
        $errorContext = array_merge($context, [
            'error' => true,
            'error_type' => get_class($exception),
            'error_message' => $exception->getMessage(),
            'error_code' => $exception->getCode(),
            'error_file' => $exception->getFile(),
            'error_line' => $exception->getLine(),
            'error_trace' => $exception->getTraceAsString(),
        ]);

        self::logWideEvent($request, $errorContext, 'error');
    }

    /**
     * Log a business event (e.g., order placed, cart updated)
     * This adds domain-specific context to the canonical log line
     *
     * @param Request $request
     * @param string $eventType Type of business event (e.g., 'order.placed', 'cart.updated')
     * @param array $eventData Event-specific data
     * @param string $level Log level
     */
    public static function logBusinessEvent(Request $request, string $eventType, array $eventData = [], string $level = 'info'): void
    {
        $context = array_merge([
            'event_type' => $eventType,
            'event_timestamp' => now()->toIso8601String(),
        ], $eventData);

        self::logWideEvent($request, $context, $level);
    }

    /**
     * Add context to request for later logging
     * Useful for accumulating context throughout request lifecycle
     *
     * @param Request $request
     * @param array $context
     */
    public static function addContext(Request $request, array $context): void
    {
        $existingContext = $request->attributes->get('log_context', []);
        $request->attributes->set('log_context', array_merge($existingContext, $context));
    }

    /**
     * Get accumulated context from request
     *
     * @param Request $request
     * @return array
     */
    public static function getContext(Request $request): array
    {
        return $request->attributes->get('log_context', []);
    }
}
