<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Cookie name for storing locale.
     */
    private const LOCALE_COOKIE_NAME = 'locale';

    /**
     * Available languages.
     */
    private const AVAILABLE_LANGUAGES = ['ro', 'en'];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // First try to get locale from session
        $locale = $request->session()->get('locale');

        // If not in session, try to get from cookie (for persistence across login/logout)
        if (!$locale) {
            $locale = $request->cookie(self::LOCALE_COOKIE_NAME);
        }

        // If still not found, use default from config
        if (!$locale) {
            $locale = config('app.locale');
        }

        // Validate and set locale
        if (in_array($locale, self::AVAILABLE_LANGUAGES)) {
            App::setLocale($locale);

            // Restore locale to session if it was only in cookie
            // This ensures session and cookie stay in sync
            if (!$request->session()->has('locale')) {
                Session::put('locale', $locale);
            }
        }

        return $next($request);
    }
}
