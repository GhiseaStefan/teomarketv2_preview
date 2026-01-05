<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderProduct extends Model
{
    use HasFactory;

    protected $table = 'order_products';

    protected $fillable = [
        'order_id',
        'product_id',
        'name',
        'sku',
        'ean',
        'quantity',
        'vat_percent',
        'exchange_rate',
        'unit_price_currency',
        'unit_price_ron',
        'unit_purchase_price_ron',
        'total_currency_excl_vat',
        'total_currency_incl_vat',
        'total_ron_excl_vat',
        'total_ron_incl_vat',
        'profit_ron',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'vat_percent' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'unit_price_currency' => 'decimal:2',
        'unit_price_ron' => 'decimal:2',
        'unit_purchase_price_ron' => 'decimal:2',
        'total_currency_excl_vat' => 'decimal:2',
        'total_currency_incl_vat' => 'decimal:2',
        'total_ron_excl_vat' => 'decimal:2',
        'total_ron_incl_vat' => 'decimal:2',
        'profit_ron' => 'decimal:2',
    ];

    /**
     * Get the order that owns this order product.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the product for this order product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
