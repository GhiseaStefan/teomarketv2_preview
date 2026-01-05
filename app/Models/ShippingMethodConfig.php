<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingMethodConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipping_method_id',
        'config_key',
        'config_value',
    ];

    /**
     * Get the shipping method that owns this config.
     */
    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }
}
