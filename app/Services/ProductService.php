<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Currency;
use App\Models\Category;
use App\Models\CustomerGroup;
use App\Models\VatRate;
use App\Utils\CurrencyConverter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProductService
{
    protected ProductPriceService $priceService;

    public function __construct(ProductPriceService $priceService)
    {
        $this->priceService = $priceService;
    }
    /**
     * Get all category IDs including children recursively.
     *
     * @param int $categoryId
     * @return array
     */
    private function getCategoryIdsRecursive(int $categoryId): array
    {
        $categoryIds = [$categoryId];
        $category = Category::where('id', $categoryId)->where('status', true)->first();
        
        if ($category) {
            $children = Category::where('parent_id', $categoryId)
                ->where('status', true)
                ->get();
            
            foreach ($children as $child) {
                $categoryIds = array_merge($categoryIds, $this->getCategoryIdsRecursive($child->id));
            }
        }
        
        return $categoryIds;
    }

    /**
     * Get products with pagination and optional filters.
     *
     * @param array $filters
     * @param int $perPage
     * @return array
     */
    public function getProducts(array $filters = [], int $perPage = 24): array
    {
        $query = Product::where('status', true)
            ->with(['images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])
            ->with(['productGroupPrices' => function ($query) {
                $query->orderBy('min_quantity', 'asc');
            }]);

        // Filter by category if provided (including all subcategories)
        if (isset($filters['category_id']) && $filters['category_id']) {
            $categoryIds = $this->getCategoryIdsRecursive((int) $filters['category_id']);
            $query->whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        // Filter by category slug if provided (including all subcategories)
        if (isset($filters['category_slug']) && $filters['category_slug']) {
            $category = Category::where('slug', $filters['category_slug'])
                ->where('status', true)
                ->first();
            
            if ($category) {
                $categoryIds = $this->getCategoryIdsRecursive($category->id);
                $query->whereHas('categories', function ($q) use ($categoryIds) {
                    $q->whereIn('categories.id', $categoryIds);
                });
            }
        }

        // Search by name if provided
        if (isset($filters['search']) && $filters['search']) {
            $query->where('name', 'like', '%' . $filters['search'] . '%');
        }

        // Filter by price range (min price)
        if (isset($filters['price_min']) && $filters['price_min'] !== '') {
            $query->where('price_ron', '>=', (float) $filters['price_min']);
        }

        // Filter by price range (max price)
        if (isset($filters['price_max']) && $filters['price_max'] !== '') {
            $query->where('price_ron', '<=', (float) $filters['price_max']);
        }

        // Filter by stock availability
        if (isset($filters['in_stock']) && $filters['in_stock'] !== '') {
            if ($filters['in_stock'] === '1' || $filters['in_stock'] === true || $filters['in_stock'] === 'true') {
                $query->where('stock_quantity', '>', 0);
            } elseif ($filters['in_stock'] === '0' || $filters['in_stock'] === false || $filters['in_stock'] === 'false') {
                $query->where('stock_quantity', '<=', 0);
            }
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'name';
        $orderDirection = $filters['order_direction'] ?? 'asc';
        $query->orderBy($orderBy, $orderDirection);

        $products = $query->paginate($perPage);

        return [
            'products' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ];
    }

    /**
     * Format products for frontend display.
     *
     * @param Collection $products
     * @param Currency $currency
     * @param int|null $customerGroupId Optional customer group ID for quantity-based pricing
     * @param \Illuminate\Http\Request|null $request Optional request object for country detection
     * @return array
     */
    public function formatProductsForDisplay(Collection $products, Currency $currency, ?int $customerGroupId = null, ?\Illuminate\Http\Request $request = null): array
    {
        return $products->map(function ($product) use ($currency, $customerGroupId, $request) {
            // Get image from database
            $imageUrl = null;
            
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images->first() && $product->images->first()->image_url) {
                $imageUrl = $product->images->first()->image_url;
            }
            
            // Get price for quantity 1 using centralized price service
            $priceInfo = $this->priceService->getPriceInfo($product, $currency, 1, $customerGroupId, null, $request);
            
            // Get quantity-based price tiers using centralized price service
            $priceTiers = $this->priceService->getPriceTiers($product, $currency, $customerGroupId, $request);
            
            return [
                'id' => $product->id,
                'name' => $product->name,
                'price_raw' => $priceInfo['unit_price_display'], // Display price already calculated for customer group
                'price_tiers' => $priceTiers,
                'image' => $imageUrl,
                'stock_quantity' => $product->stock_quantity,
                'sku' => $product->sku,
                'short_description' => $product->short_description,
                'vat_included' => $priceInfo['vat_included'],
                'show_vat' => $priceInfo['show_vat'], // Whether VAT should be shown for this customer group
            ];
        })->toArray();
    }

    /**
     * Get category information if category filter is applied.
     *
     * @param array $filters
     * @return array|null
     */
    public function getCategoryInfo(array $filters): ?array
    {
        $category = null;

        if (isset($filters['category_id']) && $filters['category_id']) {
            $category = Category::where('id', $filters['category_id'])
                ->where('status', true)
                ->first();
        } elseif (isset($filters['category_slug']) && $filters['category_slug']) {
            $category = Category::where('slug', $filters['category_slug'])
                ->where('status', true)
                ->first();
        }

        if (!$category) {
            return null;
        }

        // Build breadcrumb path
        $breadcrumb = [];
        $current = $category;
        while ($current) {
            array_unshift($breadcrumb, [
                'name' => $current->name,
                'slug' => $current->slug,
            ]);
            $current = $current->parent;
        }

        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'breadcrumb' => $breadcrumb,
        ];
    }
}

