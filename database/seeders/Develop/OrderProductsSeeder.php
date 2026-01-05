<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Order Products Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds order line items (products in orders) for development/testing.
 * 
 * Depends on: OrdersSeeder, ProductsSeeder
 */
class OrderProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding order products...');
        $this->seedOrderProducts();
        $this->command->info('✓ Order products seeded successfully');
    }

    private function seedOrderProducts(): void
    {
        $eurRate = DB::table('currencies')->where('code', 'EUR')->value('value');
        $ronRate = DB::table('currencies')->where('code', 'RON')->value('value');
        $vatRate = 19.00;

        // Get order IDs by order number
        $orderIds = DB::table('orders')->pluck('id', 'order_number')->toArray();
        
        // Get product IDs by SKU
        $productIds = DB::table('products')->pluck('id', 'sku')->toArray();

        $orderProducts = [
            [
                'order_number' => 'ORD-2025-001',
                'product_sku' => 'LAP-GAM-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 8999.99,
                'unit_price_ron' => 8999.99,
                'unit_purchase_price_ron' => 6500.00,
            ],
            [
                'order_number' => 'ORD-2025-002',
                'product_sku' => 'PHONE-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $eurRate,
                'unit_price_currency' => 1212.12,
                'unit_price_ron' => 5999.99,
                'unit_purchase_price_ron' => 4800.00,
            ],
            [
                'order_number' => 'ORD-2025-003',
                'product_sku' => 'LAP-BUS-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 6999.99,
                'unit_price_ron' => 6999.99,
                'unit_purchase_price_ron' => 5500.00,
            ],
            [
                'order_number' => 'ORD-2025-004',
                'product_sku' => 'PHONE-002',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 5499.99,
                'unit_price_ron' => 5499.99,
                'unit_purchase_price_ron' => 4400.00,
            ],
            [
                'order_number' => 'ORD-2025-005',
                'product_sku' => 'DRESS-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 199.99,
                'unit_price_ron' => 199.99,
                'unit_purchase_price_ron' => 80.00,
            ],
            [
                'order_number' => 'ORD-2025-006',
                'product_sku' => 'FURN-002',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 1299.99,
                'unit_price_ron' => 1299.99,
                'unit_purchase_price_ron' => 650.00,
            ],
            [
                'order_number' => 'ORD-2025-007',
                'product_sku' => 'BLOUSE-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 179.99,
                'unit_price_ron' => 179.99,
                'unit_purchase_price_ron' => 75.00,
            ],
            [
                'order_number' => 'ORD-2025-008',
                'product_sku' => 'KIT-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 2499.99,
                'unit_price_ron' => 2499.99,
                'unit_purchase_price_ron' => 1500.00,
            ],
            [
                'order_number' => 'ORD-2025-009',
                'product_sku' => 'FURN-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 899.99,
                'unit_price_ron' => 899.99,
                'unit_purchase_price_ron' => 450.00,
            ],
            [
                'order_number' => 'ORD-2025-010',
                'product_sku' => 'FURN-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 899.99,
                'unit_price_ron' => 899.99,
                'unit_purchase_price_ron' => 450.00,
            ],
            [
                'order_number' => 'ORD-2025-011',
                'product_sku' => 'FURN-002',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 1299.99,
                'unit_price_ron' => 1299.99,
                'unit_purchase_price_ron' => 650.00,
            ],
            [
                'order_number' => 'ORD-2025-012',
                'product_sku' => 'PHONE-004',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 4499.99,
                'unit_price_ron' => 4499.99,
                'unit_purchase_price_ron' => 3600.00,
            ],
            [
                'order_number' => 'ORD-2025-013',
                'product_sku' => 'FIT-002',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 149.99,
                'unit_price_ron' => 149.99,
                'unit_purchase_price_ron' => 60.00,
            ],
            [
                'order_number' => 'ORD-2025-014',
                'product_sku' => 'CONS-001',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 2999.99,
                'unit_price_ron' => 2999.99,
                'unit_purchase_price_ron' => 2400.00,
            ],
            [
                'order_number' => 'ORD-2025-015',
                'product_sku' => 'HEAD-002',
                'quantity' => 1,
                'vat_percent' => $vatRate,
                'exchange_rate' => $ronRate,
                'unit_price_currency' => 1999.99,
                'unit_price_ron' => 1999.99,
                'unit_purchase_price_ron' => 1500.00,
            ],
        ];

        // Add order products for 20 B2B Premium orders
        $b2bPremiumUser = DB::table('users')->where('email', 'b2b-premium@test.com')->first();
        if (!$b2bPremiumUser || !$b2bPremiumUser->customer_id) {
            $this->command->warn('  ⚠️  Skipping B2B Premium order products - user not found');
        } else {
            $productSkus = ['LAP-GAM-001', 'LAP-BUS-001', 'PHONE-001', 'PHONE-002', 'PHONE-003', 'TAB-001', 'HEAD-001', 'WATCH-001', 'CAM-001', 'TSHIRT-001', 'JEANS-001', 'FURN-001', 'KIT-001', 'CONS-001'];

            for ($i = 16; $i <= 35; $i++) {
                $orderNumber = 'ORD-2025-' . str_pad($i, 3, '0', STR_PAD_LEFT);
                if (isset($orderIds[$orderNumber])) {
                    // First 3 orders have multiple products: 16 = 3, 17 = 5, 18 = 10
                    $productCount = ($i == 16) ? 3 : (($i == 17) ? 5 : (($i == 18) ? 10 : 1));

                    // Shuffle product SKUs to get different products for each order
                    $availableSkus = $productSkus;
                    shuffle($availableSkus);

                    // Add products to order
                    for ($p = 0; $p < $productCount; $p++) {
                        $selectedSku = $availableSkus[$p % count($availableSkus)];
                        $product = DB::table('products')->where('sku', $selectedSku)->first();

                        // Get product ID
                        $productId = $productIds[$selectedSku] ?? ($product ? $product->id : null);

                        if ($product && $productId) {
                            $quantity = rand(1, 3); // Quantity per product
                            $basePrice = (float) $product->price_ron;
                            // Use 80% of base price as purchase price (estimated)
                            $purchasePrice = round($basePrice * 0.80, 2);
                            $unitPriceRon = round($basePrice, 2);
                            $unitPriceCurrency = $unitPriceRon; // RON currency

                            $orderProducts[] = [
                                'order_number' => $orderNumber,
                                'product_sku' => $selectedSku,
                                'quantity' => $quantity,
                                'vat_percent' => 0.00, // B2B orders don't have VAT
                                'exchange_rate' => $ronRate,
                                'unit_price_currency' => $unitPriceCurrency,
                                'unit_price_ron' => $unitPriceRon,
                                'unit_purchase_price_ron' => $purchasePrice,
                            ];
                        }
                    }
                }
            }

            // Add order products for 5 cancelled B2B Premium orders
            for ($i = 36; $i <= 40; $i++) {
                $orderNumber = 'ORD-2025-' . str_pad($i, 3, '0', STR_PAD_LEFT);
                if (isset($orderIds[$orderNumber])) {
                    $productCount = rand(1, 3); // Random 1-3 products per cancelled order

                    // Shuffle product SKUs to get different products for each order
                    $availableSkus = $productSkus;
                    shuffle($availableSkus);

                    // Add products to order
                    for ($p = 0; $p < $productCount; $p++) {
                        $selectedSku = $availableSkus[$p % count($availableSkus)];
                        $product = DB::table('products')->where('sku', $selectedSku)->first();

                        // Get product ID
                        $productId = $productIds[$selectedSku] ?? ($product ? $product->id : null);

                        if ($product && $productId) {
                            $quantity = rand(1, 2); // Quantity per product
                            $basePrice = (float) $product->price_ron;
                            // Use 80% of base price as purchase price (estimated)
                            $purchasePrice = round($basePrice * 0.80, 2);
                            $unitPriceRon = round($basePrice, 2);
                            $unitPriceCurrency = $unitPriceRon; // RON currency

                            $orderProducts[] = [
                                'order_number' => $orderNumber,
                                'product_sku' => $selectedSku,
                                'quantity' => $quantity,
                                'vat_percent' => 0.00, // B2B orders don't have VAT
                                'exchange_rate' => $ronRate,
                                'unit_price_currency' => $unitPriceCurrency,
                                'unit_price_ron' => $unitPriceRon,
                                'unit_purchase_price_ron' => $purchasePrice,
                            ];
                        }
                    }
                }
            }
        }

        foreach ($orderProducts as $op) {
            if (!isset($orderIds[$op['order_number']])) {
                continue; // Skip if order not found
            }
            
            $orderId = $orderIds[$op['order_number']];
            
            // Get product ID from array or directly from database
            $productId = $productIds[$op['product_sku']] ?? null;
            if (!$productId) {
                $productFromDb = DB::table('products')->where('sku', $op['product_sku'])->first();
                $productId = $productFromDb ? $productFromDb->id : null;
            }
            if (!$productId) {
                continue; // Skip if product not found
            }
            
            $product = DB::table('products')->where('id', $productId)->first();
            if (!$product) {
                continue;
            }

            $unitPriceCurrency = $op['unit_price_currency'];
            $unitPriceRon = $op['unit_price_ron'];
            $quantity = $op['quantity'];
            $vatPercent = $op['vat_percent'];

            $totalCurrencyExclVat = $unitPriceCurrency * $quantity;
            $totalCurrencyInclVat = $totalCurrencyExclVat * (1 + $vatPercent / 100);
            $totalRonExclVat = $unitPriceRon * $quantity;
            $totalRonInclVat = $totalRonExclVat * (1 + $vatPercent / 100);
            $profitRon = ($unitPriceRon - $op['unit_purchase_price_ron']) * $quantity;

            DB::table('order_products')->updateOrInsert(
                [
                    'order_id' => $orderId,
                    'product_id' => $productId,
                ],
                [
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'ean' => $product->ean,
                    'quantity' => $quantity,
                    'vat_percent' => $vatPercent,
                    'exchange_rate' => $op['exchange_rate'],
                    'unit_price_currency' => $unitPriceCurrency,
                    'unit_price_ron' => $unitPriceRon,
                    'unit_purchase_price_ron' => $op['unit_purchase_price_ron'],
                    'total_currency_excl_vat' => $totalCurrencyExclVat,
                    'total_currency_incl_vat' => $totalCurrencyInclVat,
                    'total_ron_excl_vat' => $totalRonExclVat,
                    'total_ron_incl_vat' => $totalRonInclVat,
                    'profit_ron' => $profitRon,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Update order totals for B2B Premium orders based on actual products (including cancelled orders)
        $b2bPremiumUser = DB::table('users')->where('email', 'b2b-premium@test.com')->first();
        if (!$b2bPremiumUser || !$b2bPremiumUser->customer_id) {
            $this->command->warn('  ⚠️  Skipping B2B Premium order totals update - user not found');
        } else {
            for ($i = 16; $i <= 40; $i++) {
                $orderNumber = 'ORD-2025-' . str_pad($i, 3, '0', STR_PAD_LEFT);
                if (isset($orderIds[$orderNumber])) {
                    $orderId = $orderIds[$orderNumber];

                    // Calculate totals from order products
                    $orderProductTotals = DB::table('order_products')
                        ->where('order_id', $orderId)
                        ->selectRaw('SUM(total_ron_excl_vat) as total_excl_vat, SUM(total_ron_incl_vat) as total_incl_vat')
                        ->first();

                    // Always update VAT settings for B2B orders, even if no products yet
                    $updateData = [
                        'vat_rate_applied' => 0.00, // B2B orders don't have VAT
                        'is_vat_exempt' => true,
                        'updated_at' => now(),
                    ];

                    // Update totals only if products exist
                    if ($orderProductTotals && $orderProductTotals->total_excl_vat) {
                        $updateData['total_excl_vat'] = round((float) $orderProductTotals->total_excl_vat, 2);
                        $updateData['total_incl_vat'] = round((float) $orderProductTotals->total_incl_vat, 2);
                        $updateData['total_ron_excl_vat'] = round((float) $orderProductTotals->total_excl_vat, 2);
                        $updateData['total_ron_incl_vat'] = round((float) $orderProductTotals->total_incl_vat, 2);
                    }

                    DB::table('orders')
                        ->where('id', $orderId)
                        ->update($updateData);
                }
            }
        }
    }
}

