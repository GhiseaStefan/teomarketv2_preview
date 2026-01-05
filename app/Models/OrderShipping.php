<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderShipping extends Model
{
    use HasFactory;

    protected $table = 'order_shipping';

    protected $fillable = [
        'order_id',
        'shipping_method_id',
        'title',
        'pickup_point_id',
        'tracking_number',
        'courier_data',
        'shipping_cost_excl_vat',
        'shipping_cost_incl_vat',
        'shipping_cost_ron_excl_vat',
        'shipping_cost_ron_incl_vat',
    ];

    protected $casts = [
        'courier_data' => 'array',
        'shipping_cost_excl_vat' => 'decimal:2',
        'shipping_cost_incl_vat' => 'decimal:2',
        'shipping_cost_ron_excl_vat' => 'decimal:2',
        'shipping_cost_ron_incl_vat' => 'decimal:2',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Sync pickup_point_id with courier_data.point_id
        static::saving(function ($orderShipping) {
            if ($orderShipping->courier_data && isset($orderShipping->courier_data['point_id'])) {
                // Auto-populate pickup_point_id from courier_data if not set
                if (empty($orderShipping->pickup_point_id)) {
                    $orderShipping->pickup_point_id = $orderShipping->courier_data['point_id'];
                }
            } elseif ($orderShipping->pickup_point_id && $orderShipping->courier_data) {
                // Sync point_id in courier_data if pickup_point_id is set but point_id is missing
                if (!isset($orderShipping->courier_data['point_id'])) {
                    $courierData = $orderShipping->courier_data;
                    $courierData['point_id'] = $orderShipping->pickup_point_id;
                    $orderShipping->courier_data = $courierData;
                }
            }
        });
    }

    /**
     * Get the order that owns this shipping.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the shipping method for this shipping.
     */
    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }
}
