<?php

namespace App\Utils;

use App\Models\Currency;

class CurrencyConverter
{
    /**
     * Convert an amount from one currency to another.
     *
     * @param float $amount The amount to convert
     * @param string $fromCurrencyCode Source currency code (e.g., 'RON')
     * @param string $toCurrencyCode Target currency code (e.g., 'EUR')
     * @param int $precision Number of decimal places (default: 2)
     * @return float|null Converted amount or null if currencies not found
     */
    public static function convert(float $amount, string $fromCurrencyCode, string $toCurrencyCode, int $precision = 2): ?float
    {
        if ($fromCurrencyCode === $toCurrencyCode) {
            return round($amount, $precision);
        }

        $fromCurrency = Currency::where('code', $fromCurrencyCode)->first();
        $toCurrency = Currency::where('code', $toCurrencyCode)->first();

        if (!$fromCurrency || !$toCurrency) {
            return null;
        }

        // Convert to base currency (RON) first, then to target currency
        // If amount is in RON (base), divide by target rate
        // If amount is in foreign currency, multiply by source rate to get RON, then divide by target rate

        if ($fromCurrencyCode === 'RON') {
            // Converting from RON to another currency
            $converted = $amount / $toCurrency->value;
        } elseif ($toCurrencyCode === 'RON') {
            // Converting to RON from another currency
            $converted = $amount * $fromCurrency->value;
        } else {
            // Converting between two non-RON currencies
            // First convert to RON, then to target currency
            $amountInRon = $amount * $fromCurrency->value;
            $converted = $amountInRon / $toCurrency->value;
        }

        return round($converted, $precision);
    }

    /**
     * Convert an amount from RON to a target currency.
     *
     * @param float $amountInRon Amount in RON
     * @param string $toCurrencyCode Target currency code
     * @param int $precision Number of decimal places (default: 2)
     * @return float|null Converted amount or null if currency not found
     */
    public static function convertFromRon(float $amountInRon, string $toCurrencyCode, int $precision = 2): ?float
    {
        return self::convert($amountInRon, 'RON', $toCurrencyCode, $precision);
    }

    /**
     * Convert an amount to RON from a source currency.
     *
     * @param float $amount Amount in source currency
     * @param string $fromCurrencyCode Source currency code
     * @param int $precision Number of decimal places (default: 2)
     * @return float|null Converted amount in RON or null if currency not found
     */
    public static function convertToRon(float $amount, string $fromCurrencyCode, int $precision = 2): ?float
    {
        return self::convert($amount, $fromCurrencyCode, 'RON', $precision);
    }

    /**
     * Format a currency amount with its symbol.
     *
     * @param float $amount The amount to format
     * @param Currency $currency The currency object
     * @param int $precision Number of decimal places (default: 2)
     * @return string Formatted currency string
     */
    public static function format(float $amount, Currency $currency, int $precision = 2): string
    {
        $formattedAmount = number_format($amount, $precision, '.', '');

        $symbol = $currency->symbol_left ?? $currency->symbol_right ?? '';
        $isLeft = $currency->symbol_left !== null;

        if ($isLeft) {
            return $symbol . $formattedAmount;
        }

        return $formattedAmount . $symbol;
    }
}

