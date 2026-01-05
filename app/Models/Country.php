<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'iso_code_2',
        'iso_code_3',
        'status',
    ];

    protected $casts = [
        'status' => 'boolean',
    ];

    /**
     * Get the VAT rates for this country.
     */
    public function vatRates(): HasMany
    {
        return $this->hasMany(VatRate::class);
    }

    /**
     * Get the shop info for this country.
     */
    public function shopInfo(): HasMany
    {
        return $this->hasMany(ShopInfo::class);
    }

    /**
     * Get the addresses for this country.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /**
     * Get the states for this country.
     */
    public function states(): HasMany
    {
        return $this->hasMany(State::class);
    }
}
