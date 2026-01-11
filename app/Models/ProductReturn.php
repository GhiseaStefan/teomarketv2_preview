<?php

namespace App\Models;

use App\Enums\ReturnStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReturn extends Model
{
    use HasFactory;

    protected $table = 'returns';

    protected $fillable = [
        'order_id',
        'order_product_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'return_number',
        'order_number',
        'order_date',
        'product_name',
        'product_sku',
        'quantity',
        'return_reason',
        'return_reason_details',
        'is_product_opened',
        'iban',
        'refund_amount',
        'restock_item',
        'restocked_at',
        'status',
    ];

    protected $casts = [
        'order_date' => 'date',
        'quantity' => 'integer',
        'refund_amount' => 'decimal:2',
        'restock_item' => 'boolean',
        'restocked_at' => 'datetime',
        'status' => ReturnStatus::class,
    ];

    /**
     * Get the order for this return.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the order product for this return.
     */
    public function orderProduct(): BelongsTo
    {
        return $this->belongsTo(OrderProduct::class);
    }
}
