import React from 'react';
import type { Currency } from '../types';

// NOTE: Price calculation logic has been moved to backend (ProductPriceService).
// Frontend now uses display_price values already calculated by the backend.
// This ensures a single source of truth for pricing logic.

/**
 * Formats a price with currency symbols.
 * 
 * @param price - The numeric price value
 * @param currency - The currency object
 * @returns Formatted price string with currency symbol
 */
export function formatPriceWithCurrency(price: number, currency: Currency): string {
    const formattedPrice = price.toFixed(2);
    if (currency.symbol_left) {
        return `${currency.symbol_left}${formattedPrice}`;
    } else if (currency.symbol_right) {
        return `${formattedPrice}${currency.symbol_right}`;
    } else {
        return `${formattedPrice} ${currency.code}`;
    }
}

/**
 * Formats a price string to display with:
 * - Thousands separator (.) every 3 digits
 * - Decimal separator (,) for decimals
 * - Decimal part (cents/bani) as superscript
 * 
 * @param priceString - The price string or number (e.g., "2298.99", "123.45", "100", 2298.99)
 * @returns React JSX element with formatted price
 * 
 * Example:
 * - "2298.99 RON" -> "2.298,99" RON with "99" as superscript
 * - "123.45" -> "123,45" with "45" as superscript  
 * - "100" -> "100" (no superscript if no decimals)
 */
export function formatPriceWithSuperscript(priceString: string | number): React.ReactElement {
    // Convert to string if it's a number
    const priceStr = typeof priceString === 'number' ? priceString.toString() : priceString;
    
    // Extract currency symbols/prefix and suffix
    // Match: optional prefix (currency symbols), numeric part, optional suffix (currency code like "RON")
    const trimmed = priceStr.trim();
    
    // Try to find numeric part with optional prefix and suffix
    const numericMatch = trimmed.match(/([\d.,]+)/);
    
    if (!numericMatch) {
        // No numeric part found, return as-is
        return <>{priceString}</>;
    }
    
    const numericPart = numericMatch[0];
    const numericIndex = numericMatch.index || 0;
    const prefix = trimmed.substring(0, numericIndex);
    const suffix = trimmed.substring(numericIndex + numericPart.length);
    
    return formatNumericPart(prefix, numericPart, suffix);
}

function formatNumericPart(prefix: string, numericPart: string, suffix: string): React.ReactElement {
    // Normalize: replace comma with dot if present, then parse
    const normalizedNumeric = numericPart.replace(/,/g, '.');
    const parts = normalizedNumeric.split('.');
    const integerPartStr = parts[0] || '0';
    const decimalPart = parts[1] || '';
    
    // Parse integer part and format with thousands separator
    const integerPart = parseInt(integerPartStr.replace(/\./g, ''), 10);
    if (isNaN(integerPart)) {
        return <>{prefix}{numericPart}{suffix}</>;
    }
    
    // Format integer part with thousands separator (dot)
    // Manual formatting with dots every 3 digits from right
    const integerStr = integerPart.toString();
    let formattedInteger = '';
    for (let i = 0; i < integerStr.length; i++) {
        if (i > 0 && (integerStr.length - i) % 3 === 0) {
            formattedInteger += '.';
        }
        formattedInteger += integerStr[i];
    }
    
    // If there are decimals, show them as superscript with comma separator
    if (decimalPart) {
        // Take only first 2 decimal digits (cents/bani)
        const paddedDecimal = decimalPart.slice(0, 2).padEnd(2, '0');
        
        return (
            <>
                {prefix}
                {formattedInteger}
                <sup>{',' + paddedDecimal}</sup>
                {suffix}
            </>
        );
    }
    
    // No decimals - just show the formatted integer
    return (
        <>
            {prefix}
            {formattedInteger}
            {suffix}
        </>
    );
}
