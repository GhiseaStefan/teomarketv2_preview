<?php

namespace App\Http\Controllers;

use App\Models\Wishlist;
use App\Models\Product;
use App\Models\Currency;
use App\Models\CustomerGroup;
use App\Services\ProductService;
use App\Enums\ProductType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WishlistController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * Display the wishlist page.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->customer_id) {
            return redirect()->route('login');
        }

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

        // Get customer group ID from session
        $customerGroupId = $request->session()->get('customer_group_id', null);

        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = CustomerGroup::getB2CGroupId() ?: $customerGroupId;

        // Get wishlist items with products
        $wishlistItems = Wishlist::where('customer_id', $user->customer_id)
            ->with(['product' => function ($query) {
                $query->where('status', true)
                    ->with(['images' => function ($imgQuery) {
                        $imgQuery->orderBy('sort_order')->limit(1);
                    }, 'productGroupPrices']);
            }])
            ->latest()
            ->get();

        // Extract products and filter out null products
        $products = $wishlistItems->map(function ($item) {
            return $item->product;
        })->filter(function ($product) {
            return $product !== null && $product->status;
        });

        // Format products for display
        $formattedProducts = $this->productService->formatProductsForDisplay(
            $products,
            $currentCurrency,
            $customerGroupId,
            $request
        );

        return Inertia::render('wishlist/index', [
            'products' => $formattedProducts,
        ]);
    }
    /**
     * Add a product to the wishlist.
     * For configurable products with variants, always add the parent configurable product.
     */
    public function add(Request $request)
    {
        // Validate request
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        try {
            $user = Auth::user();
            if (!$user || !$user->customer_id) {
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['message' => 'You must be logged in to add items to wishlist']);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'You must be logged in to add items to wishlist',
                ], 401);
            }

            // Get the product to determine if it's a variant
            $product = Product::find($validated['product_id']);
            if (!$product) {
                if ($request->header('X-Inertia')) {
                    return back()->withErrors(['message' => 'Product not found']);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found',
                ], 404);
            }

            // For variants, use the parent configurable product ID
            // For configurable or simple products, use the product ID itself
            $wishlistProductId = $product->parent_id ?? $product->id;

            // Check if already in wishlist
            $existing = Wishlist::where('customer_id', $user->customer_id)
                ->where('product_id', $wishlistProductId)
                ->first();

            if ($existing) {
                if ($request->header('X-Inertia')) {
                    return back()->with('wishlistMessage', 'Product already in wishlist');
                }
                return response()->json([
                    'success' => true,
                    'message' => 'Product already in wishlist',
                ]);
            }

            Wishlist::create([
                'customer_id' => $user->customer_id,
                'product_id' => $wishlistProductId,
            ]);

            // If Inertia request, return back with success
            if ($request->header('X-Inertia')) {
                return back()->with('wishlistSuccess', true);
            }

            // Otherwise return JSON (for API calls)
            return response()->json([
                'success' => true,
                'message' => 'Product added to wishlist',
            ]);
        } catch (\Exception $e) {
            // If Inertia request, return back with error
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['message' => $e->getMessage()]);
            }

            // Otherwise return JSON error
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove a product from the wishlist.
     * For variants, remove the parent configurable product from wishlist.
     */
    public function remove(int $productId)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->customer_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You must be logged in to remove items from wishlist',
                ], 401);
            }

            // Get the product to determine if it's a variant
            $product = Product::find($productId);
            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found',
                ], 404);
            }

            // For variants, use the parent configurable product ID
            // For configurable or simple products, use the product ID itself
            $wishlistProductId = $product->parent_id ?? $product->id;

            $wishlistItem = Wishlist::where('customer_id', $user->customer_id)
                ->where('product_id', $wishlistProductId)
                ->first();

            if (!$wishlistItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Product not found in wishlist',
                ], 404);
            }

            $wishlistItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Product removed from wishlist',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Check if a product is in wishlist.
     * For variants, check if the parent configurable product is in wishlist.
     */
    public function check(int $productId)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->customer_id) {
                return response()->json([
                    'in_wishlist' => false,
                ]);
            }

            // Get the product to determine if it's a variant
            $product = Product::find($productId);
            if (!$product) {
                return response()->json([
                    'in_wishlist' => false,
                ]);
            }

            // For variants, use the parent configurable product ID
            // For configurable or simple products, use the product ID itself
            $wishlistProductId = $product->parent_id ?? $product->id;

            $exists = Wishlist::where('customer_id', $user->customer_id)
                ->where('product_id', $wishlistProductId)
                ->exists();

            return response()->json([
                'in_wishlist' => $exists,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'in_wishlist' => false,
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
