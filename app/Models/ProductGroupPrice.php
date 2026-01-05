<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductGroupPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'customer_group_id',
        'price_ron',
        'min_quantity',
    ];

    protected $casts = [
        'price_ron' => 'decimal:2',
        'min_quantity' => 'integer',
    ];

    /**
     * Get the product for this group price.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the customer group for this group price.
     */
    public function customerGroup(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class);
    }
}
