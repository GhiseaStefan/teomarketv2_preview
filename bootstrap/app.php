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

        // Handle ValidationException - return 422 with validation errors
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, \Illuminate\Http\Request $request) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                // For Inertia requests, return back with errors so they can be displayed in forms/toasts
                if ($request->header('X-Inertia')) {
                    return back()->withErrors($e->errors())->withInput();
                }
                // For JSON API requests
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => $e->errors(),
                ], 422);
            }

            return redirect()->back()->withErrors($e->errors())->withInput();
        });

        // Handle AuthenticationException - return 401 or redirect with errors for Inertia
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            // For Inertia requests (like login), return back with error message
            if ($request->header('X-Inertia')) {
                $message = $e->getMessage() ?: __('auth.failed');
                return back()->withErrors(['email' => $message]);
            }

            // For regular web requests, redirect to login
            return redirect()->guest(route('login'));
        });

        // Handle AuthorizationException - return 403
        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage() ?: 'This action is unauthorized.'], 403);
            }

            $errorData = $prepareErrorPageData($request);
            return Inertia::render('errors/403', $errorData)->toResponse($request)->setStatusCode(403);
        });

        // Handle ModelNotFoundException - return 404
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }

            $errorData = $prepareErrorPageData($request);
            return Inertia::render('errors/404', $errorData)->toResponse($request)->setStatusCode(404);
        });

        // Handle ThrottleRequestsException - return 429
        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, \Illuminate\Http\Request $request) {
            $message = $e->getMessage() ?: 'Too Many Attempts.';

            if ($request->expectsJson() || $request->header('X-Inertia')) {
                // For Inertia requests, return back with error
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['message' => $message]);
                }
                return response()->json(['message' => $message], 429);
            }

            return redirect()->back()->withErrors(['message' => $message]);
        });

        // Handle NotFoundHttpException - return 404
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Not Found'], 404);
            }

            $errorData = $prepareErrorPageData($request);

            return Inertia::render('errors/404', $errorData)->toResponse($request)->setStatusCode(404);
        });

        // Handle other HttpException - return appropriate status code
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

        // Handle all other exceptions - return 500 only for truly unexpected errors
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) use ($prepareErrorPageData) {
            // Log the error with full context
            LoggingService::logError($request, $e);

            // Don't render 500 for exceptions that should be handled above
            if (
                $e instanceof \Illuminate\Validation\ValidationException ||
                $e instanceof \Illuminate\Auth\AuthenticationException ||
                $e instanceof \Illuminate\Auth\Access\AuthorizationException ||
                $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException ||
                $e instanceof \Illuminate\Http\Exceptions\ThrottleRequestsException ||
                $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException ||
                $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException
            ) {
                return null;
            }

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Server Error'], 500);
            }

            $errorData = $prepareErrorPageData($request);

            return Inertia::render('errors/500', $errorData)->toResponse($request)->setStatusCode(500);
        });
    })->create();
