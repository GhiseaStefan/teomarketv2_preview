<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Currency;
use App\Enums\ProductType;
use App\Services\ProductService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display all categories page.
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

        // Get all top-level categories with images only (no subcategories)
        $categories = Category::whereNull('parent_id')
            ->where('status', true)
            ->orderBy('name')
            ->with(['products' => function ($productQuery) {
                $productQuery->where('status', true)
                    ->where(function($q) {
                        $q->where('type', ProductType::SIMPLE->value)
                          ->orWhere('type', ProductType::CONFIGURABLE->value)
                          ->orWhereNull('type');
                    })
                    ->with(['images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }])
                    ->limit(1);
            }])
            ->get()
            ->map(function ($category) {
                $image = null;

                // First, try to use the category's own image_url
                if ($category->image_url) {
                    $image = $category->image_url;
                } else {
                    // Fallback: Get first product's first image if available
                    if ($category->products->count() > 0) {
                        $firstProduct = $category->products->first();
                        if ($firstProduct->images->count() > 0) {
                            $image = $firstProduct->images->first()->image_url;
                        } elseif ($firstProduct->main_image_url) {
                            $image = $firstProduct->main_image_url;
                        }
                    }
                }

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'image' => $image,
                ];
            });

        return Inertia::render('categories/index', [
            'categories' => $categories->toArray(),
        ]);
    }

    /**
     * Display the category page with subcategories and images.
     *
     * @param Request $request
     * @param string $slug
     * @return \Inertia\Response
     */
    public function show(Request $request, string $slug)
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

        // Find category by slug (can be parent, subcategory, or sub-subcategory)
        $category = Category::where('slug', $slug)
            ->where('status', true)
            ->with(['parent', 'children' => function ($query) {
                $query->where('status', true)
                    ->orderBy('name')
                    ->with(['products' => function ($productQuery) {
                        $productQuery->where('status', true)
                            ->where(function($q) {
                                $q->where('type', ProductType::SIMPLE->value)
                                  ->orWhere('type', ProductType::CONFIGURABLE->value)
                                  ->orWhereNull('type'); // Handle products created before migration
                            })
                            ->with(['images' => function ($imgQuery) {
                                $imgQuery->orderBy('sort_order')->limit(1);
                            }])
                            ->limit(1); // Get first product for image
                    }]);
            }])
            ->firstOrFail();

        // If category has no children, redirect to products page
        if ($category->children->count() === 0) {
            return redirect()->route('products.index', ['category_id' => $category->id]);
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

        // Format subcategories with images
        $subCategories = $category->children->map(function ($subCategory) use ($currentCurrency, $customerGroupId) {
            $image = null;

            // First, try to use the category's own image_url
            if ($subCategory->image_url) {
                $image = $subCategory->image_url;
            } else {
                // Fallback: Get first product's first image if available
                if ($subCategory->products->count() > 0) {
                    $firstProduct = $subCategory->products->first();
                    if ($firstProduct->images->count() > 0) {
                        $image = $firstProduct->images->first()->image_url;
                    } elseif ($firstProduct->main_image_url) {
                        $image = $firstProduct->main_image_url;
                    }
                }
            }

            return [
                'id' => $subCategory->id,
                'name' => $subCategory->name,
                'slug' => $subCategory->slug,
                'image' => $image,
            ];
        });

        // Get siblings (categories at the same level) for sidebar/carousel
        $parentSubCategories = collect();

        if ($category->parent) {
            // Category has a parent: get siblings (parent's children)
            $parent = Category::where('id', $category->parent->id)
                ->where('status', true)
                ->with(['children' => function ($query) {
                    $query->where('status', true)
                        ->orderBy('name')
                        ->with(['products' => function ($productQuery) {
                            $productQuery->where('status', true)
                                ->where(function($q) {
                                    $q->where('type', ProductType::SIMPLE->value)
                                      ->orWhere('type', ProductType::CONFIGURABLE->value)
                                      ->orWhereNull('type'); // Handle products created before migration
                                })
                                ->with(['images' => function ($imgQuery) {
                                    $imgQuery->orderBy('sort_order')->limit(1);
                                }])
                                ->limit(1);
                        }]);
                }])
                ->first();

            if ($parent) {
                $parentSubCategories = $parent->children->map(function ($siblingCategory) use ($category) {
                    $image = null;

                    if ($siblingCategory->image_url) {
                        $image = $siblingCategory->image_url;
                    } else {
                        if ($siblingCategory->products->count() > 0) {
                            $firstProduct = $siblingCategory->products->first();
                            if ($firstProduct->images->count() > 0) {
                                $image = $firstProduct->images->first()->image_url;
                            } elseif ($firstProduct->main_image_url) {
                                $image = $firstProduct->main_image_url;
                            }
                        }
                    }

                    return [
                        'id' => $siblingCategory->id,
                        'name' => $siblingCategory->name,
                        'slug' => $siblingCategory->slug,
                        'image' => $image,
                        'isActive' => $siblingCategory->id === $category->id,
                    ];
                });
            }
        } else {
            // Category is top-level: get all top-level categories (siblings at root level)
            $parentSubCategories = Category::whereNull('parent_id')
                ->where('status', true)
                ->orderBy('name')
                ->with(['products' => function ($productQuery) {
                    $productQuery->where('status', true)
                        ->where(function($q) {
                            $q->where('type', ProductType::SIMPLE->value)
                              ->orWhere('type', ProductType::CONFIGURABLE->value)
                              ->orWhereNull('type'); // Handle products created before migration
                        })
                        ->with(['images' => function ($imgQuery) {
                            $imgQuery->orderBy('sort_order')->limit(1);
                        }])
                        ->limit(1);
                }])
                ->get()
                ->map(function ($siblingCategory) use ($category) {
                    $image = null;

                    if ($siblingCategory->image_url) {
                        $image = $siblingCategory->image_url;
                    } else {
                        if ($siblingCategory->products->count() > 0) {
                            $firstProduct = $siblingCategory->products->first();
                            if ($firstProduct->images->count() > 0) {
                                $image = $firstProduct->images->first()->image_url;
                            } elseif ($firstProduct->main_image_url) {
                                $image = $firstProduct->main_image_url;
                            }
                        }
                    }

                    return [
                        'id' => $siblingCategory->id,
                        'name' => $siblingCategory->name,
                        'slug' => $siblingCategory->slug,
                        'image' => $image,
                        'isActive' => $siblingCategory->id === $category->id,
                    ];
                });
        }

        // Get top-level categories (parent categories) for mobile carousel
        $topLevelCategories = Category::whereNull('parent_id')
            ->where('status', true)
            ->orderBy('name')
            ->with(['products' => function ($productQuery) {
                $productQuery->where('status', true)
                    ->where(function($q) {
                        $q->where('type', ProductType::SIMPLE->value)
                          ->orWhere('type', ProductType::CONFIGURABLE->value)
                          ->orWhereNull('type'); // Handle products created before migration
                    })
                    ->with(['images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }])
                    ->limit(1);
            }])
            ->get()
            ->map(function ($topCategory) {
                $image = null;

                if ($topCategory->image_url) {
                    $image = $topCategory->image_url;
                } else {
                    if ($topCategory->products->count() > 0) {
                        $firstProduct = $topCategory->products->first();
                        if ($firstProduct->images->count() > 0) {
                            $image = $firstProduct->images->first()->image_url;
                        } elseif ($firstProduct->main_image_url) {
                            $image = $firstProduct->main_image_url;
                        }
                    }
                }

                return [
                    'id' => $topCategory->id,
                    'name' => $topCategory->name,
                    'slug' => $topCategory->slug,
                    'image' => $image,
                ];
            });

        return Inertia::render('Category/Show', [
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'subCategories' => $subCategories->toArray(),
                'breadcrumb' => $breadcrumb,
                'parentSubCategories' => $parentSubCategories->toArray(),
                'parentName' => $category->parent ? $category->parent->name : null,
                'topLevelCategories' => $topLevelCategories->toArray(),
            ],
        ]);
    }
}
