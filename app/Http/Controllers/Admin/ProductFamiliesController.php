<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductFamily;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductFamiliesController extends Controller
{
    /**
     * Display a listing of product families.
     */
    public function index(Request $request): Response
    {
        $search = $request->get('search', '');
        
        $query = ProductFamily::withCount('products')
            ->orderBy('id', 'asc');

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $productFamilies = $query->paginate(50)->appends($request->only(['search']));

        // Format families for frontend
        $formattedFamilies = $productFamilies->map(function ($family) {
            return [
                'id' => $family->id,
                'name' => $family->name,
                'code' => $family->code,
                'status' => $family->status,
                'products_count' => $family->products_count,
                'created_at' => $family->created_at?->format('Y-m-d H:i:s'),
                'created_at_formatted' => $family->created_at?->format('d.m.Y H:i'),
            ];
        });

        return Inertia::render('admin/product-families', [
            'productFamilies' => $formattedFamilies,
            'pagination' => [
                'current_page' => $productFamilies->currentPage(),
                'last_page' => $productFamilies->lastPage(),
                'per_page' => $productFamilies->perPage(),
                'total' => $productFamilies->total(),
            ],
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Deactivate selected product families.
     */
    public function deactivate(Request $request)
    {
        $request->validate([
            'family_ids' => 'required|array',
            'family_ids.*' => 'required|integer|exists:product_families,id',
        ]);

        $familyIds = $request->input('family_ids');

        DB::transaction(function () use ($familyIds) {
            ProductFamily::whereIn('id', $familyIds)->update(['status' => false]);
        });

        return redirect()->back()->with('success', 'Selected product families have been deactivated.');
    }

    /**
     * Activate selected product families.
     */
    public function activate(Request $request)
    {
        $request->validate([
            'family_ids' => 'required|array',
            'family_ids.*' => 'required|integer|exists:product_families,id',
        ]);

        $familyIds = $request->input('family_ids');

        DB::transaction(function () use ($familyIds) {
            ProductFamily::whereIn('id', $familyIds)->update(['status' => true]);
        });

        return redirect()->back()->with('success', 'Selected product families have been activated.');
    }

    /**
     * Display the specified product family.
     */
    public function show(int $id): Response
    {
        $family = ProductFamily::with([
            'attributes',
            'products' => function ($query) {
                $query->orderBy('created_at', 'desc')
                    ->limit(10);
            },
            'products.images' => function ($query) {
                $query->orderBy('sort_order');
            },
        ])->withCount('products')->findOrFail($id);

        // Format family for frontend
        $formattedFamily = [
            'id' => $family->id,
            'name' => $family->name,
            'code' => $family->code,
            'status' => $family->status,
            'created_at' => $family->created_at?->format('Y-m-d H:i:s'),
            'created_at_formatted' => $family->created_at?->format('d.m.Y H:i'),
            'updated_at' => $family->updated_at?->format('Y-m-d H:i:s'),
            'updated_at_formatted' => $family->updated_at?->format('d.m.Y H:i'),
            'attributes' => $family->attributes->map(function ($attribute) {
                return [
                    'id' => $attribute->id,
                    'name' => $attribute->name,
                    'code' => $attribute->code,
                    'type' => $attribute->type,
                    'is_filterable' => $attribute->is_filterable,
                    'sort_order' => $attribute->pivot->sort_order ?? 0,
                ];
            }),
            'products' => $family->products->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'ean' => $product->ean,
                    'type' => $product->type?->value ?? $product->type,
                    'status' => $product->status,
                    'stock_quantity' => $product->stock_quantity,
                    'price_ron' => number_format($product->price_ron ?? 0, 2, '.', ''),
                    'main_image_url' => $product->main_image_url,
                    'images' => $product->images->map(function ($image) {
                        return [
                            'id' => $image->id,
                            'url' => $image->url,
                            'sort_order' => $image->sort_order,
                        ];
                    }),
                    'created_at' => $product->created_at?->format('Y-m-d H:i:s'),
                    'created_at_formatted' => $product->created_at?->format('d.m.Y H:i'),
                ];
            }),
            'products_count' => $family->products_count,
        ];

        return Inertia::render('admin/product-families/show', [
            'family' => $formattedFamily,
        ]);
    }
}
