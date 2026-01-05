<?php

namespace App\Models;

use App\Utils\CurrencyConverter;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'symbol_left',
        'symbol_right',
        'value',
        'status',
    ];

    protected $casts = [
        'value' => 'decimal:4',
        'status' => 'boolean',
    ];

    /**
     * Convert an amount from RON to this currency.
     *
     * @param float $amountInRon Amount in RON
     * @param int $precision Number of decimal places (default: 2)
     * @return float|null Converted amount or null if conversion fails
     */
    public function convertFromRon(float $amountInRon, int $precision = 2): ?float
    {
        return CurrencyConverter::convertFromRon($amountInRon, $this->code, $precision);
    }

    /**
     * Convert an amount to RON from this currency.
     *
     * @param float $amount Amount in this currency
     * @param int $precision Number of decimal places (default: 2)
     * @return float|null Converted amount in RON or null if conversion fails
     */
    public function convertToRon(float $amount, int $precision = 2): ?float
    {
        return CurrencyConverter::convertToRon($amount, $this->code, $precision);
    }

    /**
     * Format an amount with this currency's symbol.
     *
     * @param float $amount The amount to format
     * @param int $precision Number of decimal places (default: 2)
     * @return string Formatted currency string
     */
    public function format(float $amount, int $precision = 2): string
    {
        return CurrencyConverter::format($amount, $this, $precision);
    }

    /**
     * Get the orders for this currency.
     * Note: currency is stored as string (code) in orders table, not as foreign key.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'currency', 'code');
    }
}
