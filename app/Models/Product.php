<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\CustomerGroup;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku',
        'ean',
        'model',
        'name',
        'slug',
        'description',
        'short_description',
        'price_ron',
        'purchase_price_ron',
        'brand_id',
        'stock_quantity',
        'weight',
        'length',
        'width',
        'height',
        'main_image_url',
        'status',
    ];

    protected $casts = [
        'price_ron' => 'decimal:2',
        'purchase_price_ron' => 'decimal:2',
        'stock_quantity' => 'integer',
        'weight' => 'decimal:2',
        'length' => 'decimal:2',
        'width' => 'decimal:2',
        'height' => 'decimal:2',
        'status' => 'boolean',
    ];

    /**
     * Get the images for this product.
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /**
     * Get the categories for this product.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_to_category')
            ->withTimestamps();
    }

    /**
     * Get the order products for this product.
     */
    public function orderProducts(): HasMany
    {
        return $this->hasMany(OrderProduct::class);
    }

    /**
     * Get the product group prices for this product.
     */
    public function productGroupPrices(): HasMany
    {
        return $this->hasMany(ProductGroupPrice::class);
    }

    /**
     * Get the reviews for this product.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the brand for this product.
     */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Get quantity-based group prices for a specific customer group.
     * Returns price tiers with calculated min and max quantities.
     * For unauthenticated users (null customerGroupId), uses B2C customer group.
     *
     * @param int|null $customerGroupId Customer group ID (null defaults to B2C for unauthenticated users)
     * @return array Array of price tiers with min_quantity, max_quantity (null for last), and price_ron
     */
    public function getQuantityPriceTiers(?int $customerGroupId = null): array
    {
        $basePrice = (float) $this->price_ron;
        $tiers = [];

        // Get effective customer group ID (defaults to B2C if not provided)
        if ($customerGroupId === null) {
            $customerGroupId = CustomerGroup::getB2CGroupId();
        }

        // If customer group is specified (including B2C for unauthenticated), get group-specific prices
        if ($customerGroupId) {
            // Use loaded relationship if available, otherwise query
            $groupPrices = $this->relationLoaded('productGroupPrices')
                ? $this->productGroupPrices->where('customer_group_id', $customerGroupId)
                : $this->productGroupPrices()
                    ->where('customer_group_id', $customerGroupId)
                    ->orderBy('min_quantity', 'asc')
                    ->get();

            // Only calculate tiers if group-specific prices exist
            if ($groupPrices->isNotEmpty()) {
                // Calculate intervals based on min_quantity values
                $groupPricesArray = $groupPrices->toArray();
                
                foreach ($groupPricesArray as $index => $groupPrice) {
                    $minQuantity = $groupPrice['min_quantity'];
                    $maxQuantity = null; // Default: no upper limit
                    
                    // Check if there's a next tier
                    if (isset($groupPricesArray[$index + 1])) {
                        // Next tier starts at this min_quantity, so current tier ends at (next_min - 1)
                        $maxQuantity = $groupPricesArray[$index + 1]['min_quantity'] - 1;
                    }
                    // If no next tier, maxQuantity remains null (meaning "10+" or unlimited)
                    
                    $tiers[] = [
                        'min_quantity' => $minQuantity,
                        'max_quantity' => $maxQuantity,
                        'price_ron' => (float) $groupPrice['price_ron'],
                    ];
                }
            }
            // If no group prices found for this customer group, return empty array
            // (don't show false price tiers)
        }

        return $tiers;
    }
}
