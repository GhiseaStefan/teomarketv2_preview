<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Currency;
use App\Models\CustomerGroup;
use App\Services\ProductService;
use App\Services\ProductPriceService;
use App\Services\ReviewService;
use Illuminate\Http\Request;
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
        ];

        // Get products - 5 per row, so use multiples of 5
        $perPage = (int) $request->get('per_page', 25);
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

        return Inertia::render('products/index', [
            'products' => $formattedProducts,
            'pagination' => $result['pagination'],
            'category' => $categoryInfo,
            'filters' => $filters,
            'categories' => $categories,
        ]);
    }

    /**
     * Display the product detail page.
     *
     * @param Request $request
     * @param int $id
     * @return \Inertia\Response
     */
    public function show(Request $request, int $id)
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
            ->firstOrFail();

        // Format product for display
        $formattedProducts = $this->productService->formatProductsForDisplay(
            collect([$product]),
            $currentCurrency,
            $customerGroupId,
            $request
        );

        $formattedProduct = $formattedProducts[0];

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

        // Helper function to calculate category depth
        $calculateDepth = function ($category) use (&$calculateDepth) {
            $depth = 0;
            $current = $category;
            while ($current && $current->parent_id) {
                if ($current->relationLoaded('parent') && $current->parent) {
                    $current = $current->parent;
                } else {
                    $current = \App\Models\Category::where('id', $current->parent_id)
                        ->where('status', true)
                        ->first();
                }
                $depth++;
            }
            return $depth;
        };

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

        return Inertia::render('products/show', [
            'product' => array_merge($formattedProduct, [
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
            ]),
            'reviewStats' => $reviewStats,
            'canReview' => $canReview,
            'hasReviewed' => $hasReviewed,
        ]);
    }
}
