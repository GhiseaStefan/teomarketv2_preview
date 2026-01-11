<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\VatRate;
use App\Models\Cart;
use App\Models\CartItem;
use App\Services\CountryDetectionService;
use App\Utils\CurrencyConverter;
use App\Enums\ProductType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class CartService
{
    protected ProductPriceService $priceService;
    protected CountryDetectionService $countryDetectionService;

    public function __construct(ProductPriceService $priceService, CountryDetectionService $countryDetectionService)
    {
        $this->priceService = $priceService;
        $this->countryDetectionService = $countryDetectionService;
    }

    /**
     * Get all cart items from database (if authenticated) or session (if guest).
     *
     * @return array
     */
    /**
     * Get all cart items from database (if authenticated) or session (if guest).
     *
     * @param Request|null $request Optional request object for IP detection
     * @return array
     */
    public function getCartItems(?Request $request = null): array
    {
        $user = Auth::user();

        if ($user && $user->customer_id) {
            // User is authenticated - get from database
            return $this->getCartItemsFromDatabase($user->customer_id, $request);
        }

        // Guest user - get from session
        return Session::get('cart', []);
    }

    /**
     * Get cart items from database for a customer.
     *
     * @param int $customerId
     * @param Request|null $request Optional request object for IP detection
     * @return array
     */
    private function getCartItemsFromDatabase(int $customerId, ?Request $request = null): array
    {
        // Get or create cart for this customer
        $cart = Cart::firstOrCreate(
            ['customer_id' => $customerId, 'status' => 'active'],
            [
                'status' => 'active',
                'session_id' => Session::getId(),
                'client_ip' => $this->getClientIp($request),
            ]
        );

        // Update session_id and client_ip if not set
        $needsSave = false;
        if (!$cart->session_id) {
            $cart->session_id = Session::getId();
            $needsSave = true;
        }
        if (!$cart->client_ip && $request) {
            $cart->client_ip = $this->getClientIp($request);
            $needsSave = true;
        }
        if ($needsSave) {
            $cart->save();
        }

        // Get customer_group_id from cart or customer
        $customerGroupId = $cart->customer_group_id;
        if (!$customerGroupId) {
            $customer = Customer::find($customerId);
            $customerGroupId = $customer->customer_group_id ?? null;
        }

        // Get cart items
        $cartItems = CartItem::where('cart_id', $cart->id)
            ->with('product')
            ->get();

        $cartArray = [];
        foreach ($cartItems as $item) {
            $cartKey = $this->getCartKey($item->product_id, $customerGroupId);
            $cartArray[$cartKey] = [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'customer_group_id' => $customerGroupId,
            ];
        }

        return $cartArray;
    }

    /**
     * Save cart items to database for authenticated users.
     *
     * @param array $cart
     * @param int $customerId
     * @param Request|null $request Optional request object for price calculation
     * @return void
     */
    private function saveCartItemsToDatabase(array $cart, int $customerId, ?Request $request = null): void
    {
        // Get or create cart for this customer
        $cartModel = Cart::firstOrCreate(
            ['customer_id' => $customerId, 'status' => 'active'],
            [
                'status' => 'active',
                'session_id' => Session::getId(),
                'client_ip' => $this->getClientIp($request),
            ]
        );

        // Update session_id and client_ip if not set
        $needsSave = false;
        if (!$cartModel->session_id) {
            $cartModel->session_id = Session::getId();
            $needsSave = true;
        }
        if ($request) {
            $clientIp = $this->getClientIp($request);
            if (!$cartModel->client_ip || $cartModel->client_ip !== $clientIp) {
                $cartModel->client_ip = $clientIp;
                $needsSave = true;
            }
        }

        // Get customer_group_id from first item or use customer's group
        $customerGroupId = null;
        if (!empty($cart)) {
            $firstItem = reset($cart);
            $customerGroupId = $firstItem['customer_group_id'] ?? null;
        }

        if (!$customerGroupId) {
            $customer = Customer::find($customerId);
            $customerGroupId = $customer->customer_group_id ?? null;
        }

        // Update cart's customer_group_id if needed
        if ($customerGroupId && $cartModel->customer_group_id !== $customerGroupId) {
            $cartModel->customer_group_id = $customerGroupId;
            $needsSave = true;
        }

        // Save cart model changes if needed
        if ($needsSave) {
            $cartModel->save();
        }

        // Delete all existing cart items for this cart
        CartItem::where('cart_id', $cartModel->id)->delete();

        // Insert new cart items
        foreach ($cart as $item) {
            CartItem::create([
                'cart_id' => $cartModel->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }

        // Calculate and update total_amount
        $this->updateCartTotalAmount($cartModel, $request);
    }

    /**
     * Add a product to the cart.
     *
     * @param int $productId
     * @param int $quantity
     * @param int|null $customerGroupId
     * @param Request|null $request Optional request object for country detection
     * @return array
     * @throws \Exception If trying to add a configurable product (only variants can be added)
     */
    public function addToCart(int $productId, int $quantity, ?int $customerGroupId = null, ?Request $request = null): array
    {
        $product = Product::where('id', $productId)
            ->where('status', true)
            ->firstOrFail();

        // Validate: Configurable products cannot be added directly to cart, only their variants
        $productType = $product->type instanceof ProductType 
            ? $product->type 
            : ProductType::from($product->type ?? 'simple');
        
        if ($productType === ProductType::CONFIGURABLE) {
            throw new \Exception('Configurable products cannot be added directly to cart. Please select a variant.');
        }

        // Get customer group ID - use provided or get from session, fallback to B2C
        if ($customerGroupId === null) {
            $customerGroupId = Session::get('customer_group_id', null);
        }

        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);

        // Get current cart to check existing quantities
        $cart = $this->getCartItems($request);
        $cartKey = $this->getCartKey($productId, $customerGroupId);

        // Calculate total quantity that will be in cart after adding
        $currentQuantity = isset($cart[$cartKey]) ? (int) $cart[$cartKey]['quantity'] : 0;
        $newTotalQuantity = $currentQuantity + $quantity;

        if (isset($cart[$cartKey])) {
            // Update quantity if item already exists
            $cart[$cartKey]['quantity'] = $newTotalQuantity;
            // Ensure customer_group_id is set
            $cart[$cartKey]['customer_group_id'] = $customerGroupId;
        } else {
            // Add new item with the calculated total quantity
            $cart[$cartKey] = [
                'product_id' => $productId,
                'quantity' => $newTotalQuantity,
                'customer_group_id' => $customerGroupId,
            ];
        }

        // Save to database if authenticated, otherwise to session
        $user = Auth::user();
        if ($user && $user->customer_id) {
            $this->saveCartItemsToDatabase($cart, $user->customer_id, $request);
        } else {
            Session::put('cart', $cart);
        }

        // Get currency from session for proper price calculation
        $currencyCode = Session::get('currency', 'RON');
        $currency = Currency::where('code', $currencyCode)
            ->where('status', true)
            ->first();

        // If no currency found, use RON as fallback
        if (!$currency) {
            $currency = Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
        }

        return $this->formatCartForDisplay($currency, $customerGroupId, $request);
    }

    /**
     * Update quantity of a cart item.
     *
     * @param string $cartKey
     * @param int $quantity
     * @param Request|null $request Optional request object for country detection
     * @return array
     */
    public function updateQuantity(string $cartKey, int $quantity, ?Request $request = null): array
    {
        if ($quantity <= 0) {
            return $this->removeFromCart($cartKey, $request);
        }

        $cart = $this->getCartItems($request);

        if (!isset($cart[$cartKey])) {
            throw new \Exception('Cart item not found');
        }

        $product = Product::where('id', $cart[$cartKey]['product_id'])
            ->where('status', true)
            ->firstOrFail();

        $cart[$cartKey]['quantity'] = $quantity;

        // Save to database if authenticated, otherwise to session
        $user = Auth::user();
        if ($user && $user->customer_id) {
            $this->saveCartItemsToDatabase($cart, $user->customer_id, $request);
        } else {
            Session::put('cart', $cart);
        }

        // Get currency and customer group from session for proper price calculation
        $currencyCode = Session::get('currency', 'RON');
        $currency = Currency::where('code', $currencyCode)
            ->where('status', true)
            ->first();

        $customerGroupId = Session::get('customer_group_id', null);

        // If no currency found, use RON as fallback
        if (!$currency) {
            $currency = Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
        }

        return $this->formatCartForDisplay($currency, $customerGroupId, $request);
    }

    /**
     * Remove a product from the cart.
     *
     * @param string $cartKey
     * @param Request|null $request Optional request object for country detection
     * @return array
     */
    public function removeFromCart(string $cartKey, ?Request $request = null): array
    {
        $cart = $this->getCartItems($request);

        if (isset($cart[$cartKey])) {
            unset($cart[$cartKey]);

            // Save to database if authenticated, otherwise to session
            $user = Auth::user();
            if ($user && $user->customer_id) {
                $this->saveCartItemsToDatabase($cart, $user->customer_id, $request);
            } else {
                Session::put('cart', $cart);
            }
        }

        // Get currency and customer group from session for proper price calculation
        $currencyCode = Session::get('currency', 'RON');
        $currency = Currency::where('code', $currencyCode)
            ->where('status', true)
            ->first();

        $customerGroupId = Session::get('customer_group_id', null);

        // If no currency found, use RON as fallback
        if (!$currency) {
            $currency = Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
        }

        return $this->formatCartForDisplay($currency, $customerGroupId, $request);
    }

    /**
     * Clear all items from the cart.
     *
     * @return void
     */
    public function clearCart(): void
    {
        $user = Auth::user();
        if ($user && $user->customer_id) {
            $cart = Cart::where('customer_id', $user->customer_id)->where('status', 'active')->first();
            if ($cart) {
                CartItem::where('cart_id', $cart->id)->delete();
                $cart->total_amount = 0;
                $cart->save();
            }
        } else {
            Session::forget('cart');
        }
    }

    /**
     * Merge session cart with database cart when user logs in.
     *
     * @param int $customerId
     * @return void
     */
    public function mergeSessionCartWithDatabase(int $customerId): void
    {
        $sessionCart = Session::get('cart', []);

        if (empty($sessionCart)) {
            // No session cart to merge, just load database cart
            return;
        }

        // Get customer's customer_group_id
        $customer = Customer::find($customerId);
        if (!$customer) {
            return;
        }

        $customerGroupId = $customer->customer_group_id;

        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);

        // Get existing database cart
        $cart = Cart::firstOrCreate(
            ['customer_id' => $customerId, 'status' => 'active'],
            [
                'customer_group_id' => $customerGroupId,
                'status' => 'active',
                'session_id' => Session::getId(),
                'client_ip' => $this->getClientIp(null),
            ]
        );

        // Update session_id and client_ip if not set
        $needsSave = false;
        if (!$cart->session_id) {
            $cart->session_id = Session::getId();
            $needsSave = true;
        }
        $clientIp = $this->getClientIp(null);
        if (!$cart->client_ip || ($clientIp && $cart->client_ip !== $clientIp)) {
            $cart->client_ip = $clientIp;
            $needsSave = true;
        }

        // Update cart's customer_group_id if needed
        if ($cart->customer_group_id !== $customerGroupId) {
            $cart->customer_group_id = $customerGroupId;
            $needsSave = true;
        }

        if ($needsSave) {
            $cart->save();
        }

        // Get existing database cart items
        $dbCartItems = CartItem::where('cart_id', $cart->id)->get();
        $dbCart = [];
        foreach ($dbCartItems as $item) {
            $cartKey = $this->getCartKey($item->product_id, $customerGroupId);
            $dbCart[$cartKey] = [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'customer_group_id' => $customerGroupId,
            ];
        }

        // Merge session cart into database cart
        // Update all session items to use customer's customer_group_id
        foreach ($sessionCart as $cartKey => $sessionItem) {
            // Update customer_group_id to match the logged-in customer's group
            $sessionItem['customer_group_id'] = $customerGroupId;

            // Generate new cart key with correct customer_group_id
            $newCartKey = $this->getCartKey($sessionItem['product_id'], $customerGroupId);

            if (isset($dbCart[$newCartKey])) {
                // Item exists in database cart with same product and group - add quantities
                $dbCart[$newCartKey]['quantity'] += $sessionItem['quantity'];
            } else {
                // New item from session - add to database cart with updated customer_group_id
                $dbCart[$newCartKey] = $sessionItem;
            }
        }

        // Save merged cart to database
        $this->saveCartItemsToDatabase($dbCart, $customerId, null);

        // Clear session cart after merging
        Session::forget('cart');
    }

    /**
     * Load cart from database to session (for backwards compatibility or migration).
     *
     * @param int $customerId
     * @param Request|null $request Optional request object for IP detection
     * @return void
     */
    public function loadCartFromDatabaseToSession(int $customerId, ?Request $request = null): void
    {
        $cart = $this->getCartItemsFromDatabase($customerId, $request);
        Session::put('cart', $cart);
    }

    /**
     * Get cart summary (total items, total price).
     *
     * @param Currency $currency
     * @param int|null $customerGroupId
     * @param Request|null $request Optional request object for country detection
     * @return array
     */
    public function getCartSummary(Currency $currency, ?int $customerGroupId = null, ?Request $request = null, ?int $shippingCountryId = null): array
    {
        $cartItems = $this->getCartItems($request);
        $totalItems = 0;
        $totalExclVat = 0;
        $totalInclVat = 0;

        // Get customer group if ID is provided, otherwise use B2C for unauthenticated users
        $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);

        // Determine if we should show prices with or without VAT based on customer group
        // B2C/unlogged see prices with VAT, B2B see prices without VAT
        $showVat = $this->priceService->shouldShowVat($customerGroupId);
        $isB2B = !$showVat;
        $vatIncluded = $showVat;

        // Use shipping country ID if provided, otherwise auto-detect country for VAT calculation (only used for B2C)
        // For B2B, VAT is always 0% (reverse charge)
        $countryId = null;
        if (!$isB2B) {
            // Priority: Use shipping address country if provided, otherwise use geolocation
            $countryId = $shippingCountryId ?? $this->countryDetectionService->getCountryId($request, $customerGroupId);
        }

        // Get default VAT rate for detected country (for B2C)
        // For B2B, VAT rate is always 0%
        $defaultVatRate = 0.0;
        if (!$isB2B && $countryId) {
            // Get VAT rate for this country
            $defaultVatRate = VatRate::where('country_id', $countryId)
                ->orderBy('rate', 'desc')
                ->value('rate');

            // Throw error if VAT rate not found
            if ($defaultVatRate === null) {
                $country = \App\Models\Country::find($countryId);
                $countryName = $country ? $country->name : "ID: {$countryId}";
                throw new \Exception("VAT rate not found for country: {$countryName}");
            }

            $defaultVatRate = (float) $defaultVatRate;
        }

        foreach ($cartItems as $item) {
            $product = Product::find($item['product_id']);
            if (!$product || !$product->status) {
                continue;
            }

            $itemQuantity = $item['quantity'];
            $totalItems += $itemQuantity;

            // Use customer_group_id from item, or fallback to provided/default
            $itemCustomerGroupId = $item['customer_group_id'] ?? $customerGroupId;
            $itemCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($itemCustomerGroupId);

            // Get price for this quantity and customer group using centralized price service
            $priceInfo = $this->priceService->getPriceInfo(
                $product,
                $currency,
                $itemQuantity,
                $itemCustomerGroupId,
                $countryId,
                $request
            );

            // Add to totals using display prices (already calculated for customer group)
            $totalExclVat += $priceInfo['total_price_excl_vat'];
            $totalInclVat += $showVat ? $priceInfo['total_price_incl_vat'] : $priceInfo['total_price_excl_vat'];
        }

        // For B2B customers (reverse charge), VAT rate is always 0%
        // For B2C customers, use the default VAT rate for detected country
        $vatRate = $isB2B ? 0.0 : $defaultVatRate;

        return [
            'total_items' => $totalItems,
            'total_excl_vat' => round($totalExclVat, 2),
            'total_incl_vat' => round($showVat ? $totalInclVat : $totalExclVat, 2),
            'vat_rate' => $vatRate,
            'vat_included' => $vatIncluded,
        ];
    }

    /**
     * Format cart items for frontend display.
     *
     * @param Currency $currency
     * @param int|null $customerGroupId
     * @param Request|null $request Optional request object for country detection
     * @return array
     */
    public function formatCartForDisplay(?Currency $currency = null, ?int $customerGroupId = null, ?Request $request = null, ?int $shippingCountryId = null): array
    {
        $cartItems = $this->getCartItems($request);
        $formattedItems = [];

        if (!$currency) {
            $currencyCode = Session::get('currency', 'RON');
            $currency = Currency::where('code', $currencyCode)
                ->where('status', true)
                ->firstOrFail();
        }

        // Get customer group ID - use provided or get from session, fallback to B2C
        if ($customerGroupId === null) {
            $customerGroupId = Session::get('customer_group_id', null);
        }

        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);

        // Determine if this is B2B
        $isB2B = !$this->priceService->shouldShowVat($customerGroupId);

        // Use shipping country ID if provided, otherwise auto-detect country for VAT calculation (only used for B2C)
        // For B2B, VAT is always 0% (reverse charge)
        $countryId = null;
        if (!$isB2B) {
            // Priority: Use shipping address country if provided, otherwise use geolocation
            $countryId = $shippingCountryId ?? $this->countryDetectionService->getCountryId($request, $customerGroupId);
        }

        foreach ($cartItems as $cartKey => $item) {
            $product = Product::with(['images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])->find($item['product_id']);

            if (!$product || !$product->status) {
                continue;
            }

            // Use customer_group_id from item, or fallback to provided/default
            $itemCustomerGroupId = $item['customer_group_id'] ?? $customerGroupId;
            $itemCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($itemCustomerGroupId);

            $itemQuantity = $item['quantity'];

            // Get complete price information using centralized price service
            $priceInfo = $this->priceService->getPriceInfo(
                $product,
                $currency,
                $itemQuantity,
                $itemCustomerGroupId,
                $countryId,
                $request
            );

            // Use display prices already calculated by backend for customer group
            $unitPrice = $priceInfo['unit_price_display'];
            $totalPrice = $priceInfo['total_price_display'];
            $vatIncluded = $priceInfo['show_vat'];

            // Get image
            $imageUrl = null;
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images->first() && $product->images->first()->image_url) {
                $imageUrl = $product->images->first()->image_url;
            }

            // Get price tier information for current quantity
            // This matches the logic in ProductPriceService::calculatePriceRon
            // which finds the tier with the highest min_quantity <= quantity
            $priceTiers = $product->getQuantityPriceTiers($itemCustomerGroupId);
            $currentTier = null;
            $tierIndex = 0;
            $nextTier = null;
            $itemsToNextTier = null;

            if (!empty($priceTiers)) {
                // Find which tier applies to current quantity
                // Iterate in reverse to match calculatePriceRon logic (highest min_quantity <= quantity)
                $reversedTiers = array_reverse($priceTiers, true);
                $currentTierOriginalIndex = null;

                foreach ($reversedTiers as $originalIndex => $tier) {
                    if ($itemQuantity >= $tier['min_quantity']) {
                        // Check if quantity is within this tier's range
                        if ($tier['max_quantity'] === null || $itemQuantity <= $tier['max_quantity']) {
                            $currentTier = $tier;
                            $tierIndex = $originalIndex + 1; // 1-based index for display
                            $currentTierOriginalIndex = $originalIndex;
                            break;
                        }
                    }
                }

                // Find next tier (if exists) - next tier has higher min_quantity
                // Since tiers are sorted by min_quantity ascending, next tier is at originalIndex + 1
                if ($currentTierOriginalIndex !== null && $currentTierOriginalIndex < count($priceTiers) - 1) {
                    $nextTier = $priceTiers[$currentTierOriginalIndex + 1];
                    // Calculate how many items needed to reach next tier
                    if ($nextTier && $nextTier['min_quantity'] > $itemQuantity) {
                        $itemsToNextTier = $nextTier['min_quantity'] - $itemQuantity;
                    }
                }
            }

            // Format tier label
            $tierLabel = null;
            if ($currentTier) {
                if ($currentTier['max_quantity'] !== null) {
                    $tierLabel = "{$currentTier['min_quantity']}-{$currentTier['max_quantity']}";
                } else {
                    $tierLabel = "{$currentTier['min_quantity']}+";
                }
            }

            // Format all tiers with prices for display
            // This uses the same logic as ProductPriceService::getPriceTiers()
            $formattedTiers = [];
            if (!empty($priceTiers)) {
                // Determine if this is a B2B customer
                $itemIsB2B = !$this->priceService->shouldShowVat($itemCustomerGroupId);

                // For B2B: TVA is always 0% (reverse charge)
                // For B2C: Get VAT rate based on detected country
                if ($itemIsB2B) {
                    $vatRate = 0.0;
                } else {
                    // B2C: Get VAT rate for detected country
                    $vatRate = $this->priceService->getVatRate($product, $countryId, null, $request, $itemCustomerGroupId);
                }

                foreach ($priceTiers as $index => $tier) {
                    // price_ron in database is stored WITHOUT VAT
                    $tierPriceRonExclVat = (float) $tier['price_ron'];

                    // For B2B: price stays the same (no VAT)
                    // For B2C: add VAT to base price
                    if ($itemIsB2B) {
                        $tierPriceRonInclVat = $tierPriceRonExclVat;
                    } else {
                        $tierPriceRonInclVat = $this->priceService->calculatePriceInclVat($tierPriceRonExclVat, $vatRate);
                    }

                    // Convert to target currency
                    $tierPriceInclVat = round($this->priceService->convertToCurrency($tierPriceRonInclVat, $currency), 2);
                    $tierPriceExclVat = round($this->priceService->convertToCurrency($tierPriceRonExclVat, $currency), 2);

                    // Format quantity range
                    $quantityRange = $tier['max_quantity'] !== null
                        ? "{$tier['min_quantity']}-{$tier['max_quantity']}"
                        : "{$tier['min_quantity']}+";

                    $formattedTiers[] = [
                        'tier_index' => $index + 1,
                        'min_quantity' => $tier['min_quantity'],
                        'max_quantity' => $tier['max_quantity'],
                        'quantity_range' => $quantityRange,
                        'price_excl_vat' => $tierPriceExclVat,
                        'price_incl_vat' => $tierPriceInclVat,
                        'is_current' => ($index + 1) === $tierIndex,
                    ];
                }
            }

            $formattedItems[] = [
                'cart_key' => $cartKey,
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'ean' => $product->ean,
                'image' => $imageUrl,
                'quantity' => $itemQuantity,
                'stock_quantity' => $product->stock_quantity,
                'unit_price_raw' => $unitPrice,
                'total_price_raw' => $totalPrice,
                'unit_price_excl_vat' => $priceInfo['unit_price_excl_vat'],
                'unit_price_incl_vat' => $priceInfo['unit_price_incl_vat'],
                'total_price_excl_vat' => $priceInfo['total_price_excl_vat'],
                'total_price_incl_vat' => $priceInfo['total_price_incl_vat'],
                'vat_rate' => $priceInfo['vat_rate'],
                'vat_included' => $vatIncluded,
                'price_tier' => $currentTier ? [
                    'tier_index' => $tierIndex,
                    'min_quantity' => $currentTier['min_quantity'],
                    'max_quantity' => $currentTier['max_quantity'],
                    'label' => $tierLabel,
                ] : null,
                'price_tiers' => $formattedTiers,
                'items_to_next_tier' => $itemsToNextTier,
            ];
        }

        $summary = $this->getCartSummary($currency, $customerGroupId, $request, $shippingCountryId);

        return [
            'items' => $formattedItems,
            'summary' => $summary,
        ];
    }


    /**
     * Generate a unique cart key for a product and customer group combination.
     *
     * @param int $productId
     * @param int|null $customerGroupId
     * @return string
     */
    private function getCartKey(int $productId, ?int $customerGroupId = null): string
    {
        return $customerGroupId
            ? "{$productId}_{$customerGroupId}"
            : "{$productId}_null";
    }

    /**
     * Calculate and update total_amount for a cart.
     *
     * @param Cart $cart
     * @param Request|null $request Optional request object for price calculation
     * @return void
     */
    private function updateCartTotalAmount(Cart $cart, ?Request $request = null): void
    {
        // Get currency from session
        $currencyCode = Session::get('currency', 'RON');
        $currency = Currency::where('code', $currencyCode)
            ->where('status', true)
            ->first();

        // If no currency found, use RON as fallback
        if (!$currency) {
            $currency = Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
        }

        // Get customer group ID from cart
        $customerGroupId = $cart->customer_group_id;
        if (!$customerGroupId && $cart->customer_id) {
            $customer = Customer::find($cart->customer_id);
            $customerGroupId = $customer->customer_group_id ?? null;
        }

        // Get cart summary to calculate total amount
        $summary = $this->getCartSummary($currency, $customerGroupId, $request);

        // Use the displayed total (total_incl_vat for B2C, total_excl_vat for B2B)
        $totalAmount = $summary['vat_included']
            ? $summary['total_incl_vat']
            : $summary['total_excl_vat'];

        $cart->total_amount = $totalAmount;
        $cart->save();
    }

    /**
     * Get client IP address from request.
     *
     * @param Request|null $request
     * @return string|null
     */
    private function getClientIp(?Request $request = null): ?string
    {
        if ($request) {
            return $request->ip();
        }

        // Fallback: try to get IP from current request if available
        try {
            $currentRequest = request();
            if ($currentRequest) {
                return $currentRequest->ip();
            }
        } catch (\Exception $e) {
            // Ignore exceptions
        }

        return null;
    }
}
