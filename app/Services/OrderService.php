<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderAddress;
use App\Models\OrderProduct;
use App\Models\OrderShipping;
use App\Enums\OrderStatus as OrderStatusEnum;
use App\Models\Product;
use App\Models\ShippingMethod;
use App\Models\VatRate;
use App\Services\CartService;
use App\Services\CountryDetectionService;
use App\Services\OrderCodeGenerator;
use App\Services\ProductPriceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class OrderService
{
    protected CartService $cartService;
    protected ProductPriceService $priceService;
    protected CountryDetectionService $countryDetectionService;
    protected OrderCodeGenerator $codeGenerator;

    public function __construct(CartService $cartService, ProductPriceService $priceService, CountryDetectionService $countryDetectionService, OrderCodeGenerator $codeGenerator)
    {
        $this->cartService = $cartService;
        $this->priceService = $priceService;
        $this->countryDetectionService = $countryDetectionService;
        $this->codeGenerator = $codeGenerator;
    }

    /**
     * Validate checkout data before order creation.
     *
     * @param Request $request
     * @return array Validation results with errors array and validated data
     */
    public function validateCheckout(Request $request): array
    {
        $errors = [];
        $validatedData = [];

        $user = Auth::user();
        $isGuest = !$user || !$user->customer_id;
        $customer = null;

        if (!$isGuest) {
            // Authenticated user
            $customer = Customer::find($user->customer_id);
            if (!$customer) {
                $errors[] = 'Customer not found.';
                return ['errors' => $errors, 'validated' => null];
            }
            $validatedData['customer'] = $customer;
            
            // For B2B: validate that headquarters address exists
            if ($customer->customer_type === 'company') {
                $headquartersAddress = $customer->addresses()->where('address_type', 'headquarters')->first();
                if (!$headquartersAddress) {
                    $errors[] = 'Headquarters address is required for B2B customers.';
                    return ['errors' => $errors, 'validated' => null];
                }
            }
        } else {
            // Guest user - customer will be null
            $validatedData['customer'] = null;
            
            // For guest: email is required
            $guestEmail = Session::get('checkout_guest_email');
            if (!$guestEmail) {
                $errors[] = 'Email is required for guest checkout.';
                return ['errors' => $errors, 'validated' => null];
            }
        }

        // Get cart items
        $cartItems = $this->cartService->getCartItems($request);
        if (empty($cartItems)) {
            $errors[] = 'Cart is empty.';
            return ['errors' => $errors, 'validated' => null];
        }

        // Validate billing address
        if ($isGuest) {
            // For guest: check if using shipping address as billing
            $useShippingAsBilling = $request->input('use_shipping_as_billing', false);
            
            // Get guest email from session (set in Contact Data step)
            $guestEmail = Session::get('checkout_guest_email');
            
            if ($useShippingAsBilling) {
                // Use shipping address for billing
                $shippingAddressData = Session::get('checkout_shipping_address');
                if (!$shippingAddressData) {
                    $errors[] = 'Shipping address is required when using shipping address for billing.';
                    return ['errors' => $errors, 'validated' => null];
                }
                // Add email to shipping address if not already present
                if ($guestEmail && !isset($shippingAddressData['email'])) {
                    $shippingAddressData['email'] = $guestEmail;
                }
                $validatedData['billing_address'] = $shippingAddressData; // Use shipping address for billing
            } else {
                // Get billing address from session
                $billingAddressData = Session::get('checkout_billing_address');
                if (!$billingAddressData) {
                    $errors[] = 'Billing address is required.';
                    return ['errors' => $errors, 'validated' => null];
                }
                // Add email to billing address if not already present
                if ($guestEmail && !isset($billingAddressData['email'])) {
                    $billingAddressData['email'] = $guestEmail;
                }
                $validatedData['billing_address'] = $billingAddressData; // Array for guest
            }
            
            // Also add email to shipping address if it exists (for later use)
            $shippingAddressData = Session::get('checkout_shipping_address');
            if ($shippingAddressData && $guestEmail && !isset($shippingAddressData['email'])) {
                $shippingAddressData['email'] = $guestEmail;
                Session::put('checkout_shipping_address', $shippingAddressData);
            }
        } else {
            // For authenticated user: get billing address from database
            $billingAddressId = $request->input('billing_address_id');
            if (!$billingAddressId) {
                $errors[] = 'Billing address is required.';
                return ['errors' => $errors, 'validated' => null];
            }

            // Get billing address (can be headquarters, regular billing address, or shipping address if used as billing)
            $billingAddress = $customer->addresses()->where(function ($query) use ($billingAddressId) {
                $query->where('id', $billingAddressId)
                    ->where(function ($q) {
                        $q->where('address_type', 'billing')
                          ->orWhere('address_type', 'headquarters')
                          ->orWhere('address_type', 'shipping'); // Allow shipping address to be used as billing
                    });
            })->first();

            if (!$billingAddress) {
                $errors[] = 'Billing address not found.';
                return ['errors' => $errors, 'validated' => null];
            }
            $validatedData['billing_address'] = $billingAddress; // Address model for authenticated
        }

        // Validate shipping method
        $shippingMethodId = $request->input('shipping_method_id');
        if (!$shippingMethodId) {
            $errors[] = 'Shipping method is required.';
            return ['errors' => $errors, 'validated' => null];
        }

        $shippingMethod = ShippingMethod::find($shippingMethodId);
        if (!$shippingMethod) {
            $errors[] = 'Shipping method not found.';
            return ['errors' => $errors, 'validated' => null];
        }

        // Validate pickup point if pickup method
        $pickupData = null;
        if ($shippingMethod->type->value === 'pickup') {
            $pickupData = Session::get('pickup_data');
            if (!$pickupData || !isset($pickupData['courier_data'])) {
                $errors[] = 'Pickup point selection is required for pickup shipping method.';
                return ['errors' => $errors, 'validated' => null];
            }

            // Validate courier_data structure (security: prevent malicious JSON injection)
            $validator = \Validator::make($pickupData, [
                'courier_data' => 'required|array',
                'courier_data.point_id' => 'nullable|string|max:255',
                'courier_data.point_name' => 'nullable|string|max:255',
                'courier_data.provider' => 'nullable|string|max:255',
                'courier_data.locker_details' => 'nullable|array',
                'courier_data.locker_details.address' => 'nullable|string|max:500',
                'courier_data.locker_details.city' => 'nullable|string|max:255',
                'courier_data.locker_details.county_name' => 'nullable|string|max:255',
                'courier_data.locker_details.county_code' => 'nullable|string|max:10',
                'courier_data.locker_details.zip_code' => 'nullable|string|max:20',
                'courier_data.locker_details.country_id' => 'nullable|integer|exists:countries,id',
                'courier_data.locker_details.lat' => 'nullable|numeric|between:-90,90',
                'courier_data.locker_details.long' => 'nullable|numeric|between:-180,180',
                'shipping_address' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                $errors[] = 'Invalid pickup data structure: ' . implode(', ', $validator->errors()->all());
                return ['errors' => $errors, 'validated' => null];
            }
        } else {
            // Validate shipping address for courier
            if ($isGuest) {
                // For guest: get shipping address from session
                $shippingAddressData = Session::get('checkout_shipping_address');
                if (!$shippingAddressData) {
                    $errors[] = 'Shipping address is required for courier delivery.';
                    return ['errors' => $errors, 'validated' => null];
                }
                // Add email to shipping address if not already present
                $guestEmail = Session::get('checkout_guest_email');
                if ($guestEmail && !isset($shippingAddressData['email'])) {
                    $shippingAddressData['email'] = $guestEmail;
                }
                $validatedData['shipping_address'] = $shippingAddressData; // Array for guest
            } else {
                // For authenticated user: get shipping address from database
                $shippingAddressId = $request->input('shipping_address_id');
                if (!$shippingAddressId) {
                    $errors[] = 'Shipping address is required for courier delivery.';
                    return ['errors' => $errors, 'validated' => null];
                }

                $shippingAddress = $customer->addresses()->where('id', $shippingAddressId)
                    ->where('address_type', 'shipping')
                    ->first();

                if (!$shippingAddress) {
                    $errors[] = 'Shipping address not found.';
                    return ['errors' => $errors, 'validated' => null];
                }
                $validatedData['shipping_address'] = $shippingAddress; // Address model for authenticated
            }
        }

        // Validate payment method
        $paymentMethodId = $request->input('payment_method_id');
        if (!$paymentMethodId) {
            $errors[] = 'Payment method is required.';
            return ['errors' => $errors, 'validated' => null];
        }

        $paymentMethod = \App\Models\PaymentMethod::find($paymentMethodId);
        if (!$paymentMethod || !$paymentMethod->is_active) {
            $errors[] = 'Payment method not found or inactive.';
            return ['errors' => $errors, 'validated' => null];
        }

        // Validate stock (check but don't block - order still goes through)
        $stockWarnings = [];
        foreach ($cartItems as $cartKey => $item) {
            $product = Product::find($item['product_id']);
            if ($product) {
                if ($product->stock_quantity < $item['quantity']) {
                    $stockWarnings[] = "Product {$product->name} has insufficient stock (requested: {$item['quantity']}, available: {$product->stock_quantity}).";
                }
            }
        }

        $validatedData['is_guest'] = $isGuest;
        $validatedData['shipping_method'] = $shippingMethod;
        $validatedData['pickup_data'] = $pickupData;
        $validatedData['payment_method_id'] = $paymentMethodId;
        $validatedData['payment_method'] = $paymentMethod; // Store payment method object for later use
        $validatedData['cart_items'] = $cartItems;
        $validatedData['stock_warnings'] = $stockWarnings;

        return ['errors' => $errors, 'validated' => $validatedData];
    }

    /**
     * Create order from cart with all validations and transactions.
     *
     * @param Request $request
     * @return Order
     * @throws \Exception
     */
    public function createOrderFromCart(Request $request): Order
    {
        // Step 0: Check idempotency key to prevent duplicate orders
        $idempotencyKey = $request->input('idempotency_key');
        if ($idempotencyKey) {
            $cacheKey = 'order_idempotency:' . $idempotencyKey;
            $existingOrderId = Cache::get($cacheKey);
            
            if ($existingOrderId) {
                // Order was already processed, return it
                $order = Order::with(['products', 'billingAddress', 'shippingAddress', 'shipping', 'paymentMethod'])
                    ->find($existingOrderId);
                
                if ($order && $order->customer_id) {
                    $order->load('customer');
                }
                
                if ($order) {
                    return $order;
                }
            }
        }

        // Step 1: Validate checkout data
        $validation = $this->validateCheckout($request);
        if (!empty($validation['errors'])) {
            throw new \Exception('Validation failed: ' . implode(', ', $validation['errors']));
        }

        $data = $validation['validated'];

        // Step 2: Recalculate totals from database (don't trust frontend)
        $currencyCode = $request->session()->get('currency', 'RON');
        $currency = Currency::where('code', $currencyCode)->where('status', true)->firstOrFail();
        $customerGroupId = $request->session()->get('customer_group_id', null);
        
        // Validate customer group consistency for authenticated users
        if (!$data['is_guest'] && $data['customer']) {
            $sessionCustomerGroupId = $customerGroupId;
            $customerCustomerGroupId = $data['customer']->customer_group_id;
            
            // If session customer group doesn't match customer's group, update session
            if ($sessionCustomerGroupId !== $customerCustomerGroupId) {
                $request->session()->put('customer_group_id', $customerCustomerGroupId);
                $customerGroupId = $customerCustomerGroupId;
            }
        }

        // Get country ID from shipping address for VAT calculation (shipping country determines VAT)
        // Shipping country is required - no fallbacks allowed
        $countryIdForVat = null;
        
        // First, try to get from shipping address
        if (isset($data['shipping_address'])) {
            if ($data['is_guest']) {
                $countryIdForVat = $data['shipping_address']['country_id'] ?? null;
            } else {
                $countryIdForVat = $data['shipping_address']->country_id ?? null;
            }
        } elseif (isset($data['pickup_data']['shipping_address'])) {
            // Pickup: get country_id from pickup shipping address
            $countryIdForVat = $data['pickup_data']['shipping_address']['country_id'] ?? null;
        } elseif (isset($data['pickup_data']['courier_data']['locker_details']['country_id'])) {
            // Pickup: get country_id from locker details
            $countryIdForVat = $data['pickup_data']['courier_data']['locker_details']['country_id'] ?? null;
        }
        
        // Shipping country is required for VAT calculation
        if ($countryIdForVat === null) {
            throw new \Exception("Shipping country is required for VAT calculation");
        }

        $recalculatedTotals = $this->recalculateTotals(
            $data['cart_items'],
            $currency,
            $customerGroupId,
            $request,
            $countryIdForVat
        );

        // Step 3: Database transaction - create order
        return DB::transaction(function () use ($data, $currency, $customerGroupId, $recalculatedTotals, $request, $idempotencyKey, $countryIdForVat) {
            // A. Create Order (Master Record)
            // Generate temporary order number (will be replaced with real one after ID is created)
            $tempOrderNumber = 'TEMP-' . time() . '-' . strtoupper(substr(uniqid(), -6));
            
            // Determine initial order status based on payment method
            $paymentMethod = \App\Models\PaymentMethod::find($data['payment_method_id']);
            $orderStatus = $this->getInitialOrderStatus($paymentMethod);

            // Determine if order should be marked as paid automatically
            // For online payments that are processed immediately, mark as paid
            // For cash on delivery / ramburs, leave as unpaid (admin will mark when payment is received)
            $isPaid = $this->shouldMarkAsPaidAutomatically($paymentMethod);

            // Get exchange rate (freeze at order time)
            // Exchange rate represents: 1 [currency] = X RON (e.g., 1 EUR = 5.091 RON)
            $exchangeRate = $currency->code === 'RON' ? 1.0 : (float) $currency->value;
            
            // Validate exchange rate is positive
            if ($exchangeRate <= 0) {
                throw new \Exception("Invalid exchange rate for currency: {$currency->code}. Currency value must be positive.");
            }

            // Calculate average VAT rate for order (if needed)
            $vatRateApplied = $recalculatedTotals['average_vat_rate'] ?? 0.0;

            $order = Order::create([
                'customer_id' => $data['customer'] ? $data['customer']->id : null,
                'order_number' => $tempOrderNumber,
                'currency' => $currency->code,
                'exchange_rate' => $exchangeRate,
                'vat_rate_applied' => $vatRateApplied,
                'is_vat_exempt' => !$this->priceService->shouldShowVat($customerGroupId),
                'total_excl_vat' => $recalculatedTotals['total_excl_vat'],
                'total_incl_vat' => $recalculatedTotals['total_incl_vat'],
                'total_ron_excl_vat' => $recalculatedTotals['total_ron_excl_vat'],
                'total_ron_incl_vat' => $recalculatedTotals['total_ron_incl_vat'],
                'payment_method_id' => $data['payment_method_id'],
                'status' => $orderStatus,
                'is_paid' => $isPaid,
                'paid_at' => $isPaid ? now() : null,
            ]);

            // Generate real order number from order ID using Hashids
            $orderNumber = $this->codeGenerator->generateFromId($order->id);
            $order->order_number = $orderNumber;
            $order->save();

            // Log order creation in history
            $order->logHistory(
                'order_created',
                null,
                [
                    'order_number' => $orderNumber,
                    'status' => $orderStatus->label(),
                    'total_ron_incl_vat' => $recalculatedTotals['total_ron_incl_vat'],
                    'is_guest' => $data['is_guest'],
                ],
                "Order created with status: {$orderStatus->label()}" . ($data['is_guest'] ? ' (Guest)' : ''),
                $data['is_guest'] ? null : Auth::id() // null for guest, user ID for authenticated
            );

            // B. Create OrderAddress (Snapshots)
            // Billing address
            if ($data['is_guest']) {
                // Guest: create from array
                OrderAddress::createFromArray($order->id, $data['billing_address'], 'billing');
            } else {
                // Authenticated: create from Address model
                $data['billing_address']->toOrderAddress($order->id, 'billing');
            }

            // Shipping address
            if (isset($data['shipping_address'])) {
                if ($data['is_guest']) {
                    // Guest: create from array
                    OrderAddress::createFromArray($order->id, $data['shipping_address'], 'shipping');
                } else {
                    // Authenticated: create from Address model
                    $data['shipping_address']->toOrderAddress($order->id, 'shipping');
                }
            } elseif ($data['pickup_data']) {
                // Pickup address from courier data
                $pickupShippingAddress = $data['pickup_data']['shipping_address'] ?? null;
                
                if ($data['is_guest']) {
                    // Guest: get name/phone/email from pickup data or billing address
                    $billingAddress = is_array($data['billing_address']) ? $data['billing_address'] : [];
                    $firstName = $pickupShippingAddress['first_name'] ?? $billingAddress['first_name'] ?? '';
                    $lastName = $pickupShippingAddress['last_name'] ?? $billingAddress['last_name'] ?? '';
                    $phone = $pickupShippingAddress['phone'] ?? $billingAddress['phone'] ?? '';
                    $email = $pickupShippingAddress['email'] ?? $billingAddress['email'] ?? Session::get('checkout_guest_email');
                } else {
                    // Authenticated: get from user/customer
                    $user = Auth::user();
                    $customer = $data['customer'];
                    $firstName = $pickupShippingAddress['first_name'] ?? ($user->first_name ?? $customer->company_name ?? '');
                    $lastName = $pickupShippingAddress['last_name'] ?? ($user->last_name ?? '');
                    $phone = $pickupShippingAddress['phone'] ?? ($customer->phone ?? '');
                    $email = $user->email ?? null;
                }
                
                // Create OrderAddress with email
                $orderAddress = OrderAddress::createFromLockerData(
                    $order->id,
                    $data['pickup_data']['courier_data'],
                    $firstName,
                    $lastName,
                    $phone
                );
                
                // Add email to the created address if available
                if ($email && isset($orderAddress)) {
                    $orderAddress->email = $email;
                    $orderAddress->save();
                }
            }

            // C. Migrate Products: Cart -> OrderProduct
            $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);
            // Use shipping country ID for VAT calculation (shipping country determines VAT)
            // For B2B, VAT is always 0% regardless of country
            $countryId = $this->priceService->shouldShowVat($customerGroupId)
                ? $countryIdForVat // Use shipping country for B2C
                : null; // B2B doesn't need country for VAT (always 0%)

            foreach ($data['cart_items'] as $cartKey => $item) {
                $product = Product::findOrFail($item['product_id']);
                $itemCustomerGroupId = $item['customer_group_id'] ?? $customerGroupId;
                $itemCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($itemCustomerGroupId);

                // Get current price info
                $priceInfo = $this->priceService->getPriceInfo(
                    $product,
                    $currency,
                    $item['quantity'],
                    $itemCustomerGroupId,
                    $countryId,
                    $request
                );

                // Calculate totals for this order product
                $unitPriceRon = $priceInfo['unit_price_ron_incl_vat'];
                $unitPriceExclVatRon = $priceInfo['unit_price_ron_excl_vat'];
                $unitPriceCurrency = $priceInfo['unit_price_incl_vat'];
                $unitPriceExclVatCurrency = $priceInfo['unit_price_excl_vat'];

                $quantity = $item['quantity'];
                // Round after each multiplication to prevent rounding errors
                $totalRonExclVat = round($unitPriceExclVatRon * $quantity, 2);
                $totalRonInclVat = round($unitPriceRon * $quantity, 2);
                $totalCurrencyExclVat = round($unitPriceExclVatCurrency * $quantity, 2);
                $totalCurrencyInclVat = round($unitPriceCurrency * $quantity, 2);

                // Get purchase price for profitability reports
                $unitPurchasePriceRon = (float) $product->purchase_price_ron;
                $profitRon = round(($unitPriceExclVatRon - $unitPurchasePriceRon) * $quantity, 2);

                OrderProduct::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'name' => $product->name, // Snapshot name
                    'sku' => $product->sku, // Snapshot SKU
                    'ean' => $product->ean,
                    'quantity' => $quantity,
                    'vat_percent' => $priceInfo['vat_rate'],
                    'exchange_rate' => $exchangeRate,
                    'unit_price_currency' => round($unitPriceCurrency, 2),
                    'unit_price_ron' => round($unitPriceRon, 2),
                    'unit_purchase_price_ron' => round($unitPurchasePriceRon, 2),
                    'total_currency_excl_vat' => $totalCurrencyExclVat, // Already rounded
                    'total_currency_incl_vat' => $totalCurrencyInclVat, // Already rounded
                    'total_ron_excl_vat' => $totalRonExclVat, // Already rounded
                    'total_ron_incl_vat' => $totalRonInclVat, // Already rounded
                    'profit_ron' => $profitRon, // Already rounded
                ]);
            }

            // D. Create OrderShipping
            $shippingCostRon = (float) $data['shipping_method']->cost;
            // Use shipping country ID for VAT calculation (shipping country determines VAT)
            $shippingVatRate = $this->getShippingVatRate($customerGroupId, $request, $countryIdForVat);
            $shippingCostExclVatRon = $this->priceService->calculatePriceExclVat($shippingCostRon, $shippingVatRate);
            $shippingCostInclVatRon = $shippingCostRon;

            $shippingCostExclVatCurrency = $this->priceService->convertToCurrency($shippingCostExclVatRon, $currency);
            $shippingCostInclVatCurrency = $this->priceService->convertToCurrency($shippingCostInclVatRon, $currency);

            $orderShippingData = [
                'order_id' => $order->id,
                'shipping_method_id' => $data['shipping_method']->id,
                'title' => $data['shipping_method']->name,
                'shipping_cost_excl_vat' => round($shippingCostExclVatCurrency, 2),
                'shipping_cost_incl_vat' => round($shippingCostInclVatCurrency, 2),
                'shipping_cost_ron_excl_vat' => round($shippingCostExclVatRon, 2),
                'shipping_cost_ron_incl_vat' => round($shippingCostInclVatRon, 2),
            ];

            if ($data['pickup_data']) {
                $orderShippingData['pickup_point_id'] = $data['pickup_data']['courier_data']['point_id'] ?? null;
                $orderShippingData['courier_data'] = $data['pickup_data']['courier_data'];
            }

            OrderShipping::create($orderShippingData);

            // E. Subtract stock (with pessimistic locking to prevent race conditions)
            foreach ($data['cart_items'] as $cartKey => $item) {
                // Use pessimistic locking to prevent race conditions when multiple orders
                // try to purchase the last item simultaneously
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                
                // Verify stock is still available (with lock, this is now safe from race conditions)
                // Note: We still decrement even if stock is insufficient (backorder policy)
                $product->decrement('stock_quantity', $item['quantity']);
            }

            // F. Clear cart (for authenticated users)
            $user = Auth::user();
            if ($user && $user->customer_id) {
                $cart = Cart::where('customer_id', $user->customer_id)->where('status', 'active')->first();
                if ($cart) {
                    CartItem::where('cart_id', $cart->id)->delete();
                    // Optionally mark cart as converted
                    $cart->status = 'converted';
                    $cart->save();
                }
            } else {
                Session::forget('cart');
            }

            // Clear pickup data from session
            Session::forget('pickup_data');

            // Load relationships (customer may be null for guest orders)
            $freshOrder = $order->fresh(['products', 'billingAddress', 'shippingAddress', 'shipping', 'paymentMethod']);
            if ($freshOrder && $freshOrder->customer_id) {
                $freshOrder->load('customer');
            }

            // Store idempotency key in cache for 5 minutes
            if ($idempotencyKey) {
                $cacheKey = 'order_idempotency:' . $idempotencyKey;
                Cache::put($cacheKey, $freshOrder->id, now()->addMinutes(5));
            }

            return $freshOrder;
        });
    }

    /**
     * Recalculate order totals from database (don't trust frontend).
     *
     * @param array $cartItems
     * @param Currency $currency
     * @param int|null $customerGroupId
     * @param Request|null $request
     * @return array
     */
    private function recalculateTotals(array $cartItems, Currency $currency, ?int $customerGroupId, ?Request $request = null, ?int $shippingCountryId = null): array
    {
        $totalExclVat = 0.0;
        $totalInclVat = 0.0;
        $totalRonExclVat = 0.0;
        $totalRonInclVat = 0.0;
        $vatRates = [];

        $customerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);
        
        // Use shipping country ID if provided, otherwise auto-detect by ProductPriceService::getPriceInfo
        $countryId = $shippingCountryId;

        foreach ($cartItems as $cartKey => $item) {
            $product = Product::find($item['product_id']);
            if (!$product || !$product->status) {
                continue;
            }

            $itemCustomerGroupId = $item['customer_group_id'] ?? $customerGroupId;
            $itemCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($itemCustomerGroupId);

            $priceInfo = $this->priceService->getPriceInfo(
                $product,
                $currency,
                $item['quantity'],
                $itemCustomerGroupId,
                $countryId,
                $request
            );

            // Round after each addition to prevent floating point errors from accumulating
            $totalExclVat = round($totalExclVat + $priceInfo['total_price_excl_vat'], 2);
            $totalInclVat = round($totalInclVat + $priceInfo['total_price_incl_vat'], 2);
            $totalRonExclVat = round($totalRonExclVat + $priceInfo['total_price_ron_excl_vat'], 2);
            $totalRonInclVat = round($totalRonInclVat + $priceInfo['total_price_ron_incl_vat'], 2);
            $vatRates[] = $priceInfo['vat_rate'];
        }

        // Calculate average VAT rate (round intermediate calculation)
        $averageVatRate = !empty($vatRates) ? round(array_sum($vatRates) / count($vatRates), 2) : 0.0;

        return [
            'total_excl_vat' => $totalExclVat, // Already rounded
            'total_incl_vat' => $totalInclVat, // Already rounded
            'total_ron_excl_vat' => $totalRonExclVat, // Already rounded
            'total_ron_incl_vat' => $totalRonInclVat, // Already rounded
            'average_vat_rate' => $averageVatRate, // Already rounded
        ];
    }


    /**
     * Get initial order status based on payment method.
     * 
     * @param PaymentMethod|null $paymentMethod
     * @return OrderStatusEnum
     */
    private function getInitialOrderStatus(?\App\Models\PaymentMethod $paymentMethod): OrderStatusEnum
    {
        if (!$paymentMethod) {
            // Fallback to Pending if payment method not found
            return OrderStatusEnum::PENDING;
        }

        $paymentCode = strtolower($paymentMethod->code ?? '');

        // Card payment - awaiting payment confirmation
        if (in_array($paymentCode, ['card', 'credit_card', 'debit_card', 'online'])) {
            return OrderStatusEnum::AWAITING_PAYMENT;
        }

        // Cash on delivery / Ramburs - order is confirmed, ready to process
        if (in_array($paymentCode, ['ramburs', 'cod', 'cash_on_delivery'])) {
            return OrderStatusEnum::CONFIRMED;
        }

        // Default fallback to Pending
        return OrderStatusEnum::PENDING;
    }

    /**
     * Determine if order should be marked as paid automatically based on payment method.
     * 
     * @param PaymentMethod|null $paymentMethod
     * @return bool
     */
    private function shouldMarkAsPaidAutomatically(?\App\Models\PaymentMethod $paymentMethod): bool
    {
        if (!$paymentMethod) {
            return false;
        }

        $paymentCode = strtolower($paymentMethod->code ?? '');

        // Online payments that are processed immediately should be marked as paid
        if (in_array($paymentCode, ['card', 'credit_card', 'debit_card', 'online', 'paypal', 'stripe'])) {
            return true;
        }

        // Cash on delivery / Ramburs - NOT paid automatically (admin marks when payment is received)
        // Bank transfer - NOT paid automatically (admin marks when payment is confirmed)
        // Default: NOT paid automatically
        return false;
    }

    /**
     * Get VAT rate for shipping based on customer group and country.
     * 
     * @param int|null $customerGroupId
     * @param Request|null $request
     * @param int|null $shippingCountryId Shipping country ID (takes precedence over IP detection)
     * @return float VAT rate as percentage (e.g., 19.0 for 19%)
     */
    private function getShippingVatRate(?int $customerGroupId, ?Request $request = null, ?int $shippingCountryId = null): float
    {
        // For B2B: VAT is always 0% (reverse charge)
        $effectiveCustomerGroupId = $this->priceService->getEffectiveCustomerGroupId($customerGroupId);
        $isB2B = !$this->priceService->shouldShowVat($effectiveCustomerGroupId);
        
        if ($isB2B) {
            return 0.0;
        }
        
        // For B2C: Use shipping country ID if provided, otherwise detect from IP
        // Shipping country ID takes precedence as it's more accurate than IP detection
        $countryId = $shippingCountryId ?? $this->countryDetectionService->getCountryId($request, $customerGroupId);
        
        // Get VAT rate for this country
        $vatRate = VatRate::where('country_id', $countryId)
            ->orderBy('rate', 'desc')
            ->value('rate');
        
        if ($vatRate !== null) {
            return (float) $vatRate;
        }
        
        // Throw error if VAT rate not found
        $country = \App\Models\Country::find($countryId);
        $countryName = $country ? $country->name : "ID: {$countryId}";
        throw new \Exception("VAT rate not found for country: {$countryName}");
    }
}

