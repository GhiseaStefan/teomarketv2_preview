<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductGroupPrice;
use App\Models\Brand;
use App\Models\Category;
use App\Models\CustomerGroup;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductsController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request): Response
    {
        $filter = $request->get('filter', 'all');
        $search = $request->get('search', '');

        $query = Product::with(['brand', 'images' => function ($query) {
            $query->orderBy('sort_order')->limit(1);
        }])->orderBy('created_at', 'desc');

        // Apply filters
        switch ($filter) {
            case 'active':
                $query->where('status', true);
                break;
            case 'inactive':
                $query->where('status', false);
                break;
            case 'out_of_stock':
                $query->where('stock_quantity', '<=', 0);
                break;
            case 'all':
            default:
                // All products (no filter)
                break;
        }

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('ean', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $products = $query->paginate(50)->appends($request->only(['filter', 'search']));

        // Format products for frontend
        $formattedProducts = $products->getCollection()->map(function ($product) {
            $imageUrl = null;
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images->first() && $product->images->first()->image_url) {
                $imageUrl = $product->images->first()->image_url;
            }

            return [
                'id' => $product->id,
                'sku' => $product->sku,
                'ean' => $product->ean,
                'name' => $product->name,
                'model' => $product->model,
                'brand_name' => $product->brand?->name ?? 'N/A',
                'price_ron' => number_format($product->price_ron ?? 0, 2, '.', ''),
                'stock_quantity' => $product->stock_quantity ?? 0,
                'status' => $product->status,
                'image_url' => $imageUrl,
                'created_at' => $product->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $product->created_at->format('d.m.Y H:i'),
            ];
        });

        return Inertia::render('admin/products', [
            'products' => $formattedProducts,
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
            'filters' => [
                'filter' => $filter,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Display the specified product for editing.
     */
    public function show(int $id): Response
    {
        $product = Product::with(['brand', 'images' => function ($query) {
            $query->orderBy('sort_order');
        }, 'categories', 'productGroupPrices.customerGroup'])->findOrFail($id);

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
        ];

        return Inertia::render('admin/products/show', [
            'product' => $formattedProduct,
            'categories' => $categories,
            'brands' => $brands,
            'customerGroups' => $customerGroups,
            'groupPrices' => $groupPrices,
        ]);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'short_description' => ['nullable', 'string', 'max:255'],
            'price_ron' => ['required', 'numeric', 'min:0'],
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
            'purchase_price_ron' => ['nullable', 'numeric', 'min:0'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'status' => ['required', 'boolean'],
            'main_image_url' => ['nullable', 'string', 'max:2048'],
            'image_ids' => ['nullable', 'array'],
            'image_ids.*' => ['integer', 'exists:product_images,id'],
            'new_images' => ['nullable', 'array'],
            'new_images.*.image_url' => ['required', 'url', 'max:2048'],
            'new_images.*.sort_order' => ['required', 'integer'],
            'group_prices' => ['nullable', 'array'],
            'group_prices.*.id' => ['nullable', 'integer', 'exists:product_group_prices,id'],
            'group_prices.*.customer_group_id' => ['required', 'integer', 'exists:customer_groups,id'],
            'group_prices.*.min_quantity' => ['required', 'integer', 'min:1'],
            'group_prices.*.price_ron' => ['required', 'numeric', 'min:0'],
        ]);

        $product = Product::findOrFail($id);

        // Update product fields
        $product->name = $validated['name'];
        $product->model = $validated['model'] ?? null;
        $product->description = $validated['description'] ?? null;
        $product->short_description = $validated['short_description'] ?? null;
        $product->price_ron = $validated['price_ron'];
        $product->stock_quantity = $validated['stock_quantity'];
        $product->weight = $validated['weight'] ?? null;
        $product->length = $validated['length'] ?? null;
        $product->width = $validated['width'] ?? null;
        $product->height = $validated['height'] ?? null;
        $product->sku = $validated['sku'] ?? null;
        $product->ean = $validated['ean'] ?? null;
        $product->slug = $validated['slug'] ?? null;
        $product->purchase_price_ron = $validated['purchase_price_ron'] ?? null;
        $product->brand_id = $validated['brand_id'] ?? null;
        $product->status = $validated['status'];
        $product->main_image_url = $validated['main_image_url'] ?? null;
        
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

        // Sync product group prices
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
}
