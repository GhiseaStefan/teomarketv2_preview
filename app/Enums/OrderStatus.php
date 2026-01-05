<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'pending';
    case AWAITING_PAYMENT = 'awaiting_payment';
    case CONFIRMED = 'confirmed';
    case PROCESSING = 'processing';
    case SHIPPED = 'shipped';
    case DELIVERED = 'delivered';
    case CANCELLED = 'cancelled';
    case REFUNDED = 'refunded';

    /**
     * Get the display name for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::AWAITING_PAYMENT => 'Awaiting Payment',
            self::CONFIRMED => 'Confirmed',
            self::PROCESSING => 'Processing',
            self::SHIPPED => 'Shipped',
            self::DELIVERED => 'Delivered',
            self::CANCELLED => 'Cancelled',
            self::REFUNDED => 'Refunded',
        };
    }

    /**
     * Get the color code for the status.
     */
    public function colorCode(): string
    {
        return match ($this) {
            self::PENDING => '#F59E0B',
            self::AWAITING_PAYMENT => '#F97316',
            self::CONFIRMED => '#0EA5E9',
            self::PROCESSING => '#6366F1',
            self::SHIPPED => '#3B82F6',
            self::DELIVERED => '#10B981',
            self::CANCELLED => '#EF4444',
            self::REFUNDED => '#64748B',
        };
    }

    /**
     * Get all statuses as array with label and color.
     */
    public static function all(): array
    {
        return array_map(
            fn ($case) => [
                'value' => $case->value,
                'label' => $case->label(),
                'color_code' => $case->colorCode(),
            ],
            self::cases()
        );
    }

    /**
     * Try to get status from label (for backward compatibility).
     */
    public static function fromLabel(string $label): ?self
    {
        return match (strtolower(trim($label))) {
            'pending' => self::PENDING,
            'awaiting payment' => self::AWAITING_PAYMENT,
            'confirmed' => self::CONFIRMED,
            'processing' => self::PROCESSING,
            'shipped' => self::SHIPPED,
            'delivered' => self::DELIVERED,
            'cancelled' => self::CANCELLED,
            'refunded' => self::REFUNDED,
            default => null,
        };
    }
}
