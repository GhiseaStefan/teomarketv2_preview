<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Currency;
use App\Models\CustomerGroup;
use App\Services\ProductService;
use App\Services\ProductPriceService;
use App\Services\ReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ProductController extends Controller
{
    protected ProductService $productService;
    protected ProductPriceService $priceService;
    protected ReviewService $reviewService;

    public function __construct(ProductService $productService, ProductPriceService $priceService, ReviewService $reviewService)
    {
        $this->productService = $productService;
        $this->priceService = $priceService;
        $this->reviewService = $reviewService;
    }

    /**
     * Display the product listing page.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request)
    {
        // Get current currency from session, cookie, or default to RON
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';

        // Restore currency to session if it was only in cookie
        if (!$request->session()->has('currency') && $currentCurrencyCode !== 'RON') {
            $request->session()->put('currency', $currentCurrencyCode);
        }
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->firstOrFail();

        // Get filters from request
        $priceMinOriginal = $request->get('price_min');
        $priceMaxOriginal = $request->get('price_max');

        // Convert price filters from current currency to RON for database comparison
        $priceMinInRon = null;
        $priceMaxInRon = null;

        if ($priceMinOriginal !== null && $priceMinOriginal !== '') {
            $priceMinInRon = $currentCurrency->convertToRon((float) $priceMinOriginal);
        }

        if ($priceMaxOriginal !== null && $priceMaxOriginal !== '') {
            $priceMaxInRon = $currentCurrency->convertToRon((float) $priceMaxOriginal);
        }

        // Get attribute filters from request
        $attributeFilters = [];
        $attributesInput = $request->get('attributes', []);
        if (is_array($attributesInput)) {
            foreach ($attributesInput as $attributeId => $valueIds) {
                if (!empty($valueIds)) {
                    $attributeFilters[$attributeId] = $valueIds;
                }
            }
        }

        // Filters for database query (in RON)
        $filtersForQuery = [
            'category_id' => $request->get('category_id'),
            'category_slug' => $request->get('category_slug'),
            'search' => $request->get('search'),
            'price_min' => $priceMinInRon,
            'price_max' => $priceMaxInRon,
            'in_stock' => $request->get('in_stock'),
            'order_by' => $request->get('order_by', 'name'),
            'order_direction' => $request->get('order_direction', 'asc'),
            'attributes' => $attributeFilters,
        ];

        // Filters for display (original values in current currency)
        $filters = [
            'category_id' => $request->get('category_id'),
            'category_slug' => $request->get('category_slug'),
            'search' => $request->get('search'),
            'price_min' => $priceMinOriginal,
            'price_max' => $priceMaxOriginal,
            'in_stock' => $request->get('in_stock'),
            'order_by' => $request->get('order_by', 'name'),
            'order_direction' => $request->get('order_direction', 'asc'),
            'attributes' => $attributeFilters,
        ];

        // Get products per page
        $perPage = (int) $request->get('per_page', 12);
        $result = $this->productService->getProducts($filtersForQuery, $perPage);

        // Get customer group ID from request parameter or session
        $customerGroupId = $request->get('customer_group_id');
        if ($customerGroupId === null) {
            $customerGroupId = $request->session()->get('customer_group_id', null);
        }

        // Format products for display
        $formattedProducts = $this->productService->formatProductsForDisplay(
            collect($result['products']),
            $currentCurrency,
            $customerGroupId,
            $request
        );

        // Get category info if filtering by category
        $categoryInfo = $this->productService->getCategoryInfo($filtersForQuery);

        // Get all categories for filter dropdown
        $categories = Category::where('status', true)
            ->orderBy('name')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                ];
            });

        // Get available attributes and values for the current category (for filters)
        $availableAttributes = $this->productService->getAvailableAttributesForCategory($filtersForQuery);

        return Inertia::render('products/index', [
            'products' => $formattedProducts,
            'pagination' => $result['pagination'],
            'category' => $categoryInfo,
            'filters' => $filters,
            'categories' => $categories,
            'availableAttributes' => $availableAttributes,
        ]);
    }

    /**
     * Display the product detail page.
     *
     * @param Request $request
     * @param int $id
     * @return \Inertia\Response|\Illuminate\Http\RedirectResponse
     */
    public function show(Request $request, int $id)
    {
        // Check if product exists (without status check)
        $product = \App\Models\Product::where('id', $id)->first();
        
        // If product doesn't exist, return 404
        if (!$product) {
            abort(404);
        }
        
        // If product exists but is not active, redirect to home
        if ($product->status !== true) {
            return redirect()->route('home');
        }

        // If product is a variant, redirect to parent with variant parameter
        $isVariant = ($product->type instanceof \App\Enums\ProductType && $product->type === \App\Enums\ProductType::VARIANT) ||
            ($product->type === 'variant') ||
            ($product->parent_id !== null);

        if ($isVariant && $product->parent_id) {
            // Redirect to parent product with variant parameter
            return redirect()->route('products.show', [
                'id' => $product->parent_id,
                'variant' => $id,
            ]);
        }

        $data = $this->getProductShowData($request, $id);

        return Inertia::render('products/show', $data);
    }

    /**
     * Lightweight endpoint used for slide-over "quick view".
     * Returns the same data shape as the product show page, but as JSON.
     */
    public function quickView(Request $request, int $id)
    {
        // Check if product exists (without status check)
        $product = \App\Models\Product::where('id', $id)->first();
        
        // If product doesn't exist, return 404
        if (!$product) {
            return response()->json([
                'error' => 'Product not found',
            ], 404);
        }
        
        // If product exists but is not active, return error
        if ($product->status !== true) {
            return response()->json([
                'error' => 'Product is not available',
            ], 404);
        }
        
        return response()->json($this->getProductShowData($request, $id));
    }

    /**
     * Build the product show payload (used by Inertia and quick view).
     *
     * @return array{product: array, variants: array, availableAttributes: array, reviewStats: array, canReview: bool, hasReviewed: bool}
     */
    private function getProductShowData(Request $request, int $id): array
    {
        // Get current currency from session, cookie, or default to RON
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';

        // Restore currency to session if it was only in cookie
        if (!$request->session()->has('currency') && $currentCurrencyCode !== 'RON') {
            $request->session()->put('currency', $currentCurrencyCode);
        }
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->firstOrFail();

        // Get customer group ID from request parameter or session
        $customerGroupId = $request->get('customer_group_id');
        if ($customerGroupId === null) {
            $customerGroupId = $request->session()->get('customer_group_id', null);
        }

        // Get effective customer group ID (defaults to B2C if not provided)
        $effectiveCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);

        // Get product with all images and relationships
        // Note: Status is already checked in show() and quickView() methods
        $product = \App\Models\Product::where('id', $id)
            ->where('status', true)
            ->with(['images' => function ($query) {
                $query->orderBy('sort_order');
            }])
            ->with(['categories' => function ($query) {
                $query->where('status', true);
            }])
            ->with(['productGroupPrices' => function ($query) use ($effectiveCustomerGroupId) {
                $query->orderBy('min_quantity', 'asc');
                if ($effectiveCustomerGroupId) {
                    $query->where('customer_group_id', $effectiveCustomerGroupId);
                }
            }])
            ->with(['attributeValues.attributeValue.attribute'])
            ->firstOrFail();

        // Load variants and attributes if product is configurable
        $variants = collect([]);
        $availableAttributes = collect([]);

        // Load variants if product is configurable
        // Check type as enum or string value
        $isConfigurable = ($product->type instanceof \App\Enums\ProductType && $product->type === \App\Enums\ProductType::CONFIGURABLE) ||
            ($product->type === 'configurable');

        if ($isConfigurable) {
            // Load variants with their attributes
            $variants = \App\Models\Product::where('parent_id', $product->id)
                ->where(function ($q) {
                    // Check both enum value and string
                    $q->where('type', \App\Enums\ProductType::VARIANT->value)
                        ->orWhere('type', 'variant');
                })
                ->where('status', true)
                ->with(['images' => function ($query) {
                    $query->orderBy('sort_order');
                }])
                ->with(['attributeValues.attributeValue.attribute'])
                ->with(['productGroupPrices' => function ($query) use ($effectiveCustomerGroupId) {
                    $query->orderBy('min_quantity', 'asc');
                    if ($effectiveCustomerGroupId) {
                        $query->where('customer_group_id', $effectiveCustomerGroupId);
                    }
                }])
                ->get();

            // Get unique attributes used in variants
            if ($variants->isNotEmpty()) {
                $attributeIds = \App\Models\ProductAttributeValue::whereIn('product_id', $variants->pluck('id'))
                    ->distinct()
                    ->pluck('attribute_id')
                    ->unique();

                $availableAttributes = \App\Models\Attribute::whereIn('id', $attributeIds)
                    ->with(['values' => function ($q) use ($variants) {
                        // Only include values that are actually used in variants
                        $q->whereHas('productAttributeValues', function ($pq) use ($variants) {
                            $pq->whereIn('product_id', $variants->pluck('id'));
                        })->orderBy('sort_order');
                    }])
                    ->orderBy('name')
                    ->get()
                    ->map(function ($attr) {
                        return [
                            'id' => $attr->id,
                            'name' => $attr->name,
                            'code' => $attr->code,
                            'type' => $attr->type,
                            'is_filterable' => $attr->is_filterable,
                            'values' => $attr->values->map(function ($val) {
                                return [
                                    'id' => $val->id,
                                    'value' => $val->value,
                                    'meta_value' => $val->meta_value,
                                ];
                            }),
                        ];
                    });
            }
        }

        // Format product for display
        $formattedProducts = $this->productService->formatProductsForDisplay(
            collect([$product]),
            $currentCurrency,
            $customerGroupId,
            $request
        );

        $formattedProduct = $formattedProducts[0];

        // Format variants for display if product is configurable
        $formattedVariants = [];

        if ($variants->isNotEmpty()) {
            $formattedVariantsData = $this->productService->formatProductsForDisplay(
                $variants,
                $currentCurrency,
                $customerGroupId,
                $request
            );

            // Add attribute information to each variant
            $formattedVariants = collect($formattedVariantsData)->map(function ($variantData, $index) use ($variants) {
                $variantModel = $variants[$index];
                $variantAttributes = $variantModel->attributeValues->map(function ($pav) {
                    return [
                        'attribute_id' => $pav->attribute_id,
                        'attribute_code' => $pav->attribute->code,
                        'attribute_name' => $pav->attribute->name,
                        'value_id' => $pav->attribute_value_id,
                        'value' => $pav->attributeValue->value,
                        'meta_value' => $pav->attributeValue->meta_value,
                    ];
                })->toArray();

                // Add variant images
                $variantImages = $variantModel->images->map(function ($image) {
                    return [
                        'id' => $image->id,
                        'url' => $image->image_url,
                        'sort_order' => $image->sort_order,
                    ];
                })->toArray();

                // Include main_image_url if it exists
                if ($variantModel->main_image_url) {
                    $mainImageExists = collect($variantImages)->some(function ($img) use ($variantModel) {
                        return $img['url'] === $variantModel->main_image_url;
                    });

                    if (!$mainImageExists) {
                        array_unshift($variantImages, [
                            'id' => 0,
                            'url' => $variantModel->main_image_url,
                            'sort_order' => -1,
                        ]);
                    }
                }

                return array_merge($variantData, [
                    'attributes' => $variantAttributes,
                    'images' => $variantImages,
                    'model' => $variantModel->model,
                    'weight' => $variantModel->weight,
                    'length' => $variantModel->length,
                    'width' => $variantModel->width,
                    'height' => $variantModel->height,
                ]);
            })->toArray();
        }

        // Get all product images from relationship
        $images = $product->images->map(function ($image) {
            return [
                'id' => $image->id,
                'url' => $image->image_url,
                'sort_order' => $image->sort_order,
            ];
        })->toArray();

        // Always include main_image_url as the first image if it exists
        // Check if main_image_url is already in the images array to avoid duplicates
        if ($product->main_image_url) {
            $mainImageExists = false;
            foreach ($images as $image) {
                if ($image['url'] === $product->main_image_url) {
                    $mainImageExists = true;
                    break;
                }
            }

            // If main_image_url is not already in images, add it as the first image
            if (!$mainImageExists) {
                array_unshift($images, [
                    'id' => 0,
                    'url' => $product->main_image_url,
                    'sort_order' => -1, // Use -1 to ensure it's first
                ]);
            }
        }

        // If no images at all and no main_image_url, create empty array
        if (empty($images)) {
            $images = [];
        }

        // Get categories with breadcrumb - build breadcrumb path recursively
        $categories = $product->categories->map(function ($category) {
            // Build breadcrumb path for this category - traverse all parents
            $breadcrumb = [];
            $current = $category;

            // Traverse up the parent chain - load parents if needed
            while ($current) {
                array_unshift($breadcrumb, [
                    'name' => $current->name,
                    'slug' => $current->slug,
                ]);

                // Load parent if not already loaded
                if ($current->parent_id) {
                    if (!$current->relationLoaded('parent')) {
                        $current = \App\Models\Category::where('id', $current->parent_id)
                            ->where('status', true)
                            ->first();
                    } else {
                        $current = $current->parent;
                    }
                } else {
                    $current = null;
                }
            }

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'breadcrumb' => $breadcrumb,
                'depth' => count($breadcrumb), // Depth is the number of levels
            ];
        })->toArray();

        // Sort categories by depth (deepest first) to get the most specific category
        usort($categories, function ($a, $b) {
            return $b['depth'] <=> $a['depth'];
        });

        // Get review statistics
        $reviewStats = $this->reviewService->getProductReviewStats($product);

        // Check if user can review this product (hasn't reviewed yet and optionally has purchased)
        $canReview = false;
        $hasReviewed = false;
        if ($request->user() && $request->user()->customer) {
            $hasReviewed = \App\Models\Review::where('customer_id', $request->user()->customer->id)
                ->where('product_id', $product->id)
                ->exists();
            $canReview = !$hasReviewed;
        }

        // Ensure variants and attributes are properly formatted as arrays
        $variantsArray = is_array($formattedVariants) ? $formattedVariants : [];
        $attributesArray = $availableAttributes instanceof \Illuminate\Support\Collection
            ? $availableAttributes->toArray()
            : (is_array($availableAttributes) ? $availableAttributes : []);

        // Check if variant parameter is provided in URL
        $variantIdFromUrl = $request->get('variant');
        $preselectedAttributes = [];
        $productAttributes = [];
        
        if ($variantIdFromUrl && $isConfigurable && $variants->isNotEmpty()) {
            $preselectedVariantModel = $variants->first(function ($variant) use ($variantIdFromUrl) {
                return $variant->id == (int) $variantIdFromUrl;
            });
            
            if ($preselectedVariantModel) {
                if (!$preselectedVariantModel->relationLoaded('attributeValues')) {
                    $preselectedVariantModel->load('attributeValues.attributeValue.attribute');
                }
                
                foreach ($preselectedVariantModel->attributeValues as $pav) {
                    if (!$pav->relationLoaded('attribute')) {
                        $pav->load('attribute');
                    }
                }
                
                foreach ($preselectedVariantModel->attributeValues as $pav) {
                    if ($pav->relationLoaded('attribute') && $pav->attribute) {
                        $attributeCode = $pav->attribute->code ?? null;
                        if ($attributeCode) {
                            $preselectedAttributes[$attributeCode] = $pav->attribute_value_id;
                        }
                    }
                }
                
                // Use variant attributes for display
                $productAttributes = $preselectedVariantModel->attributeValues->map(function ($pav) {
                    return [
                        'attribute_id' => $pav->attribute_id,
                        'attribute_code' => $pav->attribute->code ?? '',
                        'attribute_name' => $pav->attribute->name ?? '',
                        'value_id' => $pav->attribute_value_id,
                        'value' => $pav->attributeValue->value ?? '',
                        'meta_value' => $pav->attributeValue->meta_value ?? null,
                    ];
                })->toArray();
            }
        } else {
            // Use product's own attributes (for simple products or variants without URL variant param)
            $productAttributes = $product->attributeValues->map(function ($pav) {
                return [
                    'attribute_id' => $pav->attribute_id,
                    'attribute_code' => $pav->attribute->code ?? '',
                    'attribute_name' => $pav->attribute->name ?? '',
                    'value_id' => $pav->attribute_value_id,
                    'value' => $pav->attributeValue->value ?? '',
                    'meta_value' => $pav->attributeValue->meta_value ?? null,
                ];
            })->toArray();
        }

        return [
            'product' => array_merge($formattedProduct, [
                'type' => $product->type instanceof \App\Enums\ProductType ? $product->type->value : ($product->type ?? 'simple'),
                'description' => $product->description,
                'images' => $images,
                'categories' => $categories,
                'stock_quantity' => $product->stock_quantity,
                'sku' => $product->sku,
                'ean' => $product->ean,
                'model' => $product->model,
                'weight' => $product->weight,
                'length' => $product->length,
                'width' => $product->width,
                'height' => $product->height,
                'attributes' => $productAttributes,
            ]),
            'variants' => $variantsArray,
            'availableAttributes' => $attributesArray,
            'preselectedAttributes' => $preselectedAttributes,
            'reviewStats' => $reviewStats,
            'canReview' => $canReview,
            'hasReviewed' => $hasReviewed,
        ];
    }

    /**
     * Get autocomplete search results (for navbar search dropdown).
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function autocomplete(Request $request)
    {
        try {
            $searchQuery = $request->get('q', '');

            if (empty(trim($searchQuery))) {
                return response()->json(['products' => [], 'total' => 0]);
            }

            // Get current currency from session, cookie, or default to RON
            $currentCurrencyCode = $request->session()->get('currency')
                ?? $request->cookie('currency')
                ?? 'RON';

            $currentCurrency = Currency::where('code', $currentCurrencyCode)
                ->where('status', true)
                ->firstOrFail();

            // Get customer group ID from request parameter (for admin) or session
            $customerGroupId = $request->get('customer_group_id');
            if ($customerGroupId === null) {
                $customerGroupId = $request->session()->get('customer_group_id', null);
            }

            // Get products for autocomplete
            // For configurable products, we want to return their variants instead
            $filtersForQuery = [
                'search' => $searchQuery,
            ];

            $result = $this->productService->getProducts($filtersForQuery, 100); // Get more to account for variants expansion

            $products = collect($result['products']);
            $finalProducts = collect([]);

            // Process products: replace configurable products with their variants
            foreach ($products as $product) {
                $type = $product->type instanceof \App\Enums\ProductType
                    ? $product->type->value
                    : ($product->type ?? 'simple');

                if ($type === 'configurable') {
                    // Get variants for this configurable product
                    $variants = \App\Models\Product::where('parent_id', $product->id)
                        ->where('type', \App\Enums\ProductType::VARIANT->value)
                        ->where('status', true)
                        ->with(['images' => function ($query) {
                            $query->orderBy('sort_order')->limit(1);
                        }])
                        ->with(['productGroupPrices' => function ($query) {
                            $query->orderBy('min_quantity', 'asc');
                        }])
                        ->get();

                    // Add each variant to the final products list
                    foreach ($variants as $variant) {
                        $finalProducts->push($variant);
                    }
                } else {
                    // Simple products: add directly
                    $finalProducts->push($product);
                }
            }

            // Sort results by relevance (how close the product name is to the search query)
            $searchQueryLower = mb_strtolower($searchQuery);
            $finalProducts = $finalProducts->map(function ($product) use ($searchQueryLower) {
                $productName = mb_strtolower($product->name ?? '');
                
                // Calculate relevance score
                $relevanceScore = 0;
                
                // Exact match gets highest score
                if ($productName === $searchQueryLower) {
                    $relevanceScore = 1000;
                }
                // Starts with search query gets high score
                elseif (mb_strpos($productName, $searchQueryLower) === 0) {
                    $relevanceScore = 500 + (100 - mb_strlen($productName));
                }
                // Contains search query
                elseif (mb_strpos($productName, $searchQueryLower) !== false) {
                    $position = mb_strpos($productName, $searchQueryLower);
                    $relevanceScore = 300 - $position; // Earlier position = higher score
                }
                // Calculate similarity using similar_text
                else {
                    similar_text($productName, $searchQueryLower, $percent);
                    $relevanceScore = $percent;
                }
                
                // Also check SKU and EAN for exact matches
                $sku = mb_strtolower($product->sku ?? '');
                $ean = mb_strtolower($product->ean ?? '');
                
                if ($sku === $searchQueryLower || $ean === $searchQueryLower) {
                    $relevanceScore = 2000; // SKU/EAN exact match gets highest priority
                } elseif (mb_strpos($sku, $searchQueryLower) === 0 || mb_strpos($ean, $searchQueryLower) === 0) {
                    $relevanceScore = max($relevanceScore, 1500);
                }
                
                return [
                    'product' => $product,
                    'relevance' => $relevanceScore,
                ];
            })->sortByDesc('relevance')->pluck('product');

            // Format products for display
            $formattedProducts = $this->productService->formatProductsForDisplay(
                $finalProducts,
                $currentCurrency,
                $customerGroupId,
                $request
            );

            return response()->json([
                'products' => $formattedProducts,
                'total' => $finalProducts->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Autocomplete error: ' . $e->getMessage(), [
                'query' => $request->get('q'),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'products' => [],
                'total' => 0,
                'error' => 'An error occurred while searching',
            ], 500);
        }
    }

    /**
     * Get product price for a specific quantity and customer group.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPrice(Request $request, int $id)
    {
        try {
            $quantity = (int) $request->get('quantity', 1);
            $customerGroupId = $request->get('customer_group_id');

            if ($quantity < 1) {
                $quantity = 1;
            }

            // Get current currency from session, cookie, or default to RON
            $currentCurrencyCode = $request->session()->get('currency')
                ?? $request->cookie('currency')
                ?? 'RON';

            $currentCurrency = Currency::where('code', $currentCurrencyCode)
                ->where('status', true)
                ->firstOrFail();

            // Get customer group ID from request or session
            if ($customerGroupId === null) {
                $customerGroupId = $request->session()->get('customer_group_id', null);
            }

            // Get product (without status check first)
            $product = \App\Models\Product::where('id', $id)->first();
            
            // If product doesn't exist, return 404
            if (!$product) {
                return response()->json([
                    'error' => 'Product not found',
                ], 404);
            }
            
            // If product exists but is not active, return error
            if ($product->status !== true) {
                return response()->json([
                    'error' => 'Product is not available',
                ], 404);
            }

            // Get price info for the specified quantity
            $priceInfo = $this->priceService->getPriceInfo(
                $product,
                $currentCurrency,
                $quantity,
                $customerGroupId,
                null,
                $request
            );

            return response()->json([
                'price_ron' => $priceInfo['unit_price_ron_incl_vat'],
                'price_ron_excl_vat' => $priceInfo['unit_price_ron_excl_vat'],
                'total_price_ron' => $priceInfo['total_price_ron_incl_vat'],
                'price_display' => $priceInfo['unit_price_display'],
                'vat_rate' => $priceInfo['vat_rate'],
                'quantity' => $quantity,
            ]);
        } catch (\Exception $e) {
            Log::error('Get price error: ' . $e->getMessage(), [
                'product_id' => $id,
                'quantity' => $request->get('quantity'),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'An error occurred while calculating price',
            ], 500);
        }
    }
}
