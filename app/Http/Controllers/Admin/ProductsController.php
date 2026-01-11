<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductGroupPrice;
use App\Models\ProductFamily;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CustomerGroup;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\ProductAttributeValue;
use App\Services\ProductService;
use App\Enums\ProductType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductsController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display a listing of products.
     */
    public function index(Request $request): Response
    {
        $filter = $request->get('filter', 'all');
        $search = $request->get('search', '');
        $brandId = $request->get('brand_id');
        $categoryId = $request->get('category_id');
        $familyId = $request->get('family_id');
        $priceMin = $request->get('price_min');
        $priceMax = $request->get('price_max');
        $stockMin = $request->get('stock_min');
        $stockMax = $request->get('stock_max');
        $productType = $request->get('product_type');

        // Initialize variables
        $productsPaginated = null;

        // If search is provided, use ProductService with TNTSearch
        if ($search && !empty(trim($search))) {
            $filters = [
                'search' => trim($search),
            ];

            // Apply status filter based on active/inactive filter
            if ($filter === 'active') {
                $filters['status'] = true;
            } elseif ($filter === 'inactive') {
                $filters['status'] = false;
            }
            // For 'all' and 'out_of_stock', we'll filter after

            // Apply brand filter
            if ($brandId) {
                $filters['brand_id'] = $brandId;
            }

            // Apply category filter
            if ($categoryId) {
                $filters['category_id'] = $categoryId;
            }

            // Apply family filter
            if ($familyId) {
                $filters['family_id'] = $familyId;
            }

            // Apply product type filter
            if ($productType) {
                $filters['product_type'] = $productType;
            }

            // Apply price range filter
            if ($priceMin !== null && $priceMin !== '') {
                $filters['price_min'] = $priceMin;
            }
            if ($priceMax !== null && $priceMax !== '') {
                $filters['price_max'] = $priceMax;
            }

            // Apply stock range filter
            if ($stockMin !== null && $stockMin !== '') {
                $filters['stock_min'] = $stockMin;
            }
            if ($stockMax !== null && $stockMax !== '') {
                $filters['stock_max'] = $stockMax;
            }

            // Get products using TNTSearch
            $perPage = 50;
            $result = $this->getProductsWithSearch($filters, $filter, $perPage);
            $products = $result['products'];
            $pagination = $result['pagination'];
            $productsPaginated = null; // No paginated result for search
        } else {
            // No search - use regular query
            $query = Product::select('products.*')
                ->with(['brand', 'categories', 'images' => function ($query) {
                    $query->orderBy('sort_order')->limit(1);
                }])
                ->withCount('variants')
                ->where(function ($q) {
                    $q->where('products.type', '!=', ProductType::VARIANT->value)
                        ->orWhereNull('products.type');
                })
                ->orderBy('products.created_at', 'desc');

            // Apply filters
            switch ($filter) {
                case 'active':
                    $query->where('products.status', true);
                    break;
                case 'inactive':
                    $query->where('products.status', false);
                    break;
                case 'out_of_stock':
                    // For configurable products, check if at least one variant has stock <= 0
                    // For simple products, check stock_quantity directly
                    $query->where(function ($q) {
                        $q->where(function ($sq) {
                            // Simple products: use stock_quantity directly
                            $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                                ->where('products.stock_quantity', '<=', 0);
                        })
                        // Configurable products: check if at least one variant has stock <= 0
                        ->orWhere(function ($sq) {
                            $sq->where('products.type', ProductType::CONFIGURABLE->value)
                                ->whereHas('variants', function ($vq) {
                                    $vq->where('status', true)
                                        ->where('stock_quantity', '<=', 0);
                                });
                        });
                    });
                    break;
                case 'all':
                default:
                    // All products (no filter)
                    break;
            }

            // Apply brand filter
            if ($brandId) {
                $query->where('products.brand_id', $brandId);
            }

            // Apply category filter
            if ($categoryId) {
                $query->whereHas('categories', function ($q) use ($categoryId) {
                    $q->where('categories.id', $categoryId);
                });
            }

            // Apply family filter
            if ($familyId) {
                $query->where('products.family_id', $familyId);
            }

            // Apply product type filter
            if ($productType) {
                $query->where('products.type', $productType);
            }

            // Apply price range filter
            // For configurable products, check if at least one variant matches the price filter
            // For simple products, use price_ron directly
            if ($priceMin !== null && $priceMin !== '' || $priceMax !== null && $priceMax !== '') {
                if ($priceMin !== null && $priceMin !== '') {
                    $priceMinValue = (float) $priceMin;
                    $query->where(function ($q) use ($priceMinValue) {
                        // Simple products: use price_ron directly
                        $q->where(function ($sq) use ($priceMinValue) {
                            $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                                ->where('products.price_ron', '>=', $priceMinValue);
                        })
                        // Configurable products: check if at least one variant has price >= priceMin
                        ->orWhere(function ($sq) use ($priceMinValue) {
                            $sq->where('products.type', ProductType::CONFIGURABLE->value)
                                ->whereHas('variants', function ($vq) use ($priceMinValue) {
                                    $vq->where('status', true)
                                        ->where('price_ron', '>=', $priceMinValue);
                                });
                        });
                    });
                }

                if ($priceMax !== null && $priceMax !== '') {
                    $priceMaxValue = (float) $priceMax;
                    $query->where(function ($q) use ($priceMaxValue) {
                        // Simple products: use price_ron directly
                        $q->where(function ($sq) use ($priceMaxValue) {
                            $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                                ->where('products.price_ron', '<=', $priceMaxValue);
                        })
                        // Configurable products: check if at least one variant has price <= priceMax
                        ->orWhere(function ($sq) use ($priceMaxValue) {
                            $sq->where('products.type', ProductType::CONFIGURABLE->value)
                                ->whereHas('variants', function ($vq) use ($priceMaxValue) {
                                    $vq->where('status', true)
                                        ->where('price_ron', '<=', $priceMaxValue);
                                });
                        });
                    });
                }
            }

            // Apply stock range filter
            // For configurable products, check if at least one variant matches the stock filter
            // For simple products, use stock_quantity directly
            if ($stockMin !== null && $stockMin !== '' || $stockMax !== null && $stockMax !== '') {
                if ($stockMin !== null && $stockMin !== '') {
                    $stockMinValue = (int) $stockMin;
                    $query->where(function ($q) use ($stockMinValue) {
                        // Simple products: use stock_quantity directly
                        $q->where(function ($sq) use ($stockMinValue) {
                            $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                                ->where('products.stock_quantity', '>=', $stockMinValue);
                        })
                        // Configurable products: check if at least one variant has stock >= stockMin
                        ->orWhere(function ($sq) use ($stockMinValue) {
                            $sq->where('products.type', ProductType::CONFIGURABLE->value)
                                ->whereHas('variants', function ($vq) use ($stockMinValue) {
                                    $vq->where('status', true)
                                        ->where('stock_quantity', '>=', $stockMinValue);
                                });
                        });
                    });
                }

                if ($stockMax !== null && $stockMax !== '') {
                    $stockMaxValue = (int) $stockMax;
                    $query->where(function ($q) use ($stockMaxValue) {
                        // Simple products: use stock_quantity directly
                        $q->where(function ($sq) use ($stockMaxValue) {
                            $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                                ->where('products.stock_quantity', '<=', $stockMaxValue);
                        })
                        // Configurable products: check if at least one variant has stock <= stockMax
                        ->orWhere(function ($sq) use ($stockMaxValue) {
                            $sq->where('products.type', ProductType::CONFIGURABLE->value)
                                ->whereHas('variants', function ($vq) use ($stockMaxValue) {
                                    $vq->where('status', true)
                                        ->where('stock_quantity', '<=', $stockMaxValue);
                                });
                        });
                    });
                }
            }

            $filterParams = array_filter([
                'filter' => $filter,
                'search' => $search,
                'brand_id' => $brandId,
                'category_id' => $categoryId,
                'family_id' => $familyId,
                'product_type' => $productType,
                'price_min' => $priceMin,
                'price_max' => $priceMax,
                'stock_min' => $stockMin,
                'stock_max' => $stockMax,
            ], function ($value) {
                return $value !== null && $value !== '';
            });

            $productsPaginated = $query->paginate(50)->appends($filterParams);
            $products = $productsPaginated->getCollection();
            $pagination = null; // Will use paginated result directly
        }

        // Get all parent category IDs to identify leaf categories
        $allParentIds = Category::where('status', true)
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        // Format products for frontend
        $productsCollection = is_object($products) && method_exists($products, 'getCollection')
            ? $products->getCollection()
            : collect($products);

        // Load variants for all configurable products in one query to avoid N+1
        $configurableProductIds = $productsCollection->filter(function ($product) {
            $type = $product->type instanceof \App\Enums\ProductType
                ? $product->type->value
                : ($product->type ?? 'simple');
            return $type === 'configurable';
        })->pluck('id');

        if ($configurableProductIds->isNotEmpty()) {
            Product::whereIn('id', $configurableProductIds)
                ->with('variants')
                ->get()
                ->each(function ($loadedProduct) use ($productsCollection) {
                    $product = $productsCollection->firstWhere('id', $loadedProduct->id);
                    if ($product) {
                        $product->setRelation('variants', $loadedProduct->variants);
                    }
                });
        }

        $formattedProducts = $productsCollection->map(function ($product) use ($allParentIds) {
            $imageUrl = null;
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images->first() && $product->images->first()->image_url) {
                $imageUrl = $product->images->first()->image_url;
            }

            // Get leaf category (category that is not a parent of another category)
            $categoryName = 'N/A';
            $productCategories = $product->categories;
            if ($productCategories->isNotEmpty()) {
                // Find first leaf category (category that is not in parent IDs list)
                $leafCategory = $productCategories->first(function ($category) use ($allParentIds) {
                    return !in_array($category->id, $allParentIds);
                });
                // If no leaf category found, use the first category
                $categoryName = $leafCategory ? $leafCategory->name : $productCategories->first()->name;
            }

            // Get product type and variants count
            $type = $product->type instanceof \App\Enums\ProductType
                ? $product->type->value
                : ($product->type ?? 'simple');

            $variantsCount = 0;
            $priceRon = $product->price_ron ?? 0;
            $stockQuantity = $product->stock_quantity ?? 0;
            $hasLowStockVariants = false;

            if ($type === 'configurable') {
                // Use withCount if available, otherwise count directly
                $variantsCount = isset($product->variants_count)
                    ? $product->variants_count
                    : $product->variants()->count();

                // Calculate min price and total stock from variants
                $variants = $product->variants ?? collect([]);
                $hasLowStockVariants = false;
                if ($variants->isNotEmpty()) {
                    // Get minimum price from all variants
                    $minPrice = $variants->min('price_ron');
                    if ($minPrice !== null) {
                        $priceRon = $minPrice;
                    }

                    // Calculate total stock (sum of all variant stocks)
                    $totalStock = $variants->sum('stock_quantity');
                    $stockQuantity = $totalStock;

                    // Check if any variant has stock <= 0
                    $hasLowStockVariants = $variants->contains(function ($variant) {
                        return ($variant->stock_quantity ?? 0) <= 0;
                    });
                }
            }

            return [
                'id' => $product->id,
                'sku' => $product->sku,
                'ean' => $product->ean,
                'name' => $product->name,
                'model' => $product->model,
                'brand_name' => $product->brand?->name ?? 'N/A',
                'category_name' => $categoryName,
                'price_ron' => number_format($priceRon, 2, '.', ''),
                'stock_quantity' => $stockQuantity,
                'status' => $product->status,
                'image_url' => $imageUrl,
                'type' => $type,
                'variants_count' => $variantsCount,
                'has_low_stock_variants' => $hasLowStockVariants ?? false,
                'created_at' => $product->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $product->created_at->format('d.m.Y H:i'),
            ];
        });

        // Get all brands for filter dropdown
        $brands = Brand::orderBy('name')
            ->get()
            ->map(function ($brand) {
                return [
                    'id' => $brand->id,
                    'name' => $brand->name,
                ];
            });

        // Get all categories for filter dropdown (leaf categories only)
        $allCategoryIds = Category::where('status', true)->pluck('id')->toArray();
        $parentCategoryIds = Category::where('status', true)
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        $leafCategoryIds = array_diff($allCategoryIds, $parentCategoryIds);

        $categories = Category::where('status', true)
            ->whereIn('id', $leafCategoryIds)
            ->orderBy('name')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                ];
            });

        // Get all product families for filter dropdown
        $productFamilies = ProductFamily::where('status', true)
            ->orderBy('name')
            ->get()
            ->map(function ($family) {
                return [
                    'id' => $family->id,
                    'name' => $family->name,
                ];
            });

        // Use pagination from search result if available, otherwise from regular query
        $paginationData = $pagination ?? [
            'current_page' => $productsPaginated->currentPage(),
            'last_page' => $productsPaginated->lastPage(),
            'per_page' => $productsPaginated->perPage(),
            'total' => $productsPaginated->total(),
        ];

        return Inertia::render('admin/products', [
            'products' => $formattedProducts->values(),
            'pagination' => $paginationData,
            'filters' => [
                'filter' => $filter,
                'search' => $search,
                'brand_id' => $brandId,
                'category_id' => $categoryId,
                'family_id' => $familyId,
                'product_type' => $productType,
                'price_min' => $priceMin,
                'price_max' => $priceMax,
                'stock_min' => $stockMin,
                'stock_max' => $stockMax,
            ],
            'brands' => $brands,
            'categories' => $categories,
            'productFamilies' => $productFamilies,
        ]);
    }

    /**
     * Display the specified product for editing.
     */
    public function show(Request $request, int $id): Response
    {
        $product = Product::with([
            'brand',
            'family',
            'images' => function ($query) {
                $query->orderBy('sort_order');
            },
            'categories',
            'productGroupPrices.customerGroup',
            'variants.attributeValues.attributeValue.attribute',
            'attributeValues.attributeValue.attribute',
            'parent' => function ($query) {
                $query->select('id', 'name', 'type');
            }
        ])->findOrFail($id);

        // Get only leaf categories (categories without children) for dropdown
        $allCategoryIds = Category::where('status', true)->pluck('id')->toArray();
        $parentCategoryIds = Category::where('status', true)
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        $leafCategoryIds = array_diff($allCategoryIds, $parentCategoryIds);

        $categories = Category::where('status', true)
            ->whereIn('id', $leafCategoryIds)
            ->orderBy('name')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                ];
            });

        // Get all brands for dropdown
        $brands = Brand::orderBy('name')
            ->get()
            ->map(function ($brand) {
                return [
                    'id' => $brand->id,
                    'name' => $brand->name,
                ];
            });

        // Get all customer groups for dropdown
        $customerGroups = CustomerGroup::orderBy('name')
            ->get()
            ->map(function ($group) {
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'code' => $group->code,
                ];
            });

        // Get all product families for dropdown
        $productFamilies = \App\Models\ProductFamily::where('status', true)
            ->orderBy('name')
            ->get()
            ->map(function ($family) {
                return [
                    'id' => $family->id,
                    'name' => $family->name,
                    'code' => $family->code,
                ];
            });

        // Get attributes - filter by product family
        // IMPORTANT: Only show attributes if product has a family set
        // Check if a temporary family_id is passed in request (for preview before save)
        $familyIdToUse = $request->get('family_id') ?? $product->family_id;
        
        if ($familyIdToUse) {
            // Get attributes that belong to the product's family (or preview family)
            // Order by sort_order from pivot table, then by name as fallback
            $family = ProductFamily::find($familyIdToUse);
            if ($family) {
                $attributes = $family->attributes()
                    ->with('values')
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
                            })->toArray(),
                        ];
                    })
                    ->toArray();
            } else {
                $attributes = [];
            }
        } else {
            // If product has no family set, return empty attributes array
            // User must select a family first before being able to assign attributes
            $attributes = [];
        }

        // Get variants if product is configurable
        $variants = [];
        $productType = $product->type instanceof ProductType
            ? $product->type
            : ProductType::from($product->type ?? 'simple');

        if ($productType === ProductType::CONFIGURABLE) {
            $variants = $product->variants()
                ->with(['attributeValues.attributeValue.attribute', 'images' => function ($query) {
                    $query->orderBy('sort_order')->limit(1);
                }])
                ->get()
                ->map(function ($variant) {
                    $imageUrl = null;
                    if ($variant->main_image_url) {
                        $imageUrl = $variant->main_image_url;
                    } elseif ($variant->images->first() && $variant->images->first()->image_url) {
                        $imageUrl = $variant->images->first()->image_url;
                    }

                    return [
                        'id' => $variant->id,
                        'name' => $variant->name,
                        'sku' => $variant->sku,
                        'price_ron' => $variant->price_ron ? number_format($variant->price_ron, 2, '.', '') : '',
                        'stock_quantity' => $variant->stock_quantity ?? 0,
                        'status' => $variant->status,
                        'image_url' => $imageUrl,
                        'attributes' => $variant->attributeValues->map(function ($pav) {
                            return [
                                'attribute_id' => $pav->attribute_id,
                                'attribute_value_id' => $pav->attribute_value_id,
                            ];
                        })->toArray(),
                    ];
                })->toArray();
        }

        // Get parent products for variant selection (only for simple products)
        $parentProducts = [];
        if ($productType === ProductType::SIMPLE) {
            $parentProducts = Product::where('type', ProductType::CONFIGURABLE->value)
                ->where('id', '!=', $product->id)
                ->orderBy('name')
                ->get()
                ->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                    ];
                })->toArray();
        }

        // Format product group prices
        $groupPrices = $product->productGroupPrices->map(function ($groupPrice) {
            return [
                'id' => $groupPrice->id,
                'customer_group_id' => $groupPrice->customer_group_id,
                'customer_group_name' => $groupPrice->customerGroup?->name ?? 'N/A',
                'customer_group_code' => $groupPrice->customerGroup?->code ?? '',
                'min_quantity' => $groupPrice->min_quantity,
                'price_ron' => $groupPrice->price_ron ? number_format($groupPrice->price_ron, 2, '.', '') : '',
            ];
        })->toArray();

        // Format product images
        $images = $product->images->map(function ($image) {
            return [
                'id' => $image->id,
                'image_url' => $image->image_url,
                'sort_order' => $image->sort_order,
            ];
        })->toArray();

        // Get parent product info if this is a variant
        $parentProduct = null;
        if ($productType === ProductType::VARIANT && $product->parent_id && $product->parent) {
            $parentProduct = [
                'id' => $product->parent->id,
                'name' => $product->parent->name,
            ];
        }

        // Get product attributes for simple and variant products
        $productAttributes = [];
        if ($productType === ProductType::SIMPLE || $productType === ProductType::VARIANT) {
            $productAttributes = $product->attributeValues->map(function ($pav) {
                return [
                    'attribute_id' => $pav->attribute_id,
                    'attribute_value_id' => $pav->attribute_value_id,
                ];
            })->toArray();
        }

        // Format product for frontend
        $formattedProduct = [
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'short_description' => $product->short_description,
            'sku' => $product->sku,
            'ean' => $product->ean,
            'model' => $product->model,
            'slug' => $product->slug,
            'price_ron' => $product->price_ron ? number_format($product->price_ron, 2, '.', '') : '',
            'purchase_price_ron' => $product->purchase_price_ron ? number_format($product->purchase_price_ron, 2, '.', '') : '',
            'brand_id' => $product->brand_id,
            'stock_quantity' => $product->stock_quantity ?? 0,
            'weight' => $product->weight ? number_format($product->weight, 2, '.', '') : '',
            'length' => $product->length ? number_format($product->length, 2, '.', '') : '',
            'width' => $product->width ? number_format($product->width, 2, '.', '') : '',
            'height' => $product->height ? number_format($product->height, 2, '.', '') : '',
            'status' => $product->status,
            'main_image_url' => $product->main_image_url,
            'images' => $images,
            'category_ids' => $product->categories->pluck('id')->toArray(),
            'type' => $productType->value,
            'parent_id' => $product->parent_id,
            'parent_product' => $parentProduct,
            'product_attributes' => $productAttributes,
            'family_id' => $product->family_id,
            'family' => $product->family ? [
                'id' => $product->family->id,
                'name' => $product->family->name,
                'code' => $product->family->code,
            ] : null,
        ];

        return Inertia::render('admin/products/show', [
            'product' => $formattedProduct,
            'categories' => $categories,
            'brands' => $brands,
            'productFamilies' => $productFamilies,
            'customerGroups' => $customerGroups,
            'groupPrices' => $groupPrices,
            'attributes' => $attributes,
            'variants' => $variants,
            'parentProducts' => $parentProducts,
            'productTypes' => ProductType::all(),
        ]);
    }

    /**
     * Get products with search using TNTSearch and apply admin-specific filters
     */
    private function getProductsWithSearch(array $filters, string $filter, int $perPage): array
    {
        $searchQuery = trim($filters['search']);

        // Get search result IDs from TNTSearch
        $searchResultIds = Product::search($searchQuery)->keys()->toArray();

        // If no search results, return empty
        if (empty($searchResultIds)) {
            return [
                'products' => collect([]),
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                ],
            ];
        }

        // Check if any of the search results are variants and replace them with their parent configurable products
        $variantProducts = Product::whereIn('id', $searchResultIds)
            ->where('type', ProductType::VARIANT->value)
            ->whereNotNull('parent_id')
            ->get(['id', 'parent_id']);

        // Replace variant IDs with their parent IDs
        $finalSearchResultIds = [];
        $parentIdsToAdd = [];
        
        foreach ($searchResultIds as $id) {
            $variant = $variantProducts->firstWhere('id', $id);
            if ($variant && $variant->parent_id) {
                // This is a variant, use parent ID instead
                $parentIdsToAdd[] = $variant->parent_id;
            } else {
                // This is not a variant, keep the original ID
                $finalSearchResultIds[] = $id;
            }
        }

        // Add parent IDs and remove duplicates
        $finalSearchResultIds = array_unique(array_merge($finalSearchResultIds, $parentIdsToAdd));

        // If no valid IDs after processing, return empty
        if (empty($finalSearchResultIds)) {
            return [
                'products' => collect([]),
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                ],
            ];
        }

        // Build query starting from final search result IDs (no status restriction for admin)
        $query = Product::whereIn('id', $finalSearchResultIds)
            ->with(['brand', 'categories', 'images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])
            ->withCount('variants')
            ->where(function ($q) {
                $q->where('type', '!=', ProductType::VARIANT->value)
                    ->orWhereNull('type');
            });

        // Apply status filter
        switch ($filter) {
            case 'active':
                $query->where('products.status', true);
                break;
            case 'inactive':
                $query->where('products.status', false);
                break;
            case 'out_of_stock':
                // For configurable products, check if at least one variant has stock <= 0
                // For simple products, check stock_quantity directly
                $query->where(function ($q) {
                    $q->where(function ($sq) {
                        // Simple products: use stock_quantity directly
                        $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                            ->where('products.stock_quantity', '<=', 0);
                    })
                    // Configurable products: check if at least one variant has stock <= 0
                    ->orWhere(function ($sq) {
                        $sq->where('products.type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($vq) {
                                $vq->where('status', true)
                                    ->where('stock_quantity', '<=', 0);
                            });
                    });
                });
                break;
            case 'all':
            default:
                // All products (no status filter)
                break;
        }

        // Apply brand filter
        if (isset($filters['brand_id']) && $filters['brand_id']) {
            $query->where('products.brand_id', $filters['brand_id']);
        }

        // Apply category filter
        if (isset($filters['category_id']) && $filters['category_id']) {
            $query->whereHas('categories', function ($q) use ($filters) {
                $q->where('categories.id', $filters['category_id']);
            });
        }

        // Apply family filter
        if (isset($filters['family_id']) && $filters['family_id']) {
            $query->where('products.family_id', $filters['family_id']);
        }

        // Apply product type filter
        if (isset($filters['product_type']) && $filters['product_type']) {
            $query->where('products.type', $filters['product_type']);
        }

        // Apply price range filter
        // For configurable products, check if at least one variant matches the price filter
        // For simple products, use price_ron directly
        if (isset($filters['price_min']) && $filters['price_min'] !== '' || isset($filters['price_max']) && $filters['price_max'] !== '') {
            if (isset($filters['price_min']) && $filters['price_min'] !== '') {
                $priceMinValue = (float) $filters['price_min'];
                $query->where(function ($q) use ($priceMinValue) {
                    // Simple products: use price_ron directly
                    $q->where(function ($sq) use ($priceMinValue) {
                        $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                            ->where('products.price_ron', '>=', $priceMinValue);
                    })
                    // Configurable products: check if at least one variant has price >= priceMin
                    ->orWhere(function ($sq) use ($priceMinValue) {
                        $sq->where('products.type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($vq) use ($priceMinValue) {
                                $vq->where('status', true)
                                    ->where('price_ron', '>=', $priceMinValue);
                            });
                    });
                });
            }

            if (isset($filters['price_max']) && $filters['price_max'] !== '') {
                $priceMaxValue = (float) $filters['price_max'];
                $query->where(function ($q) use ($priceMaxValue) {
                    // Simple products: use price_ron directly
                    $q->where(function ($sq) use ($priceMaxValue) {
                        $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                            ->where('products.price_ron', '<=', $priceMaxValue);
                    })
                    // Configurable products: check if at least one variant has price <= priceMax
                    ->orWhere(function ($sq) use ($priceMaxValue) {
                        $sq->where('products.type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($vq) use ($priceMaxValue) {
                                $vq->where('status', true)
                                    ->where('price_ron', '<=', $priceMaxValue);
                            });
                    });
                });
            }
        }

        // Apply stock range filter
        // For configurable products, check if at least one variant matches the stock filter
        // For simple products, use stock_quantity directly
        if (isset($filters['stock_min']) && $filters['stock_min'] !== '' || isset($filters['stock_max']) && $filters['stock_max'] !== '') {
            if (isset($filters['stock_min']) && $filters['stock_min'] !== '') {
                $stockMinValue = (int) $filters['stock_min'];
                $query->where(function ($q) use ($stockMinValue) {
                    // Simple products: use stock_quantity directly
                    $q->where(function ($sq) use ($stockMinValue) {
                        $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                            ->where('products.stock_quantity', '>=', $stockMinValue);
                    })
                    // Configurable products: check if at least one variant has stock >= stockMin
                    ->orWhere(function ($sq) use ($stockMinValue) {
                        $sq->where('products.type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($vq) use ($stockMinValue) {
                                $vq->where('status', true)
                                    ->where('stock_quantity', '>=', $stockMinValue);
                            });
                    });
                });
            }

            if (isset($filters['stock_max']) && $filters['stock_max'] !== '') {
                $stockMaxValue = (int) $filters['stock_max'];
                $query->where(function ($q) use ($stockMaxValue) {
                    // Simple products: use stock_quantity directly
                    $q->where(function ($sq) use ($stockMaxValue) {
                        $sq->where('products.type', '!=', ProductType::CONFIGURABLE->value)
                            ->where('products.stock_quantity', '<=', $stockMaxValue);
                    })
                    // Configurable products: check if at least one variant has stock <= stockMax
                    ->orWhere(function ($sq) use ($stockMaxValue) {
                        $sq->where('products.type', ProductType::CONFIGURABLE->value)
                            ->whereHas('variants', function ($vq) use ($stockMaxValue) {
                                $vq->where('status', true)
                                    ->where('stock_quantity', '<=', $stockMaxValue);
                            });
                    });
                });
            }
        }

        // For relevance ordering, preserve search order by sorting by ID position
        // Create a map of ID to position for sorting
        // For variants that were replaced with parents, use the variant's position for the parent
        $idToPosition = [];
        foreach ($searchResultIds as $index => $id) {
            $variant = $variantProducts->firstWhere('id', $id);
            if ($variant && $variant->parent_id) {
                // This was a variant, assign its position to the parent
                $parentId = $variant->parent_id;
                // Only set if not already set (to keep the first occurrence's position)
                if (!isset($idToPosition[$parentId])) {
                    $idToPosition[$parentId] = $index;
                }
            } else {
                // This is a regular product, keep its original position
                $idToPosition[$id] = $index;
            }
        }

        // Get all matching products
        $allProducts = $query->get();

        // Sort by search relevance (position in search results)
        $sortedProducts = $allProducts->sortBy(function ($product) use ($idToPosition) {
            return $idToPosition[$product->id] ?? PHP_INT_MAX;
        })->values();

        // Paginate manually
        $currentPage = request()->get('page', 1);
        $total = $sortedProducts->count();
        $items = $sortedProducts->slice(($currentPage - 1) * $perPage, $perPage);

        return [
            'products' => $items,
            'pagination' => [
                'current_page' => (int) $currentPage,
                'last_page' => (int) max(1, ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        
        // Determine product type
        $productType = $product->type instanceof ProductType
            ? $product->type
            : ProductType::from($product->type ?? 'simple');

        // Base validation rules
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:255'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'length' => ['nullable', 'numeric', 'min:0'],
            'width' => ['nullable', 'numeric', 'min:0'],
            'height' => ['nullable', 'numeric', 'min:0'],
            'sku' => ['nullable', 'string', 'max:255'],
            'ean' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'family_id' => ['nullable', 'integer', 'exists:product_families,id'],
            'status' => ['required', 'boolean'],
            'main_image_url' => ['nullable', 'string', 'max:2048'],
            'image_ids' => ['nullable', 'array'],
            'image_ids.*' => ['integer', 'exists:product_images,id'],
            'new_images' => ['nullable', 'array'],
            'new_images.*.image_url' => ['required', 'url', 'max:2048'],
            'new_images.*.sort_order' => ['required', 'integer'],
        ];

        // For non-configurable products, require price fields
        if ($productType !== ProductType::CONFIGURABLE) {
            $rules['price_ron'] = ['required', 'numeric', 'min:0'];
            $rules['purchase_price_ron'] = ['nullable', 'numeric', 'min:0'];
            $rules['group_prices'] = ['nullable', 'array'];
            $rules['group_prices.*.id'] = ['nullable', 'integer', 'exists:product_group_prices,id'];
            $rules['group_prices.*.customer_group_id'] = ['required', 'integer', 'exists:customer_groups,id'];
            $rules['group_prices.*.min_quantity'] = ['required', 'integer', 'min:1'];
            $rules['group_prices.*.price_ron'] = ['required', 'numeric', 'min:0'];
        }

        // For simple and variant products, allow product attributes
        if ($productType === ProductType::SIMPLE || $productType === ProductType::VARIANT) {
            $rules['product_attributes'] = ['nullable', 'array'];
            $rules['product_attributes.*.attribute_id'] = ['required', 'integer', 'exists:attributes,id'];
            $rules['product_attributes.*.attribute_value_id'] = ['required', 'integer', 'exists:attribute_values,id'];
        }

        $validated = $request->validate($rules);

        // Update product fields
        $product->name = $validated['name'];
        $product->model = $validated['model'] ?? null;
        $product->description = $validated['description'] ?? null;
        $product->short_description = $validated['short_description'] ?? null;
        $product->stock_quantity = $validated['stock_quantity'];
        $product->weight = $validated['weight'] ?? null;
        $product->length = $validated['length'] ?? null;
        $product->width = $validated['width'] ?? null;
        $product->height = $validated['height'] ?? null;
        $product->sku = $validated['sku'] ?? null;
        $product->ean = $validated['ean'] ?? null;
        $product->slug = $validated['slug'] ?? null;
        $product->brand_id = $validated['brand_id'] ?? null;
        $product->family_id = $validated['family_id'] ?? null;
        $product->status = $validated['status'];
        $product->main_image_url = $validated['main_image_url'] ?? null;
        
        // Only update price fields for non-configurable products
        if ($productType !== ProductType::CONFIGURABLE) {
            $product->price_ron = $validated['price_ron'];
            $product->purchase_price_ron = $validated['purchase_price_ron'] ?? null;
        }
        
        // Note: type and parent_id are not editable - they are set at creation time

        $product->save();

        // Sync categories
        if (isset($validated['category_ids'])) {
            $product->categories()->sync($validated['category_ids']);
        }

        // Sync images - delete images that are not in the list
        if (isset($validated['image_ids'])) {
            $imageIdsToKeep = $validated['image_ids'];
            ProductImage::where('product_id', $product->id)
                ->whereNotIn('id', $imageIdsToKeep)
                ->delete();
        }

        // Add new images
        if (isset($validated['new_images']) && is_array($validated['new_images'])) {
            foreach ($validated['new_images'] as $newImage) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_url' => $newImage['image_url'],
                    'sort_order' => $newImage['sort_order'],
                ]);
            }
        }

        // Sync product group prices (only for non-configurable products)
        if ($productType !== ProductType::CONFIGURABLE) {
            if (isset($validated['group_prices'])) {
                $groupPriceIds = [];

                foreach ($validated['group_prices'] as $groupPriceData) {
                    if (isset($groupPriceData['id']) && $groupPriceData['id']) {
                        // Update existing group price
                        $groupPrice = ProductGroupPrice::find($groupPriceData['id']);
                        if ($groupPrice && $groupPrice->product_id === $product->id) {
                            $groupPrice->customer_group_id = $groupPriceData['customer_group_id'];
                            $groupPrice->min_quantity = $groupPriceData['min_quantity'];
                            $groupPrice->price_ron = $groupPriceData['price_ron'];
                            $groupPrice->save();
                            $groupPriceIds[] = $groupPrice->id;
                        }
                    } else {
                        // Create new group price
                        $groupPrice = ProductGroupPrice::create([
                            'product_id' => $product->id,
                            'customer_group_id' => $groupPriceData['customer_group_id'],
                            'min_quantity' => $groupPriceData['min_quantity'],
                            'price_ron' => $groupPriceData['price_ron'],
                        ]);
                        $groupPriceIds[] = $groupPrice->id;
                    }
                }

                // Delete group prices that are not in the list
                ProductGroupPrice::where('product_id', $product->id)
                    ->whereNotIn('id', $groupPriceIds)
                    ->delete();
            } else {
                // If group_prices is not provided, delete all existing group prices
                ProductGroupPrice::where('product_id', $product->id)->delete();
            }
        }

        // Sync product attributes (only for simple and variant products)
        if ($productType === ProductType::SIMPLE || $productType === ProductType::VARIANT) {
            // Delete existing attribute values
            ProductAttributeValue::where('product_id', $product->id)->delete();

            // Create new attribute values
            if (isset($validated['product_attributes']) && is_array($validated['product_attributes'])) {
                foreach ($validated['product_attributes'] as $attr) {
                    ProductAttributeValue::create([
                        'product_id' => $product->id,
                        'attribute_id' => $attr['attribute_id'],
                        'attribute_value_id' => $attr['attribute_value_id'],
                    ]);
                }
            }
        }

        // If this is a configurable product and family changed, update all variants
        if ($productType === ProductType::CONFIGURABLE && $product->wasChanged('family_id')) {
            $product->variants()->update(['family_id' => $product->family_id]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
        ]);
    }

    /**
     * Store a new product image.
     */
    public function storeImage(Request $request, int $id)
    {
        $request->validate([
            'image_url' => ['required', 'url', 'max:2048'],
        ]);

        $product = Product::findOrFail($id);

        // Get the highest sort_order for this product
        $maxSortOrder = ProductImage::where('product_id', $product->id)
            ->max('sort_order') ?? -1;

        // Create the new image
        $image = ProductImage::create([
            'product_id' => $product->id,
            'image_url' => $request->image_url,
            'sort_order' => $maxSortOrder + 1,
        ]);

        // Return the created image
        return response()->json([
            'id' => $image->id,
            'image_url' => $image->image_url,
            'sort_order' => $image->sort_order,
        ]);
    }

    /**
     * Store or update variants for a configurable product.
     */
    public function syncVariants(Request $request, int $id)
    {
        $product = Product::findOrFail($id);

        $productType = $product->type instanceof ProductType
            ? $product->type
            : ProductType::from($product->type ?? 'simple');

        if ($productType !== ProductType::CONFIGURABLE) {
            return response()->json([
                'success' => false,
                'message' => 'Doar produsele configurable pot avea variante.',
            ], 422);
        }

        $validated = $request->validate([
            'variants' => 'required|array',
            'variants.*.id' => 'nullable|integer|exists:products,id',
            'variants.*.name' => 'required|string|max:255',
            'variants.*.sku' => 'required|string|max:255',
            'variants.*.price_ron' => 'required|numeric|min:0',
            'variants.*.stock_quantity' => 'required|integer|min:0',
            'variants.*.status' => 'required|boolean',
            'variants.*.attributes' => 'required|array',
            'variants.*.attributes.*.attribute_id' => 'required|integer|exists:attributes,id',
            'variants.*.attributes.*.attribute_value_id' => 'required|integer|exists:attribute_values,id',
        ]);

        // Validate SKU uniqueness for new variants
        foreach ($validated['variants'] as $index => $variantData) {
            if (!isset($variantData['id']) || !$variantData['id']) {
                // New variant - check if SKU exists
                $existingProduct = Product::where('sku', $variantData['sku'])->first();
                if ($existingProduct) {
                    return response()->json([
                        'success' => false,
                        'message' => "SKU '{$variantData['sku']}' deja există pentru alt produs.",
                    ], 422);
                }
            } else {
                // Existing variant - check if SKU exists for other products
                $existingProduct = Product::where('sku', $variantData['sku'])
                    ->where('id', '!=', $variantData['id'])
                    ->first();
                if ($existingProduct) {
                    return response()->json([
                        'success' => false,
                        'message' => "SKU '{$variantData['sku']}' deja există pentru alt produs.",
                    ], 422);
                }
            }
        }

        $variantIds = [];

        foreach ($validated['variants'] as $variantData) {
            if (isset($variantData['id']) && $variantData['id']) {
                // Update existing variant
                $variant = Product::find($variantData['id']);
                if ($variant && $variant->parent_id === $product->id) {
                    $variant->name = $variantData['name'];
                    $variant->sku = $variantData['sku'];
                    $variant->price_ron = $variantData['price_ron'];
                    $variant->stock_quantity = $variantData['stock_quantity'];
                    $variant->status = $variantData['status'];
                    $variant->save();
                    $variantIds[] = $variant->id;
                }
            } else {
                // Create new variant
                $variant = Product::create([
                    'parent_id' => $product->id,
                    'type' => ProductType::VARIANT->value,
                    'name' => $variantData['name'],
                    'sku' => $variantData['sku'],
                    'slug' => \Illuminate\Support\Str::slug($variantData['name'] . '-' . $product->id . '-' . time()),
                    'price_ron' => $variantData['price_ron'],
                    'stock_quantity' => $variantData['stock_quantity'],
                    'status' => $variantData['status'],
                    // Inherit other fields from parent
                    'brand_id' => $product->brand_id,
                    'family_id' => $product->family_id, // Inherit family from parent
                    'description' => $product->description,
                    'short_description' => $product->short_description,
                    'main_image_url' => $product->main_image_url,
                ]);
                $variantIds[] = $variant->id;
            }

            // Get the variant (either updated or newly created)
            $variant = Product::find($variantIds[count($variantIds) - 1]);

            // Sync categories from parent
            $variant->categories()->sync($product->categories->pluck('id'));

            // Sync attributes
            // Delete existing attribute values
            ProductAttributeValue::where('product_id', $variant->id)->delete();

            // Create new attribute values
            foreach ($variantData['attributes'] as $attr) {
                ProductAttributeValue::create([
                    'product_id' => $variant->id,
                    'attribute_id' => $attr['attribute_id'],
                    'attribute_value_id' => $attr['attribute_value_id'],
                ]);
            }
        }

        // Delete variants that are not in the list
        Product::where('parent_id', $product->id)
            ->whereNotIn('id', $variantIds)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Variante sincronizate cu succes.',
        ]);
    }
}
