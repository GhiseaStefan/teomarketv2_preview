<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Currency;
use App\Models\Category;
use App\Models\CustomerGroup;
use App\Models\VatRate;
use App\Models\Attribute;
use App\Models\ProductFamily;
use App\Models\ProductAttributeValue;
use App\Enums\ProductType;
use App\Utils\CurrencyConverter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ProductService
{
    protected ProductPriceService $priceService;

    public function __construct(ProductPriceService $priceService)
    {
        $this->priceService = $priceService;
    }
    /**
     * Filter query to show only simple and configurable products (exclude variants).
     * Variants should only be displayed through their parent configurable products.
     *
     * @param Builder $query
     * @return Builder
     */
    private function filterPublicProducts(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->where('type', ProductType::SIMPLE->value)
                ->orWhere('type', ProductType::CONFIGURABLE->value)
                ->orWhereNull('type'); // Handle products created before migration (default to simple)
        });
    }

    /**
     * Apply attribute filters to a product query.
     * Filters by attribute values - for configurable products, checks if any variant matches.
     *
     * @param Builder $query
     * @param array $filters
     * @return Builder
     */
    private function applyAttributeFilters(Builder $query, array $filters): Builder
    {
        // Check if attribute filters are provided (format: attributes[attribute_id] = "value_id1,value_id2")
        if (!isset($filters['attributes']) || !is_array($filters['attributes'])) {
            return $query;
        }

        $attributeFilters = $filters['attributes'];

        if (empty($attributeFilters)) {
            return $query;
        }

        // For each attribute filter, we need to find products that match
        // For simple products: product must have matching attribute values
        // For configurable products: at least one variant must have matching attribute values
        foreach ($attributeFilters as $attributeId => $valueIdsString) {
            if (empty($valueIdsString)) {
                continue;
            }

            // Parse value IDs (can be comma-separated)
            $valueIds = is_array($valueIdsString)
                ? $valueIdsString
                : array_filter(array_map('trim', explode(',', $valueIdsString)));

            if (empty($valueIds)) {
                continue;
            }

            $attributeId = (int) $attributeId;

            // Filter products where:
            // 1. Simple products: product has matching attribute value directly
            // 2. Configurable products: has at least one variant with matching attribute value
            $query->where(function ($q) use ($attributeId, $valueIds) {
                // Simple products: check direct attribute values
                $q->where(function ($simpleQuery) use ($attributeId, $valueIds) {
                    $simpleQuery->where(function ($typeQuery) {
                        $typeQuery->where('type', ProductType::SIMPLE->value)
                            ->orWhereNull('type');
                    })
                        ->whereHas('attributeValues', function ($avQuery) use ($attributeId, $valueIds) {
                            $avQuery->where('attribute_id', $attributeId)
                                ->whereIn('attribute_value_id', $valueIds);
                        });
                })
                    // Configurable products: check variants' attribute values
                    ->orWhere(function ($configurableQuery) use ($attributeId, $valueIds) {
                        $configurableQuery->where('type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($variantQuery) use ($attributeId, $valueIds) {
                                $variantQuery->where('status', true)
                                    ->whereHas('attributeValues', function ($avQuery) use ($attributeId, $valueIds) {
                                        $avQuery->where('attribute_id', $attributeId)
                                            ->whereIn('attribute_value_id', $valueIds);
                                    });
                            });
                    });
            });
        }

        return $query;
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
        // If search query is provided, use Scout search with TNTSearch
        if (isset($filters['search']) && !empty(trim($filters['search']))) {
            $searchQuery = trim($filters['search']);

            // First, get ONLY IDs from TNTSearch (using keys() avoids hydrating models)
            // This is extremely fast compared to get() - keys() returns only IDs without loading models
            // TNTSearch doesn't support constrain() properly, so we'll filter after getting IDs
            $searchResultIds = Product::search($searchQuery)->keys()->toArray();

            // If no search results, return empty
            if (empty($searchResultIds)) {
                return [
                    'products' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $perPage,
                        'total' => 0,
                    ],
                ];
            }

            // Now build a query with all filters applied, starting from search result IDs
            $query = Product::whereIn('id', $searchResultIds)
                ->where('status', true);

            // Filter to show only simple and configurable products (exclude variants)
            $query = $this->filterPublicProducts($query);

            $query->with(['images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])
                ->with(['productGroupPrices' => function ($query) {
                    $query->orderBy('min_quantity', 'asc');
                }])
                ->with(['variants' => function ($query) {
                    $query->where('status', true);
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

            // Filter by attributes
            $query = $this->applyAttributeFilters($query, $filters);

            // Determine ordering - default to relevance (preserve search order if no custom order)
            $orderBy = $filters['order_by'] ?? null;
            $orderDirection = $filters['order_direction'] ?? 'asc';

            // If custom ordering is specified, apply it (loses search relevance)
            if ($orderBy && $orderBy !== 'relevance' && $orderBy !== 'popular' && $orderBy !== 'popularity') {
                // Prefix column name with table name to avoid ambiguity, use orderByRaw for explicit column names
                if (in_array($orderBy, ['name', 'price_ron', 'created_at', 'updated_at', 'stock_quantity'])) {
                    $query->orderByRaw("products.{$orderBy} " . strtoupper($orderDirection));
                } else {
                    $query->orderBy($orderBy, $orderDirection);
                }
                $paginatedResults = $query->paginate($perPage);
            } elseif ($orderBy === 'popular' || $orderBy === 'popularity') {
                // Sort by popularity (total quantity sold) using subquery
                $popularitySubquery = DB::table('order_products')
                    ->select('product_id', DB::raw('COALESCE(SUM(quantity), 0) as total_sold'))
                    ->groupBy('product_id');

                $query->leftJoinSub($popularitySubquery, 'popularity', function ($join) {
                    $join->on('products.id', '=', 'popularity.product_id');
                })
                    ->orderByRaw('COALESCE(popularity.total_sold, 0) ' . strtoupper($orderDirection))
                    ->orderBy('products.name', 'asc'); // Secondary sort by name for consistency
                $paginatedResults = $query->paginate($perPage);
            } else {
                // For relevance ordering, we need to get all results and sort them in PHP
                // because SQLite doesn't support FIELD() function
                // Get all matching products first
                $allProducts = $query->get();

                // Create a map of ID to position for fast lookup
                $idToPosition = array_flip($searchResultIds);

                // Sort products by their position in search results
                $sortedProducts = $allProducts->sortBy(function ($product) use ($idToPosition) {
                    return $idToPosition[$product->id] ?? PHP_INT_MAX;
                })->values();

                // Manually paginate
                $currentPage = request()->get('page', 1);
                $offset = ($currentPage - 1) * $perPage;
                $paginatedItems = $sortedProducts->slice($offset, $perPage)->all();
                $total = $sortedProducts->count();

                // Create a LengthAwarePaginator manually
                $paginatedResults = new \Illuminate\Pagination\LengthAwarePaginator(
                    $paginatedItems,
                    $total,
                    $perPage,
                    $currentPage,
                    ['path' => request()->url(), 'query' => request()->query()]
                );
            }

            // Convert LengthAwarePaginator to expected array format
            return [
                'products' => $paginatedResults->items(),
                'pagination' => [
                    'current_page' => $paginatedResults->currentPage(),
                    'last_page' => $paginatedResults->lastPage(),
                    'per_page' => $paginatedResults->perPage(),
                    'total' => $paginatedResults->total(),
                ],
            ];
        }

        // Standard query-based filtering (without search)
        $query = Product::where('status', true);

        // Filter to show only simple and configurable products (exclude variants)
        $query = $this->filterPublicProducts($query);

        $query->with(['images' => function ($query) {
            $query->orderBy('sort_order')->limit(1);
        }])
            ->with(['productGroupPrices' => function ($query) {
                $query->orderBy('min_quantity', 'asc');
            }])
            ->with(['variants' => function ($query) {
                $query->where('status', true);
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

        // Filter by attributes
        $query = $this->applyAttributeFilters($query, $filters);

        // Order by
        $orderBy = $filters['order_by'] ?? 'name';
        $orderDirection = $filters['order_direction'] ?? 'asc';

        // Handle popular sorting - sort by total quantity sold (from order_products)
        if ($orderBy === 'popular' || $orderBy === 'popularity') {
            // Use a subquery to calculate popularity (total quantity sold)
            $popularitySubquery = DB::table('order_products')
                ->select('product_id', DB::raw('COALESCE(SUM(quantity), 0) as total_sold'))
                ->groupBy('product_id');

            $query->leftJoinSub($popularitySubquery, 'popularity', function ($join) {
                $join->on('products.id', '=', 'popularity.product_id');
            })
                ->orderByRaw('COALESCE(popularity.total_sold, 0) ' . strtoupper($orderDirection))
                ->orderBy('products.name', 'asc'); // Secondary sort by name for consistency
        } else {
            // Prefix column name with table name to avoid ambiguity, use orderByRaw for explicit column names
            if (in_array($orderBy, ['name', 'price_ron', 'created_at', 'updated_at', 'stock_quantity'])) {
                $query->orderByRaw("products.{$orderBy} " . strtoupper($orderDirection));
            } else {
                $query->orderBy($orderBy, $orderDirection);
            }
        }

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

            // For configurable products, calculate minimum price from variants
            $displayProduct = $product;
            $minPriceFromVariants = null;

            if ($product->type === ProductType::CONFIGURABLE) {
                // Load variants if not already loaded
                if (!$product->relationLoaded('variants')) {
                    $product->load('variants');
                }

                $variants = $product->variants()->where('status', true)->get();

                if ($variants->isNotEmpty()) {
                    // Find minimum price among all variants
                    foreach ($variants as $variant) {
                        $variantPriceInfo = $this->priceService->getPriceInfo($variant, $currency, 1, $customerGroupId, null, $request);
                        $variantPrice = $variantPriceInfo['unit_price_ron_incl_vat'];

                        if ($minPriceFromVariants === null || $variantPrice < $minPriceFromVariants) {
                            $minPriceFromVariants = $variantPrice;
                            // Use this variant for price calculation
                            $displayProduct = $variant;
                        }
                    }
                }
            }

            // Get price for quantity 1 using centralized price service
            $priceInfo = $this->priceService->getPriceInfo($displayProduct, $currency, 1, $customerGroupId, null, $request);

            // Get quantity-based price tiers using centralized price service
            $priceTiers = $this->priceService->getPriceTiers($displayProduct, $currency, $customerGroupId, $request);

            // Variant metadata for listing cards
            $typeValue = $product->type instanceof ProductType
                ? $product->type->value
                : ($product->type ?? ProductType::SIMPLE->value);

            $isConfigurable = $typeValue === ProductType::CONFIGURABLE->value;
            $variants = collect();
            $hasVariantsInStock = null;
            $totalVariantsStock = 0;

            if ($isConfigurable) {
                // Prefer eager-loaded relation to avoid N+1
                if ($product->relationLoaded('variants')) {
                    $variants = $product->variants;
                } else {
                    $variants = $product->variants()->where('status', true)->get();
                }

                $hasVariantsInStock = $variants->contains(function ($variant) {
                    return (int) ($variant->stock_quantity ?? 0) > 0;
                });

                // Calculate total stock from all variants
                $totalVariantsStock = $variants->sum(function ($variant) {
                    return (int) ($variant->stock_quantity ?? 0);
                });
            }

            // If configurable product, use minimum price from variants
            if ($product->type === ProductType::CONFIGURABLE && $minPriceFromVariants !== null) {
                // Convert minimum price to display currency
                $minPriceDisplay = $currency->convertFromRon($minPriceFromVariants);
                $priceInfo['unit_price_display'] = $minPriceDisplay;
                // Update price tiers to use minimum price as base
                if (empty($priceTiers)) {
                    // If no tiers, create a simple tier with min price
                    $priceTiers = [[
                        'min_quantity' => 1,
                        'max_quantity' => null,
                        'quantity_range' => '1+',
                        'price_raw' => $minPriceDisplay,
                        'price_display' => $minPriceDisplay,
                    ]];
                } else {
                    // Adjust first tier price to minimum
                    if (isset($priceTiers[0])) {
                        $priceTiers[0]['price_raw'] = $minPriceDisplay;
                        $priceTiers[0]['price_display'] = $minPriceDisplay;
                    }
                }
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'type' => $typeValue,
                'has_variants' => $isConfigurable ? $variants->isNotEmpty() : false,
                'has_variants_in_stock' => $hasVariantsInStock,
                'price_raw' => $priceInfo['unit_price_display'], // Display price already calculated for customer group
                'price_ron' => $priceInfo['unit_price_ron_incl_vat'], // Price in RON including VAT for admin calculations
                'price_ron_excl_vat' => $priceInfo['unit_price_ron_excl_vat'], // Price in RON excluding VAT
                'price_tiers' => $priceTiers,
                'image' => $imageUrl,
                'image_url' => $imageUrl, // Alias for compatibility
                'main_image_url' => $imageUrl, // Alias for compatibility
                'stock_quantity' => $isConfigurable ? $totalVariantsStock : $product->stock_quantity,
                'total_variants_stock' => $isConfigurable ? $totalVariantsStock : null,
                'sku' => $product->sku,
                'ean' => $product->ean,
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

    /**
     * Get available attributes and their values for products in a category.
     * This implements the "Collector Algorithm":
     * 1. Find all active products in the category
     * 2. Collect unique family_ids from those products
     * 3. Get all attributes associated with those families
     * 4. Get actual attribute values used in those products (from variants for configurable products)
     *
     * @param array $filters Filters including category_id or category_slug
     * @return array Array of attributes with their available values
     */
    public function getAvailableAttributesForCategory(array $filters): array
    {
        // Step 1: Find all products - either in category or all products if no category filter
        $categoryIds = null;

        if (isset($filters['category_id']) && $filters['category_id']) {
            $categoryIds = $this->getCategoryIdsRecursive((int) $filters['category_id']);
        } elseif (isset($filters['category_slug']) && $filters['category_slug']) {
            $category = Category::where('slug', $filters['category_slug'])
                ->where('status', true)
                ->first();

            if ($category) {
                $categoryIds = $this->getCategoryIdsRecursive($category->id);
            }
        }

        // If no category specified, get all active products (for "all products" page)
        // Build products query
        $productsQuery = Product::where('status', true);
        $productsQuery = $this->filterPublicProducts($productsQuery);

        if ($categoryIds && !empty($categoryIds)) {
            // Filter by category
            $productsQuery->whereHas('categories', function ($q) use ($categoryIds) {
                $q->whereIn('categories.id', $categoryIds);
            });
        }

        // No category filter means show all products, so we still get attributes

        // Get products (already filtered above)
        $products = $productsQuery->get(['id', 'type', 'family_id', 'parent_id']);

        if ($products->isEmpty()) {
            return [];
        }

        // Step 2: Collect unique family_ids
        $familyIds = $products->pluck('family_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        if (empty($familyIds)) {
            return [];
        }

        // Step 3: Get all attributes associated with those families
        $attributes = Attribute::whereHas('families', function ($q) use ($familyIds) {
            $q->whereIn('product_families.id', $familyIds);
        })
            ->where('is_filterable', true)
            ->orderBy('name')
            ->get();

        if ($attributes->isEmpty()) {
            return [];
        }

        // Step 4: Get actual attribute values used in those products
        // For configurable products, we need to check their variants
        $productIds = $products->pluck('id')->toArray();

        if (empty($productIds)) {
            return [];
        }

        // Get variants of configurable products
        $variants = Product::whereIn('parent_id', $productIds)
            ->where('status', true)
            ->where(function ($q) {
                $q->where('type', ProductType::VARIANT->value)
                    ->orWhere('type', 'variant');
            })
            ->get(['id', 'parent_id']);

        $variantIds = $variants->pluck('id')->toArray();

        // Combine product IDs (for simple products) and variant IDs (for configurable products)
        $allProductIds = array_merge($productIds, $variantIds);

        if (empty($allProductIds)) {
            return [];
        }

        // Get attribute values that are actually used in these products
        $attributeIds = $attributes->pluck('id')->toArray();

        $usedAttributeValues = ProductAttributeValue::whereIn('product_id', $allProductIds)
            ->whereIn('attribute_id', $attributeIds)
            ->with(['attributeValue' => function ($q) {
                $q->orderBy('sort_order');
            }, 'attribute'])
            ->get()
            ->groupBy('attribute_id');

        // Build result array
        $result = [];

        foreach ($attributes as $attribute) {
            $attributeValues = $usedAttributeValues->get($attribute->id, collect());

            if ($attributeValues->isEmpty()) {
                continue; // Skip attributes with no values used in products
            }

            // Get unique attribute values, preserve sort_order
            $values = $attributeValues->map(function ($pav) {
                if (!$pav->attributeValue) {
                    return null;
                }
                return [
                    'id' => $pav->attributeValue->id,
                    'value' => $pav->attributeValue->value,
                    'meta_value' => $pav->attributeValue->meta_value,
                    'sort_order' => $pav->attributeValue->sort_order ?? 999,
                ];
            })
                ->filter()
                ->unique('id')
                ->values()
                ->sortBy([
                    ['sort_order', 'asc'],
                    ['value', 'asc'],
                ])
                ->map(function ($item) {
                    // Remove sort_order from final result
                    unset($item['sort_order']);
                    return $item;
                })
                ->values()
                ->toArray();

            if (empty($values)) {
                continue;
            }

            $result[] = [
                'id' => $attribute->id,
                'name' => $attribute->name,
                'code' => $attribute->code,
                'type' => $attribute->type,
                'values' => $values,
            ];
        }

        return $result;
    }
}
