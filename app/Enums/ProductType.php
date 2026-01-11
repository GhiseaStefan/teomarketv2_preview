<?php

namespace App\Enums;

enum ProductType: string
{
    case SIMPLE = 'simple';
    case CONFIGURABLE = 'configurable';
    case VARIANT = 'variant';

    /**
     * Get the display name for the product type.
     */
    public function label(): string
    {
        return match ($this) {
            self::SIMPLE => 'Simple',
            self::CONFIGURABLE => 'Configurable',
            self::VARIANT => 'Variant',
        };
    }

    /**
     * Get all types as array with value and label.
     */
    public static function all(): array
    {
        return array_map(
            fn ($case) => [
                'value' => $case->value,
                'label' => $case->label(),
            ],
            self::cases()
        );
    }
}
