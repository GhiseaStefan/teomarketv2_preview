<?php

namespace App\Http\Middleware;

use App\Models\Currency;
use App\Models\CustomerGroup;
use App\Models\Wishlist;
use App\Models\Product;
use App\Enums\ProductType;
use App\Services\CartService;
use App\Services\ProductPriceService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        // Get active currencies, ensuring RON is first
        $currencies = Currency::where('status', true)
            ->orderByRaw("CASE WHEN code = 'RON' THEN 0 ELSE 1 END")
            ->orderBy('code')
            ->get()
            ->map(function ($currency) {
                return [
                    'id' => $currency->id,
                    'code' => $currency->code,
                    'symbol_left' => $currency->symbol_left,
                    'symbol_right' => $currency->symbol_right,
                    'value' => $currency->value,
                ];
            });

        // Get current currency from session, cookie, or default to RON
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';

        // Restore currency to session if it was only in cookie
        // This ensures session and cookie stay in sync
        if (!$request->session()->has('currency') && $currentCurrencyCode !== 'RON') {
            $request->session()->put('currency', $currentCurrencyCode);
        }
        $currentCurrency = $currencies->firstWhere('code', $currentCurrencyCode)
            ?? $currencies->firstWhere('code', 'RON')
            ?? $currencies->first();

        // Get current locale - use App::getLocale() to ensure consistency with SetLocale middleware
        // Fallback to session/cookie/config if for some reason locale is not set
        $currentLocale = App::getLocale() ?: $request->session()->get('locale')
            ?: $request->cookie('locale')
            ?: config('app.locale');

        // Get customer group ID from authenticated user
        $customerGroupId = null;
        $customerGroup = null;
        if ($request->user()) {
            // Load customer with customerGroup relationship
            $user = $request->user()->load('customer.customerGroup');
            if ($user->customer) {
                $customerGroupId = $user->customer->customer_group_id;
                if ($customerGroupId && $user->customer->customerGroup) {
                    $customerGroup = $user->customer->customerGroup;
                    // Store in session for use in controllers
                    $request->session()->put('customer_group_id', $customerGroupId);
                }
            }
        } else {
            // For unauthenticated users, use B2C group
            $b2cGroup = CustomerGroup::getB2CGroup();
            if ($b2cGroup) {
                $customerGroup = $b2cGroup;
                $customerGroupId = $b2cGroup->id;
            } else {
                // Clear from session if not authenticated and no B2C group
                $request->session()->forget('customer_group_id');
            }
        }

        // Get B2B_STANDARD group for reference
        $b2bStandardGroup = CustomerGroup::where('code', 'B2B_STANDARD')->first();

        // Get B2B_STANDARD group data
        $b2bStandardGroupData = null;
        if ($b2bStandardGroup) {
            $b2bStandardGroupData = [
                'id' => $b2bStandardGroup->id,
                'name' => $b2bStandardGroup->name,
                'code' => $b2bStandardGroup->code,
            ];
        }

        // Load translations for the current locale
        // Validate locale is in allowed list before loading translations
        $allowedLocales = ['ro', 'en'];
        if (!in_array($currentLocale, $allowedLocales)) {
            $currentLocale = config('app.locale');
        }

        // JSON translation files are in lang/ directory, not resources/lang/
        $translationsPath = base_path('lang/' . $currentLocale . '.json');
        $translations = [];
        if (file_exists($translationsPath)) {
            $translations = json_decode(file_get_contents($translationsPath), true) ?? [];
        }

        // Get cart summary and items for navbar
        // Need to get the actual Currency model instance, not the mapped array
        $currentCurrencyModel = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->first();

        $cartSummary = [
            'total_items' => 0,
            'total_excl_vat' => 0,
            'total_incl_vat' => 0,
            'vat_rate' => 19.0,
            'vat_included' => true,
        ];
        $cartItems = [];

        if ($currentCurrencyModel) {
            $cartService = app(CartService::class);
            $cartSummary = $cartService->getCartSummary($currentCurrencyModel, $customerGroupId, $request);
            $cartData = $cartService->formatCartForDisplay($currentCurrencyModel, $customerGroupId, $request);
            $cartItems = $cartData['items'] ?? [];
        }

        // Check if current route is an admin route
        $isAdminRoute = $request->is('admin*') || $request->routeIs('admin.*');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'currencies' => $currencies,
            'currentCurrency' => $currentCurrency,
            'locale' => $currentLocale,
            'translations' => $translations,
            'isAdminRoute' => $isAdminRoute,
            'customerGroup' => $customerGroup ? [
                'id' => $customerGroup->id,
                'name' => $customerGroup->name,
                'code' => $customerGroup->code,
            ] : null,
            'b2bStandardGroup' => $b2bStandardGroupData,
            'cartSummary' => $cartSummary,
            'cartItems' => $cartItems,
            'wishlistItems' => $this->getWishlistItems($request),
            'wishlistSummary' => $this->getWishlistSummary($request),
        ];
    }

    /**
     * Get wishlist items for the authenticated user.
     */
    private function getWishlistItems(Request $request): array
    {
        $user = $request->user();
        if (!$user || !$user->customer_id) {
            return [];
        }

        // Get current currency
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';
        $currentCurrencyModel = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->first();

        if (!$currentCurrencyModel) {
            return [];
        }

        // Get customer group ID
        $customerGroupId = $request->session()->get('customer_group_id', null);

        // Get price service
        $priceService = app(ProductPriceService::class);

        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $priceService->getEffectiveCustomerGroupId($customerGroupId);

        $wishlistItems = Wishlist::where('customer_id', $user->customer_id)
            ->with(['product' => function ($query) {
                $query->with(['images' => function ($imgQuery) {
                    $imgQuery->orderBy('sort_order')->limit(1);
                }, 'productGroupPrices', 'variants' => function ($q) {
                    $q->where('status', true)->with('productGroupPrices');
                }]);
            }])
            ->latest()
            ->get(); // Get all items for profile page, limit in frontend for dropdown

        return $wishlistItems->map(function ($item) use ($currentCurrencyModel, $customerGroupId, $priceService, $request) {
            $product = $item->product;
            if (!$product || !$product->status) {
                return null;
            }

            // Get product image
            $imageUrl = null;
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images && $product->images->count() > 0) {
                $imageUrl = $product->images->first()->image_url;
            }

            // Use quantity 1 for wishlist display (similar to homepage)
            $quantity = 1;

            // For configurable products, calculate minimum price from variants
            $displayProduct = $product;
            $minPriceFromVariants = null;

            $typeValue = $product->type instanceof ProductType
                ? $product->type->value
                : ($product->type ?? ProductType::SIMPLE->value);

            if ($typeValue === ProductType::CONFIGURABLE->value) {
                // Load variants if not already loaded
                if (!$product->relationLoaded('variants')) {
                    $product->load(['variants' => function ($q) {
                        $q->where('status', true)->with('productGroupPrices');
                    }]);
                }

                $variants = $product->variants()->where('status', true)->get();

                if ($variants->isNotEmpty()) {
                    // Find minimum price among all variants
                    foreach ($variants as $variant) {
                        $variantPriceInfo = $priceService->getPriceInfo($variant, $currentCurrencyModel, $quantity, $customerGroupId, null, $request);
                        $variantPrice = $variantPriceInfo['unit_price_ron_incl_vat'];

                        if ($minPriceFromVariants === null || $variantPrice < $minPriceFromVariants) {
                            $minPriceFromVariants = $variantPrice;
                            // Use this variant for price calculation
                            $displayProduct = $variant;
                        }
                    }
                }
            }

            // Get complete price information using centralized price service (same as cart)
            $priceInfo = $priceService->getPriceInfo(
                $displayProduct,
                $currentCurrencyModel,
                $quantity,
                $customerGroupId,
                null,
                $request
            );

            // If configurable product, calculate and use minimum price from variants
            $minPriceDisplay = null;
            if ($typeValue === ProductType::CONFIGURABLE->value && $minPriceFromVariants !== null) {
                // Convert minimum price to display currency
                $minPriceDisplay = $currentCurrencyModel->convertFromRon($minPriceFromVariants);
                $priceInfo['unit_price_display'] = $minPriceDisplay;
            }

            // Use display price already calculated by backend for customer group
            $unitPrice = $priceInfo['unit_price_display'];

            // Get price tiers using centralized price service (already includes display prices)
            $priceTiers = $priceService->getPriceTiers($displayProduct, $currentCurrencyModel, $customerGroupId, $request);
            $formattedTiers = [];
            if (!empty($priceTiers)) {
                foreach ($priceTiers as $tier) {
                    $formattedTiers[] = [
                        'min_quantity' => $tier['min_quantity'],
                        'max_quantity' => $tier['max_quantity'],
                        'quantity_range' => $tier['quantity_range'],
                        'price_raw' => $tier['price_raw'], // For backward compatibility
                        'price_display' => $tier['price_display'], // Display price already calculated for customer group
                    ];
                }
            }

            // If configurable product, update price tiers to use minimum price as base
            if ($typeValue === ProductType::CONFIGURABLE->value && $minPriceDisplay !== null) {
                if (empty($formattedTiers)) {
                    // If no tiers, create a simple tier with min price
                    $formattedTiers = [[
                        'min_quantity' => 1,
                        'max_quantity' => null,
                        'quantity_range' => '1+',
                        'price_raw' => $minPriceDisplay,
                        'price_display' => $minPriceDisplay,
                    ]];
                } else {
                    // Adjust first tier price to minimum
                    if (isset($formattedTiers[0])) {
                        $formattedTiers[0]['price_raw'] = $minPriceDisplay;
                        $formattedTiers[0]['price_display'] = $minPriceDisplay;
                    }
                }
            }

            return [
                'product_id' => $item->product_id,
                'id' => $item->product_id,
                'name' => $product->name ?? 'Unknown Product',
                'image' => $imageUrl,
                'price_raw' => round($unitPrice, 2),
                'unit_price_raw' => round($unitPrice, 2),
                'stock_quantity' => $product->stock_quantity ?? 0,
                'sku' => $product->sku ?? null,
                'short_description' => $product->short_description ?? null,
                'price_tiers' => $formattedTiers,
                'vat_included' => $product->vat_included ?? true,
            ];
        })->filter()->toArray();
    }

    /**
     * Get wishlist summary.
     */
    private function getWishlistSummary(Request $request): array
    {
        $user = $request->user();
        if (!$user || !$user->customer_id) {
            return [
                'total_items' => 0,
            ];
        }

        $totalItems = Wishlist::where('customer_id', $user->customer_id)->count();

        return [
            'total_items' => $totalItems,
        ];
    }
}
