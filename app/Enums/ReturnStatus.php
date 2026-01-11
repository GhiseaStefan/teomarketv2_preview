<?php

namespace App\Enums;

enum ReturnStatus: string
{
    case PENDING = 'pending';
    case RECEIVED = 'received';
    case INSPECTING = 'inspecting';
    case REJECTED = 'rejected';
    case COMPLETED = 'completed';

    /**
     * Get the display name for the status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::RECEIVED => 'Received',
            self::INSPECTING => 'Inspecting',
            self::REJECTED => 'Rejected',
            self::COMPLETED => 'Completed',
        };
    }

    /**
     * Get the color code for the status.
     */
    public function colorCode(): string
    {
        return match ($this) {
            self::PENDING => '#F59E0B',
            self::RECEIVED => '#8B5CF6',
            self::INSPECTING => '#EC4899',
            self::REJECTED => '#EF4444',
            self::COMPLETED => '#6B7280',
        };
    }

    /**
     * Get all statuses as array with value, label and color.
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
     * Get all status values as array.
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
