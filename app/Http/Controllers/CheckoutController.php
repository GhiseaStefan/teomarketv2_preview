<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\Currency;
use App\Models\PaymentMethod;
use App\Models\ShippingMethod;
use App\Services\CartService;
use App\Services\CountryDetectionService;
use App\Services\OrderService;
use App\Services\ProductPriceService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    protected CartService $cartService;
    protected OrderService $orderService;
    protected ProductPriceService $priceService;

    public function __construct(CartService $cartService, OrderService $orderService, ProductPriceService $priceService)
    {
        $this->cartService = $cartService;
        $this->orderService = $orderService;
        $this->priceService = $priceService;
    }

    /**
     * Display the order details page (step 2 of checkout).
     */
    public function orderDetails(Request $request)
    {
        // Get current currency from session, cookie, or default to RON
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';

        // Restore currency to session if it was only in cookie
        if (!$request->session()->has('currency') && $currentCurrencyCode !== 'RON') {
            $request->session()->put('currency', $currentCurrencyCode);
        }

        // Validate currency exists and is active, fallback to RON if invalid
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->first();

        if (!$currentCurrency) {
            // Fallback to RON if currency is invalid or inactive
            $currentCurrency = Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
            $request->session()->put('currency', 'RON');
        }

        $customerGroupId = $request->session()->get('customer_group_id', null);

        // Get countries for address form
        $countries = Country::where('status', true)
            ->orderBy('name')
            ->get()
            ->map(function ($country) {
                return [
                    'id' => $country->id,
                    'name' => $country->name,
                    'iso_code_2' => $country->iso_code_2,
                ];
            });

        // Detect country from IP geolocation for default selection in address forms
        $countryDetectionService = app(CountryDetectionService::class);
        $detectedCountryId = $countryDetectionService->getCountryId($request);

        // Get user's addresses if authenticated, or guest addresses from session
        $addresses = collect();
        $defaultBillingAddress = null;
        $defaultShippingAddress = null;
        $shippingAddresses = collect();

        // Get billing country ID from session (if user previously selected an address)
        $billingCountryIdFromSession = $request->session()->get('checkout_billing_country_id');
        // Get shipping country ID from session (for shipping address selection)
        $shippingCountryIdFromSession = $request->session()->get('checkout_shipping_country_id');

        // Initialize billing country ID (will be set based on address or session)
        $billingCountryId = null;

        if ($request->user()) {
            $user = $request->user()->load('customer.addresses');
            $customer = $user->customer;
            if ($customer) {
                // Get headquarters address as default billing address (it's used for billing)
                $headquartersAddress = $customer->addresses()->where('address_type', 'headquarters')->first();
                if ($headquartersAddress) {
                    $defaultBillingAddress = [
                        'id' => $headquartersAddress->id,
                        'first_name' => $customer->company_name ?? '',
                        'last_name' => '',
                        'phone' => $customer->phone ?? '',
                        'address_line_1' => $headquartersAddress->address_line_1,
                        'address_line_2' => $headquartersAddress->address_line_2,
                        'city' => $headquartersAddress->city,
                        'county_name' => $headquartersAddress->county_name,
                        'county_code' => $headquartersAddress->county_code,
                        'country_id' => $headquartersAddress->country_id,
                        'zip_code' => $headquartersAddress->zip_code,
                        'is_default' => true,
                        'is_headquarters' => true,
                    ];

                    // Always use country from headquarters address for VAT calculation
                    // Update session to match the default billing address country IMMEDIATELY
                    $billingCountryId = $headquartersAddress->country_id;
                    $request->session()->put('checkout_billing_country_id', $billingCountryId);
                } else {
                    // No headquarters address - try to get from first billing address
                    $firstBillingAddress = $customer->addresses()->where('address_type', 'billing')->first();
                    if ($firstBillingAddress) {
                        // Update session with first billing address country
                        if ($billingCountryIdFromSession !== $firstBillingAddress->country_id) {
                            $request->session()->put('checkout_billing_country_id', $firstBillingAddress->country_id);
                        }
                        $billingCountryId = $firstBillingAddress->country_id;
                    } else {
                        // Fallback to session if no billing address found
                        $billingCountryId = $billingCountryIdFromSession;
                    }
                }

                // Get preferred shipping address as default shipping address
                $preferredShippingAddress = $customer->addresses()->where('address_type', 'shipping')
                    ->where('is_preferred', true)
                    ->first();

                if (!$preferredShippingAddress) {
                    // If no preferred, get first shipping address
                    $preferredShippingAddress = $customer->addresses()->where('address_type', 'shipping')->first();
                }

                if ($preferredShippingAddress) {
                    $defaultShippingAddress = [
                        'id' => $preferredShippingAddress->id,
                        'first_name' => $preferredShippingAddress->first_name,
                        'last_name' => $preferredShippingAddress->last_name,
                        'phone' => $preferredShippingAddress->phone,
                        'address_line_1' => $preferredShippingAddress->address_line_1,
                        'address_line_2' => $preferredShippingAddress->address_line_2,
                        'city' => $preferredShippingAddress->city,
                        'county_name' => $preferredShippingAddress->county_name,
                        'county_code' => $preferredShippingAddress->county_code,
                        'country_id' => $preferredShippingAddress->country_id,
                        'zip_code' => $preferredShippingAddress->zip_code,
                        'is_preferred' => true,
                        'is_default' => true,
                    ];

                    // If session has a country ID but it doesn't match the preferred address, update session
                    // This ensures that when user returns to order-details, TVA matches the preferred address
                    if ($shippingCountryIdFromSession !== null && $shippingCountryIdFromSession !== $preferredShippingAddress->country_id) {
                        // Clear session country ID to use preferred address country
                        $request->session()->forget('checkout_shipping_country_id');
                        $shippingCountryIdFromSession = null;
                    }

                    // Use country from shipping address for VAT calculation
                    $shippingCountryId = $shippingCountryIdFromSession ?? $preferredShippingAddress->country_id;
                } else {
                    $shippingCountryId = $shippingCountryIdFromSession;
                }

                // Get all shipping addresses for selection
                $allShippingAddresses = $customer->addresses()->where('address_type', 'shipping')->get();

                // Map shipping addresses for selection
                $shippingAddresses = $allShippingAddresses->map(function ($address) {
                    return [
                        'id' => $address->id,
                        'first_name' => $address->first_name,
                        'last_name' => $address->last_name,
                        'phone' => $address->phone,
                        'address_line_1' => $address->address_line_1,
                        'address_line_2' => $address->address_line_2,
                        'city' => $address->city,
                        'county_name' => $address->county_name,
                        'county_code' => $address->county_code,
                        'country_id' => $address->country_id,
                        'zip_code' => $address->zip_code,
                        'is_preferred' => (bool) ($address->is_preferred ?? false),
                        'address_type' => $address->address_type,
                    ];
                });

                // Get only billing addresses for selection (excluding headquarters which is already in defaultBillingAddress)
                $billingAddresses = $customer->addresses()->where('address_type', 'billing')->get();

                // Map addresses for selection
                $addresses = $billingAddresses->map(function ($address) {
                    return [
                        'id' => $address->id,
                        'first_name' => $address->first_name,
                        'last_name' => $address->last_name,
                        'phone' => $address->phone,
                        'address_line_1' => $address->address_line_1,
                        'address_line_2' => $address->address_line_2,
                        'city' => $address->city,
                        'county_name' => $address->county_name,
                        'county_code' => $address->county_code,
                        'country_id' => $address->country_id,
                        'zip_code' => $address->zip_code,
                        'is_preferred' => (bool) ($address->is_preferred ?? false),
                        'address_type' => $address->address_type,
                    ];
                });
            }
        } else {
            // Guest user: get addresses from session
            $guestBillingAddress = $request->session()->get('checkout_billing_address');
            $guestShippingAddress = $request->session()->get('checkout_shipping_address');

            if ($guestBillingAddress) {
                $defaultBillingAddress = array_merge($guestBillingAddress, [
                    'id' => -1, // Negative ID for guest billing address
                    'is_default' => true,
                ]);

                // Always use country from guest billing address for VAT calculation
                // Update session to match the guest billing address country IMMEDIATELY
                if (isset($guestBillingAddress['country_id'])) {
                    $billingCountryId = $guestBillingAddress['country_id'];
                    $request->session()->put('checkout_billing_country_id', $billingCountryId);
                } else {
                    $billingCountryId = $billingCountryIdFromSession;
                }
            } else {
                $billingCountryId = $billingCountryIdFromSession;
            }

            if ($guestShippingAddress) {
                $defaultShippingAddress = array_merge($guestShippingAddress, [
                    'id' => -2, // Negative ID for guest shipping address
                    'is_default' => true,
                    'address_type' => 'shipping',
                ]);
                $shippingAddresses = collect([$defaultShippingAddress]);

                // If session has a country ID but it doesn't match the guest address, update session
                if ($shippingCountryIdFromSession !== null && isset($guestShippingAddress['country_id']) && $shippingCountryIdFromSession !== $guestShippingAddress['country_id']) {
                    // Clear session country ID to use guest address country
                    $request->session()->forget('checkout_shipping_country_id');
                    $shippingCountryIdFromSession = null;
                }

                // Use country from guest shipping address for VAT calculation
                $shippingCountryId = $shippingCountryIdFromSession ?? ($guestShippingAddress['country_id'] ?? null);
            } else {
                $shippingCountryId = $shippingCountryIdFromSession;
            }
        }

        // Format cart with shipping country ID for VAT calculation (shipping country determines VAT)
        // Only use shipping address country - no fallbacks to billing address
        $countryIdForVat = null;
        if (isset($defaultShippingAddress) && isset($defaultShippingAddress['country_id'])) {
            // Use shipping address country for VAT
            $countryIdForVat = $defaultShippingAddress['country_id'];
        }
        // If no shipping address country, countryIdForVat remains null
        // This will trigger auto-detection in ProductPriceService or throw error if required

        $cartData = $this->cartService->formatCartForDisplay($currentCurrency, $customerGroupId, $request, $countryIdForVat);

        // Helper function to map shipping methods with currency conversion
        $priceService = $this->priceService;
        $mapShippingMethod = function ($method) use ($currentCurrency, $priceService) {
            // Get description from configs (still stored in configs)
            $descriptionConfig = $method->configs->firstWhere('config_key', 'description');
            $description = $descriptionConfig ? $descriptionConfig->config_value : null;

            // Convert cost from RON to current currency
            $costRon = (float) $method->cost;
            $costInCurrency = $priceService->convertToCurrency($costRon, $currentCurrency);

            return [
                'id' => $method->id,
                'name' => $method->name,
                'type' => $method->type->value,
                'description' => $description,
                'cost' => round($costInCurrency, 2),
                'estimated_days' => $method->estimated_days ? (int) $method->estimated_days : null,
            ];
        };

        // Get courier shipping methods
        $courierShippingMethods = ShippingMethod::with('configs')
            ->where('type', \App\Enums\ShippingMethodType::COURIER->value)
            ->get()
            ->map($mapShippingMethod);

        // Get pickup shipping methods
        $pickupShippingMethods = ShippingMethod::with('configs')
            ->where('type', \App\Enums\ShippingMethodType::PICKUP->value)
            ->get()
            ->map($mapShippingMethod);

        // Get active payment methods
        $paymentMethods = PaymentMethod::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'code' => $method->code,
                ];
            });

        // Get pickup data from session if exists (for restoring pickup address on page reload)
        $pickupDataFromSession = $request->session()->get('pickup_data');

        return Inertia::render('Checkout/OrderDetails', [
            'cart' => $cartData,
            'countries' => $countries,
            'detectedCountryId' => $detectedCountryId,
            'addresses' => $addresses,
            'defaultBillingAddress' => $defaultBillingAddress,
            'defaultShippingAddress' => $defaultShippingAddress,
            'shippingAddresses' => $shippingAddresses,
            'courierShippingMethods' => $courierShippingMethods,
            'pickupShippingMethods' => $pickupShippingMethods,
            'paymentMethods' => $paymentMethods,
            'pickupDataFromSession' => $pickupDataFromSession,
        ]);
    }

    /**
     * Save pickup data to session (for testing).
     */
    public function savePickupData(Request $request)
    {
        $request->validate([
            'courier_data' => 'required|array',
            'shipping_address' => 'required|array',
        ]);

        // Save to session for use when creating the order
        $request->session()->put('pickup_data', [
            'courier_data' => $request->courier_data,
            'shipping_address' => $request->shipping_address,
        ]);

        return back();
    }

    /**
     * Update cart prices based on shipping country.
     */
    public function updateCartForShippingCountry(Request $request)
    {
        $request->validate([
            'country_id' => 'required|integer|exists:countries,id',
        ]);

        // Save shipping country ID to session for future requests
        $request->session()->put('checkout_shipping_country_id', $request->country_id);

        // Get current currency
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->firstOrFail();

        $customerGroupId = $request->session()->get('customer_group_id', null);

        // Format cart with shipping country ID for VAT calculation
        $cartData = $this->cartService->formatCartForDisplay($currentCurrency, $customerGroupId, $request, $request->country_id);

        return response()->json(['cart' => $cartData]);
    }

    /**
     * Update cart prices based on billing country.
     */
    public function updateCartForBillingCountry(Request $request)
    {
        $request->validate([
            'country_id' => 'required|integer|exists:countries,id',
        ]);

        // Save billing country ID to session for future requests
        $request->session()->put('checkout_billing_country_id', $request->country_id);

        // Get current currency
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';
        $currentCurrency = Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->firstOrFail();

        $customerGroupId = $request->session()->get('customer_group_id', null);

        // Format cart with billing country ID for VAT calculation
        $cartData = $this->cartService->formatCartForDisplay($currentCurrency, $customerGroupId, $request, $request->country_id);

        return response()->json(['cart' => $cartData]);
    }

    /**
     * Save guest contact data (email and phone) to session.
     */
    public function saveGuestContact(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $request->session()->put('checkout_guest_email', $request->email);
        if ($request->phone) {
            $request->session()->put('checkout_guest_phone', $request->phone);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Save guest address to session.
     */
    public function saveGuestAddress(Request $request)
    {
        $request->validate([
            'type' => 'required|in:billing,shipping',
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'address_line_1' => 'required|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'city' => 'required|string|max:255',
            'county_name' => 'nullable|string|max:255',
            'county_code' => 'nullable|string|max:10',
            'country_id' => 'required|integer|exists:countries,id',
            'zip_code' => 'required|string|max:20',
        ]);

        $addressData = [
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'phone' => $request->phone,
            'email' => $request->email ?? $request->session()->get('checkout_guest_email'),
            'address_line_1' => $request->address_line_1,
            'address_line_2' => $request->address_line_2,
            'city' => $request->city,
            'county_name' => $request->county_name,
            'county_code' => $request->county_code,
            'country_id' => $request->country_id,
            'zip_code' => $request->zip_code,
        ];

        $sessionKey = $request->type === 'billing'
            ? 'checkout_billing_address'
            : 'checkout_shipping_address';

        $request->session()->put($sessionKey, $addressData);

        // Update email in address if guest email exists in session (for consistency)
        $guestEmail = $request->session()->get('checkout_guest_email');
        if ($guestEmail && !isset($addressData['email'])) {
            $addressData['email'] = $guestEmail;
            $request->session()->put($sessionKey, $addressData);
        }

        // If billing address, also update billing country ID in session for VAT calculation
        if ($request->type === 'billing') {
            $request->session()->put('checkout_billing_country_id', $addressData['country_id']);
        }

        return back();
    }

    /**
     * Submit order (create order from cart).
     */
    public function submitOrder(Request $request)
    {
        // For guest users, addresses are in session, not in request
        $user = $request->user();
        $isGuest = !$user || !$user->customer_id;

        $validationRules = [
            'idempotency_key' => 'nullable|uuid',
            'shipping_method_id' => 'required|integer',
            'payment_method_id' => 'required|integer',
            'shipping_address_id' => 'nullable|integer', // Required for courier, not for pickup
        ];

        // Only require billing_address_id for authenticated users
        if (!$isGuest) {
            $validationRules['billing_address_id'] = 'required|integer';
        }

        $request->validate($validationRules);

        try {
            $order = $this->orderService->createOrderFromCart($request);

            // Store order ID in session flash (one-time use)
            $request->session()->flash('order_id', $order->id);

            return redirect()->route('checkout.order-placed');
        } catch (\Exception $e) {
            return back()->withErrors([
                'checkout' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Display the order placed page (step 3 of checkout).
     */
    public function orderPlaced(Request $request)
    {
        // Get order ID from session flash (one-time use)
        $orderId = $request->session()->get('order_id');

        if (!$orderId) {
            // If no order_id in session (user refreshed or copied link), redirect appropriately
            if ($request->user()) {
                // Authenticated user: redirect to order history
                return redirect()->route('orders.index');
            } else {
                // Guest user: redirect to home
                return redirect()->route('home');
            }
        }

        // Load order with all necessary relationships
        $order = \App\Models\Order::with([
            'products.product.images',
            'shippingAddress',
            'billingAddress',
            'shipping.shippingMethod',
            'paymentMethod',
        ])->find($orderId);

        if (!$order) {
            // Order not found, redirect to home
            return redirect()->route('home');
        }

        // Get current currency
        $currentCurrencyCode = $request->session()->get('currency')
            ?? $request->cookie('currency')
            ?? 'RON';
        $currentCurrency = \App\Models\Currency::where('code', $currentCurrencyCode)
            ->where('status', true)
            ->first();

        if (!$currentCurrency) {
            $currentCurrency = \App\Models\Currency::where('code', 'RON')
                ->where('status', true)
                ->firstOrFail();
        }

        // Format order products with images
        $formattedProducts = $order->products->map(function ($orderProduct) {
            $product = $orderProduct->product;
            $imageUrl = null;

            if ($product) {
                if ($product->main_image_url) {
                    $imageUrl = $product->main_image_url;
                } elseif ($product->images->first() && $product->images->first()->image_url) {
                    $imageUrl = $product->images->first()->image_url;
                }
            }

            // Calculate price in order currency
            $unitPrice = $orderProduct->unit_price_currency;
            $totalPrice = $orderProduct->total_currency_incl_vat;

            return [
                'id' => $orderProduct->product_id,
                'name' => $orderProduct->name,
                'sku' => $orderProduct->sku,
                'quantity' => $orderProduct->quantity,
                'unit_price' => (float) $unitPrice,
                'total_price' => (float) $totalPrice,
                'image' => $imageUrl,
            ];
        })->toArray();

        // Format shipping address
        $shippingAddress = null;
        if ($order->shippingAddress) {
            $shippingAddress = [
                'first_name' => $order->shippingAddress->first_name,
                'last_name' => $order->shippingAddress->last_name,
                'phone' => $order->shippingAddress->phone,
                'address_line_1' => $order->shippingAddress->address_line_1,
                'address_line_2' => $order->shippingAddress->address_line_2,
                'city' => $order->shippingAddress->city,
                'county_name' => $order->shippingAddress->county_name,
                'zip_code' => $order->shippingAddress->zip_code,
                'country' => $order->shippingAddress->country ? $order->shippingAddress->country->name : null,
            ];
        }

        // Calculate estimated delivery date
        $estimatedDeliveryDate = null;
        if ($order->shipping && $order->shipping->shippingMethod) {
            $estimatedDays = $order->shipping->shippingMethod->estimated_days;
            if ($estimatedDays) {
                $estimatedDeliveryDate = now()->addDays($estimatedDays)->format('Y-m-d');
            }
        }

        // Get shop contact information
        $shopInfo = \App\Models\ShopInfo::first();
        $contactPhone = null; // Phone field not available in ShopInfo model yet
        $contactEmail = $shopInfo?->email_contact ?? null;

        // Get shipping cost in order currency
        $shippingCost = 0.0;
        if ($order->shipping) {
            // Use shipping cost in order currency
            $shippingCost = (float) $order->shipping->shipping_cost_incl_vat;
        }

        // Subtotal is just products (order->total_incl_vat doesn't include shipping)
        $subtotal = (float) $order->total_incl_vat;

        // Total includes products + shipping
        $totalInclVat = $subtotal + $shippingCost;

        // Format order data
        $orderData = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'total_incl_vat' => $totalInclVat, // Products + shipping
            'total_excl_vat' => (float) $order->total_excl_vat,
            'vat_rate_applied' => $order->vat_rate_applied !== null ? (float) $order->vat_rate_applied : null,
            'currency' => $order->currency,
            'products' => $formattedProducts,
            'shipping_address' => $shippingAddress,
            'estimated_delivery_date' => $estimatedDeliveryDate,
            'shipping_method_name' => $order->shipping ? $order->shipping->title : null,
            'payment_method_name' => $order->paymentMethod ? $order->paymentMethod->name : null,
            'contact_phone' => $contactPhone,
            'contact_email' => $contactEmail,
            'shipping_cost' => $shippingCost,
            'subtotal' => $subtotal, // Just products
        ];

        return Inertia::render('Checkout/OrderPlaced', [
            'order' => $orderData,
            'currentCurrency' => [
                'code' => $currentCurrency->code,
                'symbol_left' => $currentCurrency->symbol_left,
                'symbol_right' => $currentCurrency->symbol_right,
            ],
        ]);
    }
}
