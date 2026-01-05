<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class LanguageController extends Controller
{
    /**
     * Available languages.
     */
    private const AVAILABLE_LANGUAGES = ['ro', 'en'];

    /**
     * Cookie name for storing locale.
     */
    private const LOCALE_COOKIE_NAME = 'locale';

    /**
     * Cookie lifetime in minutes (1 year).
     */
    private const COOKIE_LIFETIME = 525600;

    /**
     * Update the selected language in session and cookie.
     */
    public function update(Request $request)
    {
        $request->validate([
            'locale' => 'required|string|in:' . implode(',', self::AVAILABLE_LANGUAGES),
        ]);

        $locale = $request->locale;

        if (in_array($locale, self::AVAILABLE_LANGUAGES)) {
            // Store in session
            Session::put('locale', $locale);

            app()->setLocale($locale);
        }

        // Store in cookie for persistence across login/logout
        // Use cookie() helper to create and queue the cookie
        return back()->cookie(
            self::LOCALE_COOKIE_NAME,
            $locale,
            self::COOKIE_LIFETIME,
            '/',
            null,
            config('session.secure'),
            false, // httpOnly = false to allow JS access if needed
            false,
            config('session.same_site', 'lax')
        );
    }
}
