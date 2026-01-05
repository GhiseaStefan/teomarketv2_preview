<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequestLoggingMiddleware;
use App\Services\LoggingService;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('web')
                ->group(base_path('routes/admin.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state', 'locale', 'currency']);

        $middleware->web(prepend: [
            RequestLoggingMiddleware::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role.admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'role.manager' => \App\Http\Middleware\EnsureUserIsManager::class,
            'role.admin_or_manager' => \App\Http\Middleware\EnsureUserIsAdminOrManager::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Helper function to prepare error page data
        $prepareErrorPageData = function (\Illuminate\Http\Request $request) {
            // Get locale from session (if available), cookie, or default
            $locale = null;
            if ($request->hasSession()) {
                $locale = $request->session()->get('locale');
            }
            $locale = $locale ?? $request->cookie('locale') ?? config('app.locale');
            
            // Validate and set locale
            if (!in_array($locale, ['ro', 'en'])) {
                $locale = config('app.locale');
            }
            \Illuminate\Support\Facades\App::setLocale($locale);

            // Load translations for the current locale
            $translationsPath = base_path('lang/' . $locale . '.json');
            $translations = [];
            if (file_exists($translationsPath)) {
                $translations = json_decode(file_get_contents($translationsPath), true) ?? [];
            }

            return [
                'locale' => $locale,
                'translations' => $translations,
            ];
        };

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Not Found'], 404);
            }
            
            $errorData = $prepareErrorPageData($request);
            
            return Inertia::render('errors/404', $errorData)->toResponse($request)->setStatusCode(404);
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            $status = $e->getStatusCode();
            
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage() ?: 'Error'], $status);
            }

            $errorData = $prepareErrorPageData($request);

            $errorPages = [
                403 => 'errors/403',
                404 => 'errors/404',
                500 => 'errors/500',
                503 => 'errors/503',
            ];

            if (isset($errorPages[$status])) {
                return Inertia::render($errorPages[$status], $errorData)->toResponse($request)->setStatusCode($status);
            }

            return null;
        });

        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            // Log the error with full context
            LoggingService::logError($request, $e);

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Server Error'], 500);
            }

            // Only render 500 page when it's not a 404/403
            if (!($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) &&
                !($e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException)) {
                
                $errorData = $prepareErrorPageData($request);
                
                return Inertia::render('errors/500', $errorData)->toResponse($request)->setStatusCode(500);
            }

            return null;
        });
    })->create();
