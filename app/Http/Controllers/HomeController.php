<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Currency;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function index(Request $request)
    {
        // Get current currency from session, cookie, or default to RON
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';

        // Restore currency to session if it was only in cookie
        // This ensures session and cookie stay in sync
        if (!$request->session()->has('currency') && $currentCurrencyCode !== 'RON') {
            $request->session()->put('currency', $currentCurrencyCode);
        }
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->first();

        // Fallback to RON if currency not found or not active
        if (!$currentCurrency) {
            $currentCurrency = Currency::where('code', 'RON')
                ->where('status', true)
                ->first();

            // If RON doesn't exist, get first active currency
            if (!$currentCurrency) {
                $currentCurrency = Currency::where('status', true)->first();
            }

            // Update session and cookie to match the fallback currency
            if ($currentCurrency) {
                $request->session()->put('currency', $currentCurrency->code);
            }
        }

        // If still no currency found, throw an exception
        if (!$currentCurrency) {
            abort(500, 'No active currency found in database');
        }

        // Get customer group ID from request parameter or session
        $customerGroupId = $request->get('customer_group_id');
        if ($customerGroupId === null) {
            $customerGroupId = $request->session()->get('customer_group_id', null);
        }

        // Get main categories (top level, status = true) with sub-categories and sub-subcategories
        // No limit - load all categories for desktop display
        $categories = Category::whereNull('parent_id')
            ->where('status', true)
            ->orderBy('name')
            ->with(['children' => function ($query) {
                $query->where('status', true)
                    ->orderBy('name')
                    ->with(['children' => function ($subQuery) {
                        $subQuery->where('status', true)
                            ->orderBy('name');
                    }]);
            }])
            ->get()
            ->map(function ($category) {
                $subCategories = $category->children->map(function ($subCategory) {
                    $subSubCategories = $subCategory->children->map(function ($subSubCategory) {
                        return [
                            'id' => $subSubCategory->id,
                            'name' => $subSubCategory->name,
                            'slug' => $subSubCategory->slug,
                        ];
                    });

                    return [
                        'id' => $subCategory->id,
                        'name' => $subCategory->name,
                        'slug' => $subCategory->slug,
                        'subSubCategories' => $subSubCategories,
                    ];
                });

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'subCategories' => $subCategories,
                ];
            });

        // Get products grouped by categories (2 products per category)
        $categoriesWithProducts = Category::whereHas('products')
            ->where('status', true)
            ->with(['products' => function ($query) {
                $query->where('status', true)
                    ->with(['images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }])
                    ->with(['productGroupPrices' => function ($query) {
                        $query->orderBy('min_quantity', 'asc');
                    }])
                    ->limit(2);
            }])
            ->limit(6) // Limit to 6 categories for display
            ->get();

        // Format all products at once
        $allProducts = $categoriesWithProducts->flatMap->products;
        $formattedProducts = $this->productService->formatProductsForDisplay(
            $allProducts,
            $currentCurrency,
            $customerGroupId,
            $request
        );

        // Create a lookup map for formatted products by ID
        $formattedProductsMap = collect($formattedProducts)->keyBy('id');

        // Map categories with their formatted products
        $categoriesWithProducts = $categoriesWithProducts->map(function ($category) use ($formattedProductsMap) {
            $categoryProducts = $category->products->map(function ($product) use ($formattedProductsMap) {
                $formatted = $formattedProductsMap->get($product->id);
                if (!$formatted) {
                    return null;
                }
                return [
                    'id' => $formatted['id'],
                    'name' => $formatted['name'],
                    'price_raw' => $formatted['price_raw'] ?? null,
                    'vat_included' => $formatted['vat_included'] ?? true,
                    'image' => $formatted['image'],
                    'stock_quantity' => $formatted['stock_quantity'],
                    'sku' => $formatted['sku'],
                    'short_description' => $formatted['short_description'] ?? null,
                    'price_tiers' => $formatted['price_tiers'] ?? [],
                ];
            })->filter()->values();

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'products' => $categoryProducts->toArray(),
            ];
        })
            ->filter(function ($category) {
                return count($category['products']) > 0;
            })
            ->values();

        // Get category tabs with products (subcategories or specific categories)
        // Load all categories that have products - no limit
        // Sort by product count descending so category with most products appears first
        $categoryTabs = Category::whereHas('products')
            ->where('status', true)
            ->withCount('products')
            ->orderByDesc('products_count')
            // No limit - load all categories
            ->with(['products' => function ($query) {
                $query->where('status', true)
                    ->with(['images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }])
                    ->with(['productGroupPrices' => function ($query) {
                        $query->orderBy('min_quantity', 'asc');
                    }])
                    ->limit(20); // More products for category tabs display
            }])
            ->get();

        // Format all products at once
        $allCategoryTabsProducts = $categoryTabs->flatMap->products;
        $formattedCategoryTabsProducts = $this->productService->formatProductsForDisplay(
            $allCategoryTabsProducts,
            $currentCurrency,
            $customerGroupId,
            $request
        );

        // Create a lookup map for formatted products by ID
        $formattedCategoryTabsProductsMap = collect($formattedCategoryTabsProducts)->keyBy('id');

        // Map category tabs with their formatted products
        $categoryTabs = $categoryTabs->map(function ($category, $index) use ($formattedCategoryTabsProductsMap) {
            $categoryProducts = $category->products->map(function ($product) use ($formattedCategoryTabsProductsMap) {
                $formatted = $formattedCategoryTabsProductsMap->get($product->id);
                if (!$formatted) {
                    return null;
                }
                return [
                    'id' => $formatted['id'],
                    'name' => $formatted['name'],
                    'price_raw' => $formatted['price_raw'] ?? null,
                    'vat_included' => $formatted['vat_included'] ?? true,
                    'image' => $formatted['image'],
                    'stock_quantity' => $formatted['stock_quantity'],
                    'sku' => $formatted['sku'],
                    'short_description' => $formatted['short_description'] ?? null,
                    'price_tiers' => $formatted['price_tiers'] ?? [],
                ];
            })->filter()->values();

            return [
                'id' => $category->id,
                'label' => $category->name,
                'slug' => $category->slug,
                'active' => $index === 0,
                'products' => $categoryProducts->toArray(),
            ];
        })
            ->values();

        return Inertia::render('home/index', [
            'categories' => $categories,
            'categoriesWithProducts' => $categoriesWithProducts,
            'categoryTabs' => $categoryTabs,
        ]);
    }
}
