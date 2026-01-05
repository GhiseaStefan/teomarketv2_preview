<?php

namespace App\Models;

use App\Enums\ShippingMethodType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'type',
        'cost',
        'estimated_days',
    ];

    protected $casts = [
        'type' => ShippingMethodType::class,
        'cost' => 'decimal:2',
        'estimated_days' => 'integer',
    ];

    /**
     * Get the configs for this shipping method.
     */
    public function configs(): HasMany
    {
        return $this->hasMany(ShippingMethodConfig::class);
    }

    /**
     * Get the order shipping records for this shipping method.
     */
    public function orderShippings(): HasMany
    {
        return $this->hasMany(OrderShipping::class);
    }
}
