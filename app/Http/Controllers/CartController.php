<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use App\Services\CartService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CartController extends Controller
{
    protected CartService $cartService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }

    /**
     * Display the cart page.
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

        $customerGroupId = $request->session()->get('customer_group_id', null);

        $cartData = $this->cartService->formatCartForDisplay($currentCurrency, $customerGroupId, $request);

        return Inertia::render('Cart/Index', [
            'cart' => $cartData,
        ]);
    }

    /**
     * Add a product to the cart.
     */
    public function add(Request $request)
    {
        // Validate request
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        try {
            $customerGroupId = $request->session()->get('customer_group_id', null);
            $cartData = $this->cartService->addToCart(
                $validated['product_id'],
                $validated['quantity'],
                $customerGroupId,
                $request
            );

            // If Inertia request, return back with success
            if ($request->header('X-Inertia')) {
                return back()->with('cartSuccess', true);
            }

            // Otherwise return JSON (for API calls)
            return response()->json([
                'success' => true,
                'cart' => $cartData,
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
     * Update quantity of a cart item.
     */
    public function update(Request $request, string $cartKey)
    {
        $request->validate([
            'quantity' => 'required|integer|min:0',
        ]);

        try {
            $cartData = $this->cartService->updateQuantity($cartKey, $request->quantity, $request);

            return response()->json([
                'success' => true,
                'cart' => $cartData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove a product from the cart.
     */
    public function remove(Request $request, string $cartKey)
    {
        try {
            $cartData = $this->cartService->removeFromCart($cartKey, $request);

            return response()->json([
                'success' => true,
                'cart' => $cartData,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Clear the entire cart.
     */
    public function clear()
    {
        $this->cartService->clearCart();

        return response()->json([
            'success' => true,
            'cart' => [
                'items' => [],
                'summary' => [
                    'total_items' => 0,
                    'total_excl_vat' => 0,
                    'total_incl_vat' => 0,
                ],
            ],
        ]);
    }

    /**
     * Get cart summary (for navbar display).
     */
    public function summary(Request $request)
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

        $customerGroupId = $request->session()->get('customer_group_id', null);
        $summary = $this->cartService->getCartSummary($currentCurrency, $customerGroupId, $request);

        return response()->json([
            'success' => true,
            'summary' => $summary,
        ]);
    }
}
