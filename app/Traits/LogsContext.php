<?php

namespace App\Traits;

use App\Services\LoggingService;
use Illuminate\Http\Request;

trait LogsContext
{
    /**
     * Add context to the current request for logging
     *
     * @param array $context
     * @return void
     */
    protected function addLogContext(array $context): void
    {
        if (request()) {
            LoggingService::addContext(request(), $context);
        }
    }

    /**
     * Log a business event with current request context
     *
     * @param string $eventType
     * @param array $eventData
     * @param string $level
     * @return void
     */
    protected function logBusinessEvent(string $eventType, array $eventData = [], string $level = 'info'): void
    {
        if (request()) {
            LoggingService::logBusinessEvent(request(), $eventType, $eventData, $level);
        }
    }

    /**
     * Get the current request ID for tracing
     *
     * @return string|null
     */
    protected function getRequestId(): ?string
    {
        return request()?->attributes->get('request_id');
    }

    /**
     * Get the current trace ID for distributed tracing
     *
     * @return string|null
     */
    protected function getTraceId(): ?string
    {
        return request()?->attributes->get('trace_id');
    }
}
