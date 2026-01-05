<?php

namespace App\Models;

use App\Enums\OrderStatus as OrderStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'order_number',
        'invoice_series',
        'invoice_number',
        'currency',
        'exchange_rate',
        'vat_rate_applied',
        'is_vat_exempt',
        'total_excl_vat',
        'total_incl_vat',
        'total_ron_excl_vat',
        'total_ron_incl_vat',
        'payment_method_id',
        'status',
        'is_paid',
        'paid_at',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:4',
        'vat_rate_applied' => 'decimal:2',
        'is_vat_exempt' => 'boolean',
        'total_excl_vat' => 'decimal:2',
        'total_incl_vat' => 'decimal:2',
        'total_ron_excl_vat' => 'decimal:2',
        'total_ron_incl_vat' => 'decimal:2',
        'status' => OrderStatusEnum::class,
        'is_paid' => 'boolean',
        'paid_at' => 'datetime',
    ];

    /**
     * Get the customer that owns this order.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the payment method for this order.
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }


    /**
     * Get the shipping information for this order.
     */
    public function shipping(): HasOne
    {
        return $this->hasOne(OrderShipping::class);
    }

    /**
     * Get the products for this order.
     */
    public function products(): HasMany
    {
        return $this->hasMany(OrderProduct::class);
    }

    /**
     * Get the addresses for this order.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(OrderAddress::class);
    }

    /**
     * Get the billing address for this order.
     */
    public function billingAddress(): HasOne
    {
        return $this->hasOne(OrderAddress::class)->where('type', 'billing');
    }

    /**
     * Get the shipping address for this order.
     */
    public function shippingAddress(): HasOne
    {
        return $this->hasOne(OrderAddress::class)->where('type', 'shipping');
    }

    /**
     * Get the history entries for this order.
     */
    public function history(): HasMany
    {
        return $this->hasMany(OrderHistory::class);
    }

    /**
     * Log a change to order history.
     *
     * @param string $action Action type (e.g., 'status_changed', 'address_updated', 'order_cancelled')
     * @param mixed $oldValue Previous value (will be JSON encoded)
     * @param mixed $newValue New value (will be JSON encoded)
     * @param string|null $description Optional human-readable description
     * @param int|null $userId User ID who made the change (null for system/customer)
     * @return OrderHistory
     */
    public function logHistory(string $action, $oldValue = null, $newValue = null, ?string $description = null, ?int $userId = null): OrderHistory
    {
        return OrderHistory::create([
            'order_id' => $this->id,
            'user_id' => $userId ?? \Illuminate\Support\Facades\Auth::id(),
            'action' => $action,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'description' => $description,
        ]);
    }

    /**
     * Check if order is cancelled by checking order status or order history.
     *
     * @return bool
     */
    public function isCancelled(): bool
    {
        // Check if order status is "cancelled"
        if ($this->status === OrderStatusEnum::CANCELLED) {
            return true;
        }

        // Check if there's a cancellation action in order history
        return $this->history()
            ->where('action', 'order_cancelled')
            ->exists();
    }

    /**
     * Get cancellation date from order history.
     * This is a dynamic attribute that replaces the old cancelled_at column.
     *
     * @return \Illuminate\Support\Carbon|null
     */
    public function getCancelledAtAttribute()
    {
        $cancellationHistory = $this->history()
            ->where('action', 'order_cancelled')
            ->orderBy('created_at', 'desc')
            ->first();

        return $cancellationHistory ? $cancellationHistory->created_at : null;
    }

    /**
     * Check if order is paid.
     *
     * @return bool
     */
    public function isPaid(): bool
    {
        return $this->is_paid === true;
    }

    /**
     * Mark order as paid.
     *
     * @param int|null $userId User ID who marked the order as paid (null for system)
     * @return bool
     */
    public function markAsPaid(?int $userId = null): bool
    {
        if ($this->is_paid) {
            return false; // Already paid
        }

        $this->is_paid = true;
        $this->paid_at = now();
        $result = $this->save();

        if ($result) {
            $this->logHistory(
                'payment_received',
                false,
                true,
                'Order marked as paid',
                $userId
            );
        }

        return $result;
    }

    /**
     * Mark order as unpaid (for refunds or corrections).
     *
     * @param int|null $userId User ID who marked the order as unpaid (null for system)
     * @return bool
     */
    public function markAsUnpaid(?int $userId = null): bool
    {
        if (!$this->is_paid) {
            return false; // Already unpaid
        }

        $oldPaidAt = $this->paid_at;
        $this->is_paid = false;
        $this->paid_at = null;
        $result = $this->save();

        if ($result) {
            $this->logHistory(
                'payment_reversed',
                true,
                false,
                'Order marked as unpaid',
                $userId
            );
        }

        return $result;
    }
}
