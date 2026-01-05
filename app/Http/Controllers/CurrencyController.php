<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class CurrencyController extends Controller
{
    /**
     * Cookie name for storing currency.
     */
    private const CURRENCY_COOKIE_NAME = 'currency';

    /**
     * Cookie lifetime in minutes (1 year).
     */
    private const COOKIE_LIFETIME = 525600;

    /**
     * Update the selected currency in session and cookie.
     */
    public function update(Request $request)
    {
        $request->validate([
            'currency_code' => 'required|string|exists:currencies,code',
        ]);

        $currency = Currency::where('code', $request->currency_code)
            ->where('status', true)
            ->firstOrFail();

        // Store in session
        Session::put('currency', $currency->code);

        // Store in cookie for persistence across login/logout
        return back()->cookie(
            self::CURRENCY_COOKIE_NAME,
            $currency->code,
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
