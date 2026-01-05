<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
    ];

    /**
     * Get the customers for this group.
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Get the product group prices for this group.
     */
    public function productGroupPrices(): HasMany
    {
        return $this->hasMany(ProductGroupPrice::class);
    }

    /**
     * Get the default B2C customer group ID.
     * This is the single source of truth for B2C group lookup.
     *
     * @return int|null B2C customer group ID, or null if not found
     */
    public static function getB2CGroupId(): ?int
    {
        static $b2cGroupId = null;
        
        if ($b2cGroupId === null) {
            $b2cGroup = self::where('code', 'B2C')->first();
            $b2cGroupId = $b2cGroup ? $b2cGroup->id : null;
        }
        
        return $b2cGroupId;
    }

    /**
     * Get the default B2C customer group instance.
     * This is the single source of truth for B2C group lookup.
     *
     * @return CustomerGroup|null B2C customer group, or null if not found
     */
    public static function getB2CGroup(): ?self
    {
        return self::where('code', 'B2C')->first();
    }
}
