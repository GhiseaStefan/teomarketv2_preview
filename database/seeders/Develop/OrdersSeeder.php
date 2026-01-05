<?php

namespace Database\Seeders\Develop;

use App\Enums\OrderStatus;
use App\Services\OrderCodeGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Orders Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds orders for development/testing.
 * Creates orders for each status with new order number format (XXX-XXX-XXX).
 * Some orders will have tracking numbers, others won't.
 * 
 * Depends on: CustomersSeeder (or TestUsersSeeder), AddressesSeeder, ProductsSeeder, PaymentMethodsSeeder
 */
class OrdersSeeder extends Seeder
{
    private OrderCodeGenerator $codeGenerator;
    private array $invoiceCounters = []; // Track invoice numbers per series

    public function __construct()
    {
        $this->codeGenerator = new OrderCodeGenerator();
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding orders...');
        $this->seedOrders();
        $this->command->info('✓ Orders seeded successfully');
    }

    private function seedOrders(): void
    {
        // Get currency exchange rates from database
        $currencies = DB::table('currencies')->get()->keyBy('code');
        $ronExchangeRate = 1.0; // RON is always 1.0
        $eurExchangeRate = (float) ($currencies->get('EUR')?->value ?? 0.20); // Default if not found
        $usdExchangeRate = (float) ($currencies->get('USD')?->value ?? 0.22); // Default if not found
        
        // Get payment methods from database
        $paymentMethods = DB::table('payment_methods')->get()->keyBy('code');
        $stripeId = $paymentMethods->get('stripe')?->id;
        $cashOnDeliveryId = $paymentMethods->get('cash_on_delivery')?->id;
        $bankTransferId = $paymentMethods->get('bank_transfer')?->id;
        $paypalId = $paymentMethods->get('paypal')?->id;

        // Validate that required payment methods exist
        if (!$stripeId || !$cashOnDeliveryId || !$bankTransferId) {
            throw new \Exception('Required payment methods (stripe, cash_on_delivery, bank_transfer) must be seeded before creating orders. Please run PaymentMethodsSeeder first.');
        }


        // Get all customers that have users (customers with associated users) with full data
        $customersWithUsers = DB::table('customers')
            ->join('users', 'customers.id', '=', 'users.customer_id')
            ->whereNotNull('users.customer_id')
            ->select('customers.*')
            ->distinct()
            ->get();

        if ($customersWithUsers->isEmpty()) {
            throw new \Exception('No customers with users found. Please run CustomersSeeder or TestUsersSeeder first.');
        }

        // Get all customer IDs that have users
        $availableCustomerIds = $customersWithUsers->pluck('id')->toArray();

        // Payment methods array (filter out null values)
        $paymentMethodIds = array_filter([$stripeId, $bankTransferId, $cashOnDeliveryId, $paypalId], fn($id) => $id !== null);
        if (empty($paymentMethodIds)) {
            throw new \Exception('No valid payment methods found. Cannot create orders.');
        }
        $paymentMethodIds = array_values($paymentMethodIds);

        // Get available products with all necessary data
        $products = DB::table('products')
            ->where('status', true)
            ->whereNotNull('price_ron')
            ->where('price_ron', '>', 0)
            ->get(['id', 'name', 'sku', 'ean', 'price_ron', 'purchase_price_ron']);

        if ($products->isEmpty()) {
            throw new \Exception('No products found. Please run ProductsSeeder first.');
        }
        $productIds = $products->pluck('id')->toArray();
        $productsById = $products->keyBy('id');

        // Get product group prices for all customer groups (cached for performance)
        $productGroupPrices = DB::table('product_group_prices')
            ->get()
            ->groupBy(['product_id', 'customer_group_id']);

        // Create orders for each status
        $orders = [];
        $orderCounter = 1;

        // Define how many orders per status and which should have tracking numbers
        $ordersPerStatus = [
            OrderStatus::PENDING->value => 3,           // 0 with tracking
            OrderStatus::AWAITING_PAYMENT->value => 2,   // 0 with tracking
            OrderStatus::CONFIRMED->value => 3,          // 1 with tracking
            OrderStatus::PROCESSING->value => 4,         // 2 with tracking
            OrderStatus::SHIPPED->value => 5,            // 5 with tracking (all shipped should have tracking)
            OrderStatus::DELIVERED->value => 4,          // 4 with tracking (all delivered should have tracking)
            OrderStatus::CANCELLED->value => 2,          // 0 with tracking
            OrderStatus::REFUNDED->value => 2,           // 0 with tracking
        ];

        foreach ($ordersPerStatus as $statusValue => $count) {
            $status = OrderStatus::from($statusValue);
            
            // Determine how many should have tracking numbers
            $withTracking = match ($status) {
                OrderStatus::SHIPPED => $count,      // All shipped orders have tracking
                OrderStatus::DELIVERED => $count,    // All delivered orders have tracking
                OrderStatus::PROCESSING => 2,        // Some processing orders have tracking
                OrderStatus::CONFIRMED => 1,         // Some confirmed orders have tracking
                default => 0,             // Others don't have tracking
            };

            for ($i = 0; $i < $count; $i++) {
                // Select a random customer from available customers (those with users)
                $customerId = $availableCustomerIds[array_rand($availableCustomerIds)];
                $customer = $customersWithUsers->firstWhere('id', $customerId);
                if (!$customer) {
                    continue;
                }
                
                // Get customer data with addresses
                $customerData = $this->getCustomerData($customerId);
                if (!$customerData) {
                    continue;
                }
                
                $paymentMethodId = $paymentMethodIds[array_rand($paymentMethodIds)];

                // Select random products for this order (1-5 products)
                $numProducts = rand(1, min(5, count($productIds)));
                $selectedProductIds = array_rand($productIds, $numProducts);
                if (!is_array($selectedProductIds)) {
                    $selectedProductIds = [$selectedProductIds];
                }

                // Determine if order should be marked as paid automatically based on payment method
                $paymentMethodCode = DB::table('payment_methods')->where('id', $paymentMethodId)->value('code');
                $isPaid = $this->shouldMarkAsPaidAutomatically($paymentMethodCode);
                
                // For paid orders, set paid_at to a random date between order creation and now
                // For unpaid orders, sometimes mark as paid later (simulate admin marking it)
                $paidAt = null;
                if ($isPaid) {
                    // If paid automatically, paid_at should be close to created_at
                    $orderCreatedAt = now()->subDays(rand(0, 30));
                    $paidAt = $orderCreatedAt->copy()->addMinutes(rand(0, 60));
                } else {
                    // For unpaid orders, sometimes mark as paid later (30% chance)
                    // This simulates admin marking orders as paid after receiving payment
                    if (rand(1, 100) <= 30) {
                        $orderCreatedAt = now()->subDays(rand(0, 30));
                        // Paid between 1 hour and 5 days after order creation
                        $paidAt = $orderCreatedAt->copy()->addHours(rand(1, 120));
                    }
                }

                // Get VAT rate from customer's country
                $vatRate = $this->getVatRateForCountry($customerData['country_id']);
                
                // Get currency (default to RON, but can be extended)
                $currency = 'RON';
                $exchangeRate = $ronExchangeRate;

                // Generate invoice data (90% of orders will have invoice)
                $invoiceData = $this->generateInvoiceData();

                // Create order first to get ID, then generate order number
                // We'll update totals after adding products
                $orderCreatedAt = now()->subDays(rand(0, 30));
                $orderId = DB::table('orders')->insertGetId([
                    'customer_id' => $customerId,
                    'order_number' => 'TEMP-' . $orderCounter, // Temporary, will be updated
                    'invoice_series' => $invoiceData ? $invoiceData['series'] : null,
                    'invoice_number' => $invoiceData ? $invoiceData['number'] : null,
                    'currency' => $currency,
                    'exchange_rate' => $exchangeRate,
                    'vat_rate_applied' => $vatRate,
                    'is_vat_exempt' => false,
                    'total_excl_vat' => 0, // Will be updated after products are added
                    'total_incl_vat' => 0, // Will be updated after products are added
                    'total_ron_excl_vat' => 0, // Will be updated after products are added
                    'total_ron_incl_vat' => 0, // Will be updated after products are added
                    'payment_method_id' => $paymentMethodId,
                    'status' => $status->value,
                    'is_paid' => $paidAt !== null,
                    'paid_at' => $paidAt,
                    'created_at' => $orderCreatedAt,
                    'updated_at' => $orderCreatedAt,
                ]);

                // Generate order number using new format
                $orderNumber = $this->codeGenerator->generateFromId($orderId);

                // Update order with generated order number
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update(['order_number' => $orderNumber]);

                // Add products to order
                $orderTotalExclVat = 0;
                $orderTotalInclVat = 0;
                $orderTotalRonExclVat = 0;
                $orderTotalRonInclVat = 0;
                $vatRates = [];

                foreach ($selectedProductIds as $productIdKey) {
                    $productId = $productIds[$productIdKey];
                    $product = $productsById->get($productId);

                    if (!$product) {
                        continue;
                    }

                    // Random quantity (1-5)
                    $quantity = rand(1, 5);

                    // Get price for this customer group (from ProductGroupPrice if available, otherwise base price)
                    $unitPriceRon = $this->getProductPriceForCustomerGroup(
                        $productId,
                        $customer->customer_group_id,
                        $quantity,
                        (float) $product->price_ron
                    );
                    $unitPurchasePriceRon = (float) ($product->purchase_price_ron ?? 0);

                    // Calculate VAT
                    $unitPriceExclVatRon = round($unitPriceRon / (1 + $vatRate / 100), 2);
                    $totalRonExclVat = round($unitPriceExclVatRon * $quantity, 2);
                    $totalRonInclVat = round($unitPriceRon * $quantity, 2);

                    // For currency (using exchange rate from database)
                    // Divide by exchange rate as per CurrencyConverter logic (for RON, rate is 1.0 so no change)
                    $exchangeRate = $ronExchangeRate;
                    $unitPriceCurrency = round($unitPriceRon / $exchangeRate, 2);
                    $unitPriceExclVatCurrency = round($unitPriceExclVatRon / $exchangeRate, 2);
                    $totalCurrencyExclVat = round($unitPriceExclVatCurrency * $quantity, 2);
                    $totalCurrencyInclVat = round($unitPriceCurrency * $quantity, 2);

                    // Calculate profit
                    $profitRon = round(($unitPriceExclVatRon - $unitPurchasePriceRon) * $quantity, 2);

                    // Insert order product
                    DB::table('order_products')->insert([
                        'order_id' => $orderId,
                        'product_id' => $productId,
                        'name' => $product->name,
                        'sku' => $product->sku,
                        'ean' => $product->ean,
                        'quantity' => $quantity,
                        'vat_percent' => $vatRate,
                        'exchange_rate' => $exchangeRate,
                        'unit_price_currency' => $unitPriceCurrency,
                        'unit_price_ron' => $unitPriceRon,
                        'unit_purchase_price_ron' => $unitPurchasePriceRon,
                        'total_currency_excl_vat' => $totalCurrencyExclVat,
                        'total_currency_incl_vat' => $totalCurrencyInclVat,
                        'total_ron_excl_vat' => $totalRonExclVat,
                        'total_ron_incl_vat' => $totalRonInclVat,
                        'profit_ron' => $profitRon,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Accumulate totals
                    $orderTotalExclVat = round($orderTotalExclVat + $totalCurrencyExclVat, 2);
                    $orderTotalInclVat = round($orderTotalInclVat + $totalCurrencyInclVat, 2);
                    $orderTotalRonExclVat = round($orderTotalRonExclVat + $totalRonExclVat, 2);
                    $orderTotalRonInclVat = round($orderTotalRonInclVat + $totalRonInclVat, 2);
                    $vatRates[] = $vatRate;
                }

                // Calculate average VAT rate
                $averageVatRate = !empty($vatRates) ? round(array_sum($vatRates) / count($vatRates), 2) : $vatRate;

                // Update order totals based on actual products
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update([
                        'total_excl_vat' => $orderTotalExclVat,
                        'total_incl_vat' => $orderTotalInclVat,
                        'total_ron_excl_vat' => $orderTotalRonExclVat,
                        'total_ron_incl_vat' => $orderTotalRonInclVat,
                        'vat_rate_applied' => $averageVatRate,
                    ]);

                // Create order addresses from customer addresses
                $customer = DB::table('customers')->where('id', $customerId)->first();
                if ($customer) {
                    // Get user data (for name and email) - get first user for this customer
                    $user = DB::table('users')->where('customer_id', $customerId)->first();
                    if (!$user) {
                        throw new \Exception("Customer ID {$customerId} does not have an associated user. This should not happen.");
                    }

                    $userEmail = $user->email ?? null;
                    $userFirstName = $user->first_name ?? null;
                    $userLastName = $user->last_name ?? null;

                    // Get customer addresses - prefer preferred addresses
                    $shippingAddress = DB::table('addresses')
                        ->where('customer_id', $customerId)
                        ->where('address_type', 'shipping')
                        ->orderBy('is_preferred', 'desc')
                        ->orderBy('id', 'asc')
                        ->first();

                    // For billing, prefer headquarters (for companies) then billing type
                    $billingAddress = DB::table('addresses')
                        ->where('customer_id', $customerId)
                        ->where(function ($q) {
                            $q->where('address_type', 'headquarters')
                                ->orWhere('address_type', 'billing');
                        })
                        ->orderByRaw("CASE WHEN address_type = 'headquarters' THEN 0 ELSE 1 END")
                        ->orderBy('is_preferred', 'desc')
                        ->orderBy('id', 'asc')
                        ->first();

                    // If no shipping address, try to use any address
                    if (!$shippingAddress) {
                        $shippingAddress = DB::table('addresses')
                            ->where('customer_id', $customerId)
                            ->orderBy('is_preferred', 'desc')
                            ->orderBy('id', 'asc')
                            ->first();
                    }

                    // Get default country (Romania)
                    $defaultCountryId = DB::table('countries')->where('iso_code_2', 'RO')->value('id');

                    // Determine name to use (prefer user name over address name)
                    $shippingFirstName = $userFirstName ?? ($shippingAddress->first_name ?? '');
                    $shippingLastName = $userLastName ?? ($shippingAddress->last_name ?? '');

                    // For companies, use company name if no user name
                    if ($customer->customer_type === 'company' && empty($shippingFirstName)) {
                        $shippingFirstName = $customer->company_name ?? '';
                    }

                    // Create shipping address
                    if ($shippingAddress) {
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'shipping',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $shippingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $shippingLastName,
                            'phone' => $shippingAddress->phone ?? $customer->phone,
                            'email' => $userEmail,
                            'address_line_1' => $shippingAddress->address_line_1,
                            'address_line_2' => $shippingAddress->address_line_2,
                            'city' => $shippingAddress->city,
                            'county_name' => $shippingAddress->county_name,
                            'county_code' => $shippingAddress->county_code,
                            'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                            'zip_code' => $shippingAddress->zip_code,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        // Create default shipping address if none exists (fallback)
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'shipping',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $shippingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $shippingLastName,
                            'phone' => $customer->phone ?? '0712345678',
                            'email' => $userEmail,
                            'address_line_1' => 'Strada Exemplu, Nr. 1',
                            'address_line_2' => null,
                            'city' => 'București',
                            'county_name' => 'București',
                            'county_code' => 'B',
                            'country_id' => $defaultCountryId,
                            'zip_code' => '010001',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    // Determine billing name (prefer user name over address name)
                    $billingFirstName = $userFirstName ?? ($billingAddress->first_name ?? '');
                    $billingLastName = $userLastName ?? ($billingAddress->last_name ?? '');

                    // For companies, use company name if no user name
                    if ($customer->customer_type === 'company' && empty($billingFirstName)) {
                        $billingFirstName = $customer->company_name ?? '';
                    }

                    // Create billing address
                    if ($billingAddress) {
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'billing',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $billingLastName,
                            'phone' => $billingAddress->phone ?? $customer->phone,
                            'email' => $userEmail,
                            'address_line_1' => $billingAddress->address_line_1,
                            'address_line_2' => $billingAddress->address_line_2,
                            'city' => $billingAddress->city,
                            'county_name' => $billingAddress->county_name,
                            'county_code' => $billingAddress->county_code,
                            'country_id' => $billingAddress->country_id ?? $defaultCountryId,
                            'zip_code' => $billingAddress->zip_code,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        // If no billing address but we have shipping address, use shipping for billing
                        if ($shippingAddress) {
                            DB::table('order_addresses')->insert([
                                'order_id' => $orderId,
                                'type' => 'billing',
                                'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                                'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                                'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                                'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                                'last_name' => $billingLastName,
                                'phone' => $shippingAddress->phone ?? $customer->phone,
                                'email' => $userEmail,
                                'address_line_1' => $shippingAddress->address_line_1,
                                'address_line_2' => $shippingAddress->address_line_2,
                                'city' => $shippingAddress->city,
                                'county_name' => $shippingAddress->county_name,
                                'county_code' => $shippingAddress->county_code,
                                'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                                'zip_code' => $shippingAddress->zip_code,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        } else {
                            // Create default billing address if none exists (fallback)
                            DB::table('order_addresses')->insert([
                                'order_id' => $orderId,
                                'type' => 'billing',
                                'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                                'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                                'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                                'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                                'last_name' => $billingLastName,
                                'phone' => $customer->phone ?? '0712345678',
                                'email' => $userEmail,
                                'address_line_1' => 'Strada Exemplu, Nr. 1',
                                'address_line_2' => null,
                                'city' => 'București',
                                'county_name' => 'București',
                                'county_code' => 'B',
                                'country_id' => $defaultCountryId,
                                'zip_code' => '010001',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }

                // Store order info for shipping creation
                $orders[] = [
                    'id' => $orderId,
                    'order_number' => $orderNumber,
                    'status' => $statusValue,
                    'should_have_tracking' => $i < $withTracking,
                ];

                $orderCounter++;
            }

            $this->command->info("  → Created {$count} orders with status '{$status->label()}' ({$withTracking} with tracking)");
        }

        // Create 4 additional orders for each customer/user
        $this->command->info('Creating 4 additional orders for each customer...');
        $additionalOrdersCount = 0;
        foreach ($customersWithUsers as $customer) {
            $customerId = $customer->id;
            
            // Get customer data with addresses
            $customerData = $this->getCustomerData($customerId);
            if (!$customerData) {
                continue;
            }
            
            for ($i = 0; $i < 4; $i++) {
                // Random status from available statuses
                $randomStatusValue = array_rand($ordersPerStatus);
                $status = OrderStatus::from($randomStatusValue);
                $paymentMethodId = $paymentMethodIds[array_rand($paymentMethodIds)];

                // Select random products for this order (1-5 products)
                $numProducts = rand(1, min(5, count($productIds)));
                $selectedProductIds = array_rand($productIds, $numProducts);
                if (!is_array($selectedProductIds)) {
                    $selectedProductIds = [$selectedProductIds];
                }

                // Determine if order should be marked as paid automatically based on payment method
                $paymentMethodCode = DB::table('payment_methods')->where('id', $paymentMethodId)->value('code');
                $isPaid = $this->shouldMarkAsPaidAutomatically($paymentMethodCode);
                
                // For paid orders, set paid_at to a random date between order creation and now
                // For unpaid orders, sometimes mark as paid later (simulate admin marking it)
                $paidAt = null;
                if ($isPaid) {
                    // If paid automatically, paid_at should be close to created_at
                    $orderCreatedAt = now()->subDays(rand(0, 30));
                    $paidAt = $orderCreatedAt->copy()->addMinutes(rand(0, 60));
                } else {
                    // For unpaid orders, sometimes mark as paid later (30% chance)
                    // This simulates admin marking orders as paid after receiving payment
                    if (rand(1, 100) <= 30) {
                        $orderCreatedAt = now()->subDays(rand(0, 30));
                        // Paid between 1 hour and 5 days after order creation
                        $paidAt = $orderCreatedAt->copy()->addHours(rand(1, 120));
                    }
                }

                // Get VAT rate from customer's country
                $vatRate = $this->getVatRateForCountry($customerData['country_id']);
                
                // Get currency (default to RON, but can be extended)
                $currency = 'RON';
                $exchangeRate = $ronExchangeRate;

                // Generate invoice data (90% of orders will have invoice)
                $invoiceData = $this->generateInvoiceData();

                // Create order first to get ID, then generate order number
                // We'll update totals after adding products
                $orderCreatedAt = now()->subDays(rand(0, 30));
                $orderId = DB::table('orders')->insertGetId([
                    'customer_id' => $customerId,
                    'order_number' => 'TEMP-' . $orderCounter, // Temporary, will be updated
                    'invoice_series' => $invoiceData ? $invoiceData['series'] : null,
                    'invoice_number' => $invoiceData ? $invoiceData['number'] : null,
                    'currency' => $currency,
                    'exchange_rate' => $exchangeRate,
                    'vat_rate_applied' => $vatRate,
                    'is_vat_exempt' => false,
                    'total_excl_vat' => 0, // Will be updated after products are added
                    'total_incl_vat' => 0, // Will be updated after products are added
                    'total_ron_excl_vat' => 0, // Will be updated after products are added
                    'total_ron_incl_vat' => 0, // Will be updated after products are added
                    'payment_method_id' => $paymentMethodId,
                    'status' => $status->value,
                    'is_paid' => $paidAt !== null,
                    'paid_at' => $paidAt,
                    'created_at' => $orderCreatedAt,
                    'updated_at' => $orderCreatedAt,
                ]);

                // Generate order number using new format
                $orderNumber = $this->codeGenerator->generateFromId($orderId);

                // Update order with generated order number
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update(['order_number' => $orderNumber]);

                // Add products to order
                $orderTotalExclVat = 0;
                $orderTotalInclVat = 0;
                $orderTotalRonExclVat = 0;
                $orderTotalRonInclVat = 0;
                $vatRates = [];

                foreach ($selectedProductIds as $productIdKey) {
                    $productId = $productIds[$productIdKey];
                    $product = $productsById->get($productId);

                    if (!$product) {
                        continue;
                    }

                    // Random quantity (1-5)
                    $quantity = rand(1, 5);

                    // Get price for this customer group (from ProductGroupPrice if available, otherwise base price)
                    $unitPriceRon = $this->getProductPriceForCustomerGroup(
                        $productId,
                        $customer->customer_group_id,
                        $quantity,
                        (float) $product->price_ron
                    );
                    $unitPurchasePriceRon = (float) ($product->purchase_price_ron ?? 0);

                    // Calculate VAT
                    $unitPriceExclVatRon = round($unitPriceRon / (1 + $vatRate / 100), 2);
                    $totalRonExclVat = round($unitPriceExclVatRon * $quantity, 2);
                    $totalRonInclVat = round($unitPriceRon * $quantity, 2);

                    // For currency (using exchange rate from database)
                    // Divide by exchange rate as per CurrencyConverter logic (for RON, rate is 1.0 so no change)
                    $exchangeRate = $ronExchangeRate;
                    $unitPriceCurrency = round($unitPriceRon / $exchangeRate, 2);
                    $unitPriceExclVatCurrency = round($unitPriceExclVatRon / $exchangeRate, 2);
                    $totalCurrencyExclVat = round($unitPriceExclVatCurrency * $quantity, 2);
                    $totalCurrencyInclVat = round($unitPriceCurrency * $quantity, 2);

                    // Calculate profit
                    $profitRon = round(($unitPriceExclVatRon - $unitPurchasePriceRon) * $quantity, 2);

                    // Insert order product
                    DB::table('order_products')->insert([
                        'order_id' => $orderId,
                        'product_id' => $productId,
                        'name' => $product->name,
                        'sku' => $product->sku,
                        'ean' => $product->ean,
                        'quantity' => $quantity,
                        'vat_percent' => $vatRate,
                        'exchange_rate' => $exchangeRate,
                        'unit_price_currency' => $unitPriceCurrency,
                        'unit_price_ron' => $unitPriceRon,
                        'unit_purchase_price_ron' => $unitPurchasePriceRon,
                        'total_currency_excl_vat' => $totalCurrencyExclVat,
                        'total_currency_incl_vat' => $totalCurrencyInclVat,
                        'total_ron_excl_vat' => $totalRonExclVat,
                        'total_ron_incl_vat' => $totalRonInclVat,
                        'profit_ron' => $profitRon,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Accumulate totals
                    $orderTotalExclVat = round($orderTotalExclVat + $totalCurrencyExclVat, 2);
                    $orderTotalInclVat = round($orderTotalInclVat + $totalCurrencyInclVat, 2);
                    $orderTotalRonExclVat = round($orderTotalRonExclVat + $totalRonExclVat, 2);
                    $orderTotalRonInclVat = round($orderTotalRonInclVat + $totalRonInclVat, 2);
                    $vatRates[] = $vatRate;
                }

                // Calculate average VAT rate
                $averageVatRate = !empty($vatRates) ? round(array_sum($vatRates) / count($vatRates), 2) : $vatRate;

                // Update order totals based on actual products
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update([
                        'total_excl_vat' => $orderTotalExclVat,
                        'total_incl_vat' => $orderTotalInclVat,
                        'total_ron_excl_vat' => $orderTotalRonExclVat,
                        'total_ron_incl_vat' => $orderTotalRonInclVat,
                        'vat_rate_applied' => $averageVatRate,
                    ]);

                // Create order addresses from customer addresses
                $customer = DB::table('customers')->where('id', $customerId)->first();
                if ($customer) {
                    // Get user data (for name and email) - get first user for this customer
                    $user = DB::table('users')->where('customer_id', $customerId)->first();
                    if (!$user) {
                        throw new \Exception("Customer ID {$customerId} does not have an associated user. This should not happen.");
                    }

                    $userEmail = $user->email ?? null;
                    $userFirstName = $user->first_name ?? null;
                    $userLastName = $user->last_name ?? null;

                    // Get customer addresses - prefer preferred addresses
                    $shippingAddress = DB::table('addresses')
                        ->where('customer_id', $customerId)
                        ->where('address_type', 'shipping')
                        ->orderBy('is_preferred', 'desc')
                        ->orderBy('id', 'asc')
                        ->first();

                    // For billing, prefer headquarters (for companies) then billing type
                    $billingAddress = DB::table('addresses')
                        ->where('customer_id', $customerId)
                        ->where(function ($q) {
                            $q->where('address_type', 'headquarters')
                                ->orWhere('address_type', 'billing');
                        })
                        ->orderByRaw("CASE WHEN address_type = 'headquarters' THEN 0 ELSE 1 END")
                        ->orderBy('is_preferred', 'desc')
                        ->orderBy('id', 'asc')
                        ->first();

                    // If no shipping address, try to use any address
                    if (!$shippingAddress) {
                        $shippingAddress = DB::table('addresses')
                            ->where('customer_id', $customerId)
                            ->orderBy('is_preferred', 'desc')
                            ->orderBy('id', 'asc')
                            ->first();
                    }

                    // Get default country (Romania)
                    $defaultCountryId = DB::table('countries')->where('iso_code_2', 'RO')->value('id');

                    // Determine name to use (prefer user name over address name)
                    $shippingFirstName = $userFirstName ?? ($shippingAddress->first_name ?? '');
                    $shippingLastName = $userLastName ?? ($shippingAddress->last_name ?? '');

                    // For companies, use company name if no user name
                    if ($customer->customer_type === 'company' && empty($shippingFirstName)) {
                        $shippingFirstName = $customer->company_name ?? '';
                    }

                    // Create shipping address
                    if ($shippingAddress) {
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'shipping',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $shippingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $shippingLastName,
                            'phone' => $shippingAddress->phone ?? $customer->phone,
                            'email' => $userEmail,
                            'address_line_1' => $shippingAddress->address_line_1,
                            'address_line_2' => $shippingAddress->address_line_2,
                            'city' => $shippingAddress->city,
                            'county_name' => $shippingAddress->county_name,
                            'county_code' => $shippingAddress->county_code,
                            'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                            'zip_code' => $shippingAddress->zip_code,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        // Create default shipping address if none exists (fallback)
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'shipping',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $shippingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $shippingLastName,
                            'phone' => $customer->phone ?? '0712345678',
                            'email' => $userEmail,
                            'address_line_1' => 'Strada Exemplu, Nr. 1',
                            'address_line_2' => null,
                            'city' => 'București',
                            'county_name' => 'București',
                            'county_code' => 'B',
                            'country_id' => $defaultCountryId,
                            'zip_code' => '010001',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    // Determine billing name (prefer user name over address name)
                    $billingFirstName = $userFirstName ?? ($billingAddress->first_name ?? '');
                    $billingLastName = $userLastName ?? ($billingAddress->last_name ?? '');

                    // For companies, use company name if no user name
                    if ($customer->customer_type === 'company' && empty($billingFirstName)) {
                        $billingFirstName = $customer->company_name ?? '';
                    }

                    // Create billing address
                    if ($billingAddress) {
                        DB::table('order_addresses')->insert([
                            'order_id' => $orderId,
                            'type' => 'billing',
                            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                            'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                            'last_name' => $billingLastName,
                            'phone' => $billingAddress->phone ?? $customer->phone,
                            'email' => $userEmail,
                            'address_line_1' => $billingAddress->address_line_1,
                            'address_line_2' => $billingAddress->address_line_2,
                            'city' => $billingAddress->city,
                            'county_name' => $billingAddress->county_name,
                            'county_code' => $billingAddress->county_code,
                            'country_id' => $billingAddress->country_id ?? $defaultCountryId,
                            'zip_code' => $billingAddress->zip_code,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        // If no billing address but we have shipping address, use shipping for billing
                        if ($shippingAddress) {
                            DB::table('order_addresses')->insert([
                                'order_id' => $orderId,
                                'type' => 'billing',
                                'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                                'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                                'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                                'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                                'last_name' => $billingLastName,
                                'phone' => $shippingAddress->phone ?? $customer->phone,
                                'email' => $userEmail,
                                'address_line_1' => $shippingAddress->address_line_1,
                                'address_line_2' => $shippingAddress->address_line_2,
                                'city' => $shippingAddress->city,
                                'county_name' => $shippingAddress->county_name,
                                'county_code' => $shippingAddress->county_code,
                                'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                                'zip_code' => $shippingAddress->zip_code,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        } else {
                            // Create default billing address if none exists (fallback)
                            DB::table('order_addresses')->insert([
                                'order_id' => $orderId,
                                'type' => 'billing',
                                'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
                                'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
                                'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
                                'first_name' => $billingFirstName ?: ($customer->customer_type === 'company' ? $customer->company_name : 'Client'),
                                'last_name' => $billingLastName,
                                'phone' => $customer->phone ?? '0712345678',
                                'email' => $userEmail,
                                'address_line_1' => 'Strada Exemplu, Nr. 1',
                                'address_line_2' => null,
                                'city' => 'București',
                                'county_name' => 'București',
                                'county_code' => 'B',
                                'country_id' => $defaultCountryId,
                                'zip_code' => '010001',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }

                // Store order info for shipping creation
                $orders[] = [
                    'id' => $orderId,
                    'order_number' => $orderNumber,
                    'status' => $status->value,
                    'should_have_tracking' => in_array($status, [OrderStatus::SHIPPED, OrderStatus::DELIVERED]) && rand(1, 100) <= 50, // 50% chance for shipped/delivered
                ];

                $orderCounter++;
                $additionalOrdersCount++;
            }
        }
        $this->command->info("  → Created {$additionalOrdersCount} additional orders (4 per customer)");

        // Create 5 orders in EUR and 5 in USD for each customer
        $this->command->info('Creating 5 EUR orders and 5 USD orders for each customer...');
        $eurUsdOrdersCount = 0;
        foreach ($customersWithUsers as $customer) {
            $customerId = $customer->id;
            
            // Get customer data with addresses
            $customerData = $this->getCustomerData($customerId);
            if (!$customerData) {
                continue;
            }
            
            // Create 5 orders in EUR
            for ($i = 0; $i < 5; $i++) {
                $orderId = $this->createOrderWithCurrency(
                    $customerId,
                    $customer,
                    $customerData,
                    'EUR',
                    $eurExchangeRate,
                    $paymentMethodIds,
                    $productIds,
                    $productsById,
                    $ordersPerStatus,
                    $orderCounter
                );
                if ($orderId) {
                    $orders[] = [
                        'id' => $orderId,
                        'order_number' => DB::table('orders')->where('id', $orderId)->value('order_number'),
                        'status' => DB::table('orders')->where('id', $orderId)->value('status'),
                        'should_have_tracking' => rand(1, 100) <= 30, // 30% chance
                    ];
                    $orderCounter++;
                    $eurUsdOrdersCount++;
                }
            }
            
            // Create 5 orders in USD
            for ($i = 0; $i < 5; $i++) {
                $orderId = $this->createOrderWithCurrency(
                    $customerId,
                    $customer,
                    $customerData,
                    'USD',
                    $usdExchangeRate,
                    $paymentMethodIds,
                    $productIds,
                    $productsById,
                    $ordersPerStatus,
                    $orderCounter
                );
                if ($orderId) {
                    $orders[] = [
                        'id' => $orderId,
                        'order_number' => DB::table('orders')->where('id', $orderId)->value('order_number'),
                        'status' => DB::table('orders')->where('id', $orderId)->value('status'),
                        'should_have_tracking' => rand(1, 100) <= 30, // 30% chance
                    ];
                    $orderCounter++;
                    $eurUsdOrdersCount++;
                }
            }
        }
        $this->command->info("  → Created {$eurUsdOrdersCount} additional orders (5 EUR + 5 USD per customer)");

        // Create orders with German addresses
        $this->command->info('Creating orders with German addresses...');
        $germanOrdersCount = 0;
        $germanyId = DB::table('countries')->where('iso_code_2', 'DE')->value('id');
        
        if (!$germanyId) {
            $this->command->warn('  ⚠️  Germany (DE) not found in countries table. Skipping German orders.');
        } else {
            // Get German VAT rate
            $germanVatRate = $this->getVatRateForCountry($germanyId);
            
            // German cities and addresses
            $germanCities = [
                ['city' => 'Berlin', 'county' => 'Berlin', 'county_code' => 'BE', 'zip' => '10115'],
                ['city' => 'Munich', 'county' => 'Bavaria', 'county_code' => 'BY', 'zip' => '80331'],
                ['city' => 'Hamburg', 'county' => 'Hamburg', 'county_code' => 'HH', 'zip' => '20095'],
                ['city' => 'Frankfurt', 'county' => 'Hesse', 'county_code' => 'HE', 'zip' => '60311'],
                ['city' => 'Cologne', 'county' => 'North Rhine-Westphalia', 'county_code' => 'NW', 'zip' => '50667'],
                ['city' => 'Stuttgart', 'county' => 'Baden-Württemberg', 'county_code' => 'BW', 'zip' => '70173'],
                ['city' => 'Düsseldorf', 'county' => 'North Rhine-Westphalia', 'county_code' => 'NW', 'zip' => '40213'],
                ['city' => 'Dortmund', 'county' => 'North Rhine-Westphalia', 'county_code' => 'NW', 'zip' => '44135'],
            ];
            
            // Create 5 orders with German addresses
            for ($i = 0; $i < 5; $i++) {
                // Select a random customer
                $customerId = $availableCustomerIds[array_rand($availableCustomerIds)];
                $customer = $customersWithUsers->firstWhere('id', $customerId);
                if (!$customer) {
                    continue;
                }
                
                // Get customer data
                $customerData = $this->getCustomerData($customerId);
                if (!$customerData) {
                    continue;
                }
                
                // Select random German city
                $germanCity = $germanCities[array_rand($germanCities)];
                
                // Random status
                $randomStatusValue = array_rand($ordersPerStatus);
                $status = OrderStatus::from($randomStatusValue);
                $paymentMethodId = $paymentMethodIds[array_rand($paymentMethodIds)];
                
                // Select random products
                $numProducts = rand(1, min(5, count($productIds)));
                $selectedProductIds = array_rand($productIds, $numProducts);
                if (!is_array($selectedProductIds)) {
                    $selectedProductIds = [$selectedProductIds];
                }
                
                // Determine if order should be marked as paid automatically
                $paymentMethodCode = DB::table('payment_methods')->where('id', $paymentMethodId)->value('code');
                $isPaid = $this->shouldMarkAsPaidAutomatically($paymentMethodCode);
                
                $paidAt = null;
                if ($isPaid) {
                    $orderCreatedAt = now()->subDays(rand(0, 30));
                    $paidAt = $orderCreatedAt->copy()->addMinutes(rand(0, 60));
                } else {
                    if (rand(1, 100) <= 30) {
                        $orderCreatedAt = now()->subDays(rand(0, 30));
                        $paidAt = $orderCreatedAt->copy()->addHours(rand(1, 120));
                    }
                }
                
                // Generate invoice data (90% of orders will have invoice)
                $invoiceData = $this->generateInvoiceData();

                // Create order
                $orderCreatedAt = now()->subDays(rand(0, 30));
                $orderId = DB::table('orders')->insertGetId([
                    'customer_id' => $customerId,
                    'order_number' => 'TEMP-' . $orderCounter,
                    'invoice_series' => $invoiceData ? $invoiceData['series'] : null,
                    'invoice_number' => $invoiceData ? $invoiceData['number'] : null,
                    'currency' => 'EUR',
                    'exchange_rate' => $eurExchangeRate,
                    'vat_rate_applied' => $germanVatRate,
                    'is_vat_exempt' => false,
                    'total_excl_vat' => 0,
                    'total_incl_vat' => 0,
                    'total_ron_excl_vat' => 0,
                    'total_ron_incl_vat' => 0,
                    'payment_method_id' => $paymentMethodId,
                    'status' => $status->value,
                    'is_paid' => $paidAt !== null,
                    'paid_at' => $paidAt,
                    'created_at' => $orderCreatedAt,
                    'updated_at' => $orderCreatedAt,
                ]);
                
                // Generate order number
                $orderNumber = $this->codeGenerator->generateFromId($orderId);
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update(['order_number' => $orderNumber]);
                
                // Add products to order
                $orderTotalExclVat = 0;
                $orderTotalInclVat = 0;
                $orderTotalRonExclVat = 0;
                $orderTotalRonInclVat = 0;
                $vatRates = [];
                
                foreach ($selectedProductIds as $productIdKey) {
                    $productId = $productIds[$productIdKey];
                    $product = $productsById->get($productId);
                    
                    if (!$product) {
                        continue;
                    }
                    
                    $quantity = rand(1, 5);
                    $unitPriceRon = $this->getProductPriceForCustomerGroup(
                        $productId,
                        $customer->customer_group_id,
                        $quantity,
                        (float) $product->price_ron
                    );
                    $unitPurchasePriceRon = (float) ($product->purchase_price_ron ?? 0);
                    
                    // Calculate VAT with German rate
                    $unitPriceExclVatRon = round($unitPriceRon / (1 + $germanVatRate / 100), 2);
                    $totalRonExclVat = round($unitPriceExclVatRon * $quantity, 2);
                    $totalRonInclVat = round($unitPriceRon * $quantity, 2);
                    
                    // Convert to EUR (divide by exchange rate, as per CurrencyConverter logic)
                    $unitPriceCurrency = round($unitPriceRon / $eurExchangeRate, 2);
                    $unitPriceExclVatCurrency = round($unitPriceExclVatRon / $eurExchangeRate, 2);
                    $totalCurrencyExclVat = round($unitPriceExclVatCurrency * $quantity, 2);
                    $totalCurrencyInclVat = round($unitPriceCurrency * $quantity, 2);
                    
                    $profitRon = round(($unitPriceExclVatRon - $unitPurchasePriceRon) * $quantity, 2);
                    
                    DB::table('order_products')->insert([
                        'order_id' => $orderId,
                        'product_id' => $productId,
                        'name' => $product->name,
                        'sku' => $product->sku,
                        'ean' => $product->ean,
                        'quantity' => $quantity,
                        'vat_percent' => $germanVatRate,
                        'exchange_rate' => $eurExchangeRate,
                        'unit_price_currency' => $unitPriceCurrency,
                        'unit_price_ron' => $unitPriceRon,
                        'unit_purchase_price_ron' => $unitPurchasePriceRon,
                        'total_currency_excl_vat' => $totalCurrencyExclVat,
                        'total_currency_incl_vat' => $totalCurrencyInclVat,
                        'total_ron_excl_vat' => $totalRonExclVat,
                        'total_ron_incl_vat' => $totalRonInclVat,
                        'profit_ron' => $profitRon,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    $orderTotalExclVat = round($orderTotalExclVat + $totalCurrencyExclVat, 2);
                    $orderTotalInclVat = round($orderTotalInclVat + $totalCurrencyInclVat, 2);
                    $orderTotalRonExclVat = round($orderTotalRonExclVat + $totalRonExclVat, 2);
                    $orderTotalRonInclVat = round($orderTotalRonInclVat + $totalRonInclVat, 2);
                    $vatRates[] = $germanVatRate;
                }
                
                // Update order totals
                $averageVatRate = !empty($vatRates) ? round(array_sum($vatRates) / count($vatRates), 2) : $germanVatRate;
                DB::table('orders')
                    ->where('id', $orderId)
                    ->update([
                        'total_excl_vat' => $orderTotalExclVat,
                        'total_incl_vat' => $orderTotalInclVat,
                        'total_ron_excl_vat' => $orderTotalRonExclVat,
                        'total_ron_incl_vat' => $orderTotalRonInclVat,
                        'vat_rate_applied' => $averageVatRate,
                    ]);
                
                // Get user data
                $userEmail = $customerData['user_email'] ?? null;
                $userFirstName = $customerData['user_first_name'] ?? null;
                $userLastName = $customerData['user_last_name'] ?? null;
                $customerObj = $customerData['customer'];
                
                // Create German shipping address
                DB::table('order_addresses')->insert([
                    'order_id' => $orderId,
                    'type' => 'shipping',
                    'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                    'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                    'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                    'first_name' => $userFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                    'last_name' => $userLastName,
                    'phone' => $customerObj->phone ?? '+49 30 12345678',
                    'email' => $userEmail,
                    'address_line_1' => 'Musterstraße ' . rand(1, 200),
                    'address_line_2' => rand(1, 100) <= 30 ? 'Wohnung ' . rand(1, 50) : null,
                    'city' => $germanCity['city'],
                    'county_name' => $germanCity['county'],
                    'county_code' => $germanCity['county_code'],
                    'country_id' => $germanyId,
                    'zip_code' => $germanCity['zip'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                // Create German billing address (same as shipping for simplicity)
                DB::table('order_addresses')->insert([
                    'order_id' => $orderId,
                    'type' => 'billing',
                    'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                    'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                    'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                    'first_name' => $userFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                    'last_name' => $userLastName,
                    'phone' => $customerObj->phone ?? '+49 30 12345678',
                    'email' => $userEmail,
                    'address_line_1' => 'Musterstraße ' . rand(1, 200),
                    'address_line_2' => rand(1, 100) <= 30 ? 'Wohnung ' . rand(1, 50) : null,
                    'city' => $germanCity['city'],
                    'county_name' => $germanCity['county'],
                    'county_code' => $germanCity['county_code'],
                    'country_id' => $germanyId,
                    'zip_code' => $germanCity['zip'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                // Store order info for shipping creation
                $orders[] = [
                    'id' => $orderId,
                    'order_number' => $orderNumber,
                    'status' => $status->value,
                    'should_have_tracking' => in_array($status, [OrderStatus::SHIPPED, OrderStatus::DELIVERED]) && rand(1, 100) <= 70,
                ];
                
                $orderCounter++;
                $germanOrdersCount++;
            }
            
            $this->command->info("  → Created {$germanOrdersCount} orders with German addresses");
        }

        // Create shipping records with tracking numbers for some orders
        $samedayId = DB::table('shipping_methods')->where('code', 'sameday_locker')->value('id');
        $fancourierId = DB::table('shipping_methods')->where('code', 'fancourier')->value('id');
        $glsId = DB::table('shipping_methods')->where('code', 'gls')->value('id');
        $dpdId = DB::table('shipping_methods')->where('code', 'dpd')->value('id');

        $shippingMethods = array_filter([$samedayId, $fancourierId, $glsId, $dpdId], fn($id) => $id !== null);
        if (empty($shippingMethods)) {
            $this->command->warn('  ⚠️  No shipping methods found. Skipping shipping records.');
        } else {
            $shippingMethods = array_values($shippingMethods);
            $trackingCounter = 1;

            foreach ($orders as $order) {
                // Only create shipping for orders that should have tracking or are in shipped/delivered status
                $needsShipping = $order['should_have_tracking']
                    || in_array($order['status'], [OrderStatus::SHIPPED->value, OrderStatus::DELIVERED->value, OrderStatus::PROCESSING->value]);

                if ($needsShipping) {
                    $shippingMethodId = $shippingMethods[array_rand($shippingMethods)];
                    $trackingNumber = null;

                    // Generate tracking number for orders that should have it
                    if ($order['should_have_tracking']) {
                        // Generate realistic tracking numbers based on shipping method
                        $shippingMethod = DB::table('shipping_methods')->where('id', $shippingMethodId)->first();
                        $methodCode = $shippingMethod->code ?? 'default';

                        $trackingNumber = match ($methodCode) {
                            'sameday_locker' => 'SD' . str_pad($trackingCounter, 10, '0', STR_PAD_LEFT) . 'RO',
                            'fancourier' => 'FC' . str_pad($trackingCounter, 10, '0', STR_PAD_LEFT) . 'RO',
                            'gls' => 'GLS' . str_pad($trackingCounter, 9, '0', STR_PAD_LEFT),
                            'dpd' => 'DPD' . str_pad($trackingCounter, 9, '0', STR_PAD_LEFT),
                            default => 'TRK' . str_pad($trackingCounter, 10, '0', STR_PAD_LEFT),
                        };
                        $trackingCounter++;
                    }

                    $shippingCostExclVat = round(rand(15, 30) + (rand(0, 99) / 100), 2);
                    $shippingCostInclVat = round($shippingCostExclVat * 1.19, 2);

                    DB::table('order_shipping')->insert([
                        'order_id' => $order['id'],
                        'shipping_method_id' => $shippingMethodId,
                        'title' => 'Livrare standard',
                        'pickup_point_id' => null,
                        'tracking_number' => $trackingNumber,
                        'shipping_cost_excl_vat' => $shippingCostExclVat,
                        'shipping_cost_incl_vat' => $shippingCostInclVat,
                        'shipping_cost_ron_excl_vat' => $shippingCostExclVat,
                        'shipping_cost_ron_incl_vat' => $shippingCostInclVat,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $this->command->info("  → Created shipping records with " . ($trackingCounter - 1) . " tracking numbers");
        }

        $this->command->info("  → Total orders created: " . count($orders));
    }

    /**
     * Get all customer data including user info, addresses, and country.
     * 
     * @param int $customerId
     * @return array|null
     */
    private function getCustomerData(int $customerId): ?array
    {
        $customer = DB::table('customers')->where('id', $customerId)->first();
        if (!$customer) {
            return null;
        }

        // Get user data (for name and email) - get first user for this customer
        $user = DB::table('users')->where('customer_id', $customerId)->first();
        if (!$user) {
            return null;
        }

        // Get customer addresses - prefer preferred addresses
        $shippingAddress = DB::table('addresses')
            ->where('customer_id', $customerId)
            ->where('address_type', 'shipping')
            ->orderBy('is_preferred', 'desc')
            ->orderBy('id', 'asc')
            ->first();

        // For billing, prefer headquarters (for companies) then billing type
        $billingAddress = DB::table('addresses')
            ->where('customer_id', $customerId)
            ->where(function ($q) {
                $q->where('address_type', 'headquarters')
                    ->orWhere('address_type', 'billing');
            })
            ->orderByRaw("CASE WHEN address_type = 'headquarters' THEN 0 ELSE 1 END")
            ->orderBy('is_preferred', 'desc')
            ->orderBy('id', 'asc')
            ->first();

        // If no shipping address, try to use any address
        if (!$shippingAddress) {
            $shippingAddress = DB::table('addresses')
                ->where('customer_id', $customerId)
                ->orderBy('is_preferred', 'desc')
                ->orderBy('id', 'asc')
                ->first();
        }

        // Get country ID from address (prefer billing, then shipping, then default to Romania)
        $countryId = $billingAddress->country_id 
            ?? $shippingAddress->country_id 
            ?? DB::table('countries')->where('iso_code_2', 'RO')->value('id');

        return [
            'customer' => $customer,
            'user_email' => $user->email ?? null,
            'user_first_name' => $user->first_name ?? null,
            'user_last_name' => $user->last_name ?? null,
            'shipping_address' => $shippingAddress,
            'billing_address' => $billingAddress,
            'country_id' => $countryId,
        ];
    }

    /**
     * Get VAT rate for a country.
     * 
     * @param int|null $countryId
     * @return float Default VAT rate (19.00 for Romania) if not found
     */
    private function getVatRateForCountry(?int $countryId): float
    {
        if (!$countryId) {
            // Default to Romania VAT rate
            $countryId = DB::table('countries')->where('iso_code_2', 'RO')->value('id');
        }

        $vatRate = DB::table('vat_rates')
            ->where('country_id', $countryId)
            ->value('rate');

        // Default to 19.00 (Romania standard VAT) if not found
        return $vatRate ? (float) $vatRate : 19.00;
    }

    /**
     * Get product price for a specific customer group and quantity.
     * Uses ProductGroupPrice if available, otherwise falls back to base price.
     * 
     * @param int $productId
     * @param int|null $customerGroupId
     * @param int $quantity
     * @param float $basePrice Base price from products table
     * @return float Price in RON
     */
    private function getProductPriceForCustomerGroup(int $productId, ?int $customerGroupId, int $quantity, float $basePrice): float
    {
        if (!$customerGroupId) {
            return $basePrice;
        }

        // Get the best matching group price (highest min_quantity <= quantity)
        $groupPrice = DB::table('product_group_prices')
            ->where('product_id', $productId)
            ->where('customer_group_id', $customerGroupId)
            ->where('min_quantity', '<=', $quantity)
            ->orderBy('min_quantity', 'desc')
            ->first();

        if ($groupPrice) {
            return (float) $groupPrice->price_ron;
        }

        return $basePrice;
    }

    /**
     * Create an order with a specific currency.
     * 
     * @param int $customerId
     * @param object $customer
     * @param array $customerData
     * @param string $currencyCode
     * @param float $exchangeRate
     * @param array $paymentMethodIds
     * @param array $productIds
     * @param \Illuminate\Support\Collection $productsById
     * @param array $ordersPerStatus
     * @param int $orderCounter
     * @return int|null Order ID or null if failed
     */
    private function createOrderWithCurrency(
        int $customerId,
        object $customer,
        array $customerData,
        string $currencyCode,
        float $exchangeRate,
        array $paymentMethodIds,
        array $productIds,
        $productsById,
        array $ordersPerStatus,
        int $orderCounter
    ): ?int {
        // Random status from available statuses
        $randomStatusValue = array_rand($ordersPerStatus);
        $status = OrderStatus::from($randomStatusValue);
        $paymentMethodId = $paymentMethodIds[array_rand($paymentMethodIds)];

        // Select random products for this order (1-5 products)
        $numProducts = rand(1, min(5, count($productIds)));
        $selectedProductIds = array_rand($productIds, $numProducts);
        if (!is_array($selectedProductIds)) {
            $selectedProductIds = [$selectedProductIds];
        }

        // Get VAT rate from customer's country
        $vatRate = $this->getVatRateForCountry($customerData['country_id']);

        // Determine if order should be marked as paid automatically based on payment method
        $paymentMethodCode = DB::table('payment_methods')->where('id', $paymentMethodId)->value('code');
        $isPaid = $this->shouldMarkAsPaidAutomatically($paymentMethodCode);
        
        // For paid orders, set paid_at to a random date between order creation and now
        // For unpaid orders, sometimes mark as paid later (simulate admin marking it)
        $paidAt = null;
        if ($isPaid) {
            // If paid automatically, paid_at should be close to created_at
            $orderCreatedAt = now()->subDays(rand(0, 30));
            $paidAt = $orderCreatedAt->copy()->addMinutes(rand(0, 60));
        } else {
            // For unpaid orders, sometimes mark as paid later (30% chance)
            // This simulates admin marking orders as paid after receiving payment
            if (rand(1, 100) <= 30) {
                $orderCreatedAt = now()->subDays(rand(0, 30));
                // Paid between 1 hour and 5 days after order creation
                $paidAt = $orderCreatedAt->copy()->addHours(rand(1, 120));
            }
        }

        // Generate invoice data (90% of orders will have invoice)
        $invoiceData = $this->generateInvoiceData();

        // Create order first to get ID, then generate order number
        // We'll update totals after adding products
        $orderCreatedAt = now()->subDays(rand(0, 30));
        $orderId = DB::table('orders')->insertGetId([
            'customer_id' => $customerId,
            'order_number' => 'TEMP-' . $orderCounter, // Temporary, will be updated
            'invoice_series' => $invoiceData['series'] ?? null,
            'invoice_number' => $invoiceData['number'] ?? null,
            'currency' => $currencyCode,
            'exchange_rate' => $exchangeRate,
            'vat_rate_applied' => $vatRate,
            'is_vat_exempt' => false,
            'total_excl_vat' => 0, // Will be updated after products are added
            'total_incl_vat' => 0, // Will be updated after products are added
            'total_ron_excl_vat' => 0, // Will be updated after products are added
            'total_ron_incl_vat' => 0, // Will be updated after products are added
            'payment_method_id' => $paymentMethodId,
            'status' => $status->value,
            'is_paid' => $paidAt !== null,
            'paid_at' => $paidAt,
            'created_at' => $orderCreatedAt,
            'updated_at' => $orderCreatedAt,
        ]);

        // Generate order number using new format
        $orderNumber = $this->codeGenerator->generateFromId($orderId);

        // Update order with generated order number
        DB::table('orders')
            ->where('id', $orderId)
            ->update(['order_number' => $orderNumber]);

        // Add products to order
        $orderTotalExclVat = 0;
        $orderTotalInclVat = 0;
        $orderTotalRonExclVat = 0;
        $orderTotalRonInclVat = 0;
        $vatRates = [];

        foreach ($selectedProductIds as $productIdKey) {
            $productId = $productIds[$productIdKey];
            $product = $productsById->get($productId);

            if (!$product) {
                continue;
            }

            // Random quantity (1-5)
            $quantity = rand(1, 5);

            // Get price for this customer group (from ProductGroupPrice if available, otherwise base price)
            $unitPriceRon = $this->getProductPriceForCustomerGroup(
                $productId,
                $customer->customer_group_id,
                $quantity,
                (float) $product->price_ron
            );
            $unitPurchasePriceRon = (float) ($product->purchase_price_ron ?? 0);

            // Calculate VAT
            $unitPriceExclVatRon = round($unitPriceRon / (1 + $vatRate / 100), 2);
            $totalRonExclVat = round($unitPriceExclVatRon * $quantity, 2);
            $totalRonInclVat = round($unitPriceRon * $quantity, 2);

            // Convert to currency using exchange rate (divide by exchange rate, as per CurrencyConverter logic)
            // For RON, exchangeRate is 1.0, so division doesn't change the value
            $unitPriceCurrency = round($unitPriceRon / $exchangeRate, 2);
            $unitPriceExclVatCurrency = round($unitPriceExclVatRon / $exchangeRate, 2);
            $totalCurrencyExclVat = round($unitPriceExclVatCurrency * $quantity, 2);
            $totalCurrencyInclVat = round($unitPriceCurrency * $quantity, 2);

            // Calculate profit
            $profitRon = round(($unitPriceExclVatRon - $unitPurchasePriceRon) * $quantity, 2);

            // Insert order product
            DB::table('order_products')->insert([
                'order_id' => $orderId,
                'product_id' => $productId,
                'name' => $product->name,
                'sku' => $product->sku,
                'ean' => $product->ean,
                'quantity' => $quantity,
                'vat_percent' => $vatRate,
                'exchange_rate' => $exchangeRate,
                'unit_price_currency' => $unitPriceCurrency,
                'unit_price_ron' => $unitPriceRon,
                'unit_purchase_price_ron' => $unitPurchasePriceRon,
                'total_currency_excl_vat' => $totalCurrencyExclVat,
                'total_currency_incl_vat' => $totalCurrencyInclVat,
                'total_ron_excl_vat' => $totalRonExclVat,
                'total_ron_incl_vat' => $totalRonInclVat,
                'profit_ron' => $profitRon,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Accumulate totals
            $orderTotalExclVat = round($orderTotalExclVat + $totalCurrencyExclVat, 2);
            $orderTotalInclVat = round($orderTotalInclVat + $totalCurrencyInclVat, 2);
            $orderTotalRonExclVat = round($orderTotalRonExclVat + $totalRonExclVat, 2);
            $orderTotalRonInclVat = round($orderTotalRonInclVat + $totalRonInclVat, 2);
            $vatRates[] = $vatRate;
        }

        // Calculate average VAT rate
        $averageVatRate = !empty($vatRates) ? round(array_sum($vatRates) / count($vatRates), 2) : $vatRate;

        // Update order totals based on actual products
        DB::table('orders')
            ->where('id', $orderId)
            ->update([
                'total_excl_vat' => $orderTotalExclVat,
                'total_incl_vat' => $orderTotalInclVat,
                'total_ron_excl_vat' => $orderTotalRonExclVat,
                'total_ron_incl_vat' => $orderTotalRonInclVat,
                'vat_rate_applied' => $averageVatRate,
            ]);

        // Create order addresses from customer addresses (use already fetched data)
        if ($customerData) {
            $userEmail = $customerData['user_email'] ?? null;
            $userFirstName = $customerData['user_first_name'] ?? null;
            $userLastName = $customerData['user_last_name'] ?? null;
            $shippingAddress = $customerData['shipping_address'] ?? null;
            $billingAddress = $customerData['billing_address'] ?? null;
            $defaultCountryId = $customerData['country_id'] ?? DB::table('countries')->where('iso_code_2', 'RO')->value('id');
            $customerObj = $customerData['customer'];

            // Determine name to use (prefer user name over address name)
            $shippingFirstName = $userFirstName ?? ($shippingAddress?->first_name ?? '');
            $shippingLastName = $userLastName ?? ($shippingAddress?->last_name ?? '');

            // For companies, use company name if no user name
            if ($customerObj->customer_type === 'company' && empty($shippingFirstName)) {
                $shippingFirstName = $customerObj->company_name ?? '';
            }

            // Create shipping address
            if ($shippingAddress) {
                DB::table('order_addresses')->insert([
                    'order_id' => $orderId,
                    'type' => 'shipping',
                    'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                    'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                    'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                    'first_name' => $shippingFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                    'last_name' => $shippingLastName,
                    'phone' => $shippingAddress->phone ?? $customerObj->phone,
                    'email' => $userEmail,
                    'address_line_1' => $shippingAddress->address_line_1,
                    'address_line_2' => $shippingAddress->address_line_2,
                    'city' => $shippingAddress->city,
                    'county_name' => $shippingAddress->county_name,
                    'county_code' => $shippingAddress->county_code,
                    'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                    'zip_code' => $shippingAddress->zip_code,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                // Create default shipping address if none exists (fallback)
                DB::table('order_addresses')->insert([
                    'order_id' => $orderId,
                    'type' => 'shipping',
                    'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                    'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                    'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                    'first_name' => $shippingFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                    'last_name' => $shippingLastName,
                    'phone' => $customerObj->phone ?? '0712345678',
                    'email' => $userEmail,
                    'address_line_1' => 'Strada Exemplu, Nr. 1',
                    'address_line_2' => null,
                    'city' => 'București',
                    'county_name' => 'București',
                    'county_code' => 'B',
                    'country_id' => $defaultCountryId,
                    'zip_code' => '010001',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Determine billing name (prefer user name over address name)
            $billingFirstName = $userFirstName ?? ($billingAddress?->first_name ?? '');
            $billingLastName = $userLastName ?? ($billingAddress?->last_name ?? '');

            // For companies, use company name if no user name
            if ($customerObj->customer_type === 'company' && empty($billingFirstName)) {
                $billingFirstName = $customerObj->company_name ?? '';
            }

            // Create billing address
            if ($billingAddress) {
                DB::table('order_addresses')->insert([
                    'order_id' => $orderId,
                    'type' => 'billing',
                    'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                    'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                    'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                    'first_name' => $billingFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                    'last_name' => $billingLastName,
                    'phone' => $billingAddress->phone ?? $customerObj->phone,
                    'email' => $userEmail,
                    'address_line_1' => $billingAddress->address_line_1,
                    'address_line_2' => $billingAddress->address_line_2,
                    'city' => $billingAddress->city,
                    'county_name' => $billingAddress->county_name,
                    'county_code' => $billingAddress->county_code,
                    'country_id' => $billingAddress->country_id ?? $defaultCountryId,
                    'zip_code' => $billingAddress->zip_code,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                // If no billing address but we have shipping address, use shipping for billing
                if ($shippingAddress) {
                    DB::table('order_addresses')->insert([
                        'order_id' => $orderId,
                        'type' => 'billing',
                        'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                        'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                        'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                        'first_name' => $billingFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                        'last_name' => $billingLastName,
                        'phone' => $shippingAddress->phone ?? $customerObj->phone,
                        'email' => $userEmail,
                        'address_line_1' => $shippingAddress->address_line_1,
                        'address_line_2' => $shippingAddress->address_line_2,
                        'city' => $shippingAddress->city,
                        'county_name' => $shippingAddress->county_name,
                        'county_code' => $shippingAddress->county_code,
                        'country_id' => $shippingAddress->country_id ?? $defaultCountryId,
                        'zip_code' => $shippingAddress->zip_code,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Create default billing address if none exists (fallback)
                    DB::table('order_addresses')->insert([
                        'order_id' => $orderId,
                        'type' => 'billing',
                        'company_name' => $customerObj->customer_type === 'company' ? $customerObj->company_name : null,
                        'fiscal_code' => $customerObj->customer_type === 'company' ? $customerObj->fiscal_code : null,
                        'reg_number' => $customerObj->customer_type === 'company' ? $customerObj->reg_number : null,
                        'first_name' => $billingFirstName ?: ($customerObj->customer_type === 'company' ? $customerObj->company_name : 'Client'),
                        'last_name' => $billingLastName,
                        'phone' => $customerObj->phone ?? '0712345678',
                        'email' => $userEmail,
                        'address_line_1' => 'Strada Exemplu, Nr. 1',
                        'address_line_2' => null,
                        'city' => 'București',
                        'county_name' => 'București',
                        'county_code' => 'B',
                        'country_id' => $defaultCountryId,
                        'zip_code' => '010001',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        return $orderId;
    }

    /**
     * Determine if order should be marked as paid automatically based on payment method.
     * 
     * @param string|null $paymentMethodCode
     * @return bool
     */
    private function shouldMarkAsPaidAutomatically(?string $paymentMethodCode): bool
    {
        if (!$paymentMethodCode) {
            return false;
        }

        $paymentCode = strtolower($paymentMethodCode);

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
     * Generate invoice series and number for an order.
     * Returns null if order should not have an invoice (10% chance).
     * 
     * @return array{series: string, number: int}|null
     */
    private function generateInvoiceData(): ?array
    {
        // 90% of orders should have invoice
        if (rand(1, 100) > 90) {
            return null;
        }

        // Invoice series options
        $seriesOptions = ['FACT', 'INV', 'F'];
        $series = $seriesOptions[array_rand($seriesOptions)];

        // Initialize counter for this series if not exists
        if (!isset($this->invoiceCounters[$series])) {
            // Get the highest existing invoice number for this series
            $maxNumber = DB::table('orders')
                ->where('invoice_series', $series)
                ->whereNotNull('invoice_number')
                ->max('invoice_number') ?? 0;
            $this->invoiceCounters[$series] = (int) $maxNumber;
        }

        // Increment and return
        $this->invoiceCounters[$series]++;
        
        return [
            'series' => $series,
            'number' => $this->invoiceCounters[$series],
        ];
    }
}
