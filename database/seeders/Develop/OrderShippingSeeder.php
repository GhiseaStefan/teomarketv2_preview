<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Order Shipping Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds order shipping information for development/testing.
 * 
 * Depends on: OrdersSeeder, ShippingMethodsSeeder
 */
class OrderShippingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding order shipping...');
        $this->seedOrderShipping();
        $this->command->info('✓ Order shipping seeded successfully');
    }

    private function seedOrderShipping(): void
    {
        $samedayId = DB::table('shipping_methods')->where('code', 'sameday_locker')->value('id');
        $fancourierId = DB::table('shipping_methods')->where('code', 'fancourier')->value('id');
        $glsId = DB::table('shipping_methods')->where('code', 'gls')->value('id');
        $dpdId = DB::table('shipping_methods')->where('code', 'dpd')->value('id');
        $pickupId = DB::table('shipping_methods')->where('code', 'pickup_store')->value('id');
        $vatRate = 19.00;

        // Get order IDs by order number
        $orderIds = DB::table('orders')->pluck('id', 'order_number')->toArray();

        $shipping = [
            [
                'order_id' => $orderIds['ORD-2025-001'] ?? null,
                'shipping_method_id' => $samedayId,
                'title' => 'Livrare la EasyBox',
                'pickup_point_id' => 'easybox_1234',
                'shipping_cost_excl_vat' => 19.99,
                'shipping_cost_incl_vat' => 23.79,
                'shipping_cost_ron_excl_vat' => 19.99,
                'shipping_cost_ron_incl_vat' => 23.79,
            ],
            [
                'order_id' => $orderIds['ORD-2025-002'] ?? null,
                'shipping_method_id' => $fancourierId,
                'title' => 'Livrare FanCourier',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 25.00,
                'shipping_cost_incl_vat' => 29.75,
                'shipping_cost_ron_excl_vat' => 25.00,
                'shipping_cost_ron_incl_vat' => 29.75,
            ],
            [
                'order_id' => $orderIds['ORD-2025-003'] ?? null,
                'shipping_method_id' => $samedayId,
                'title' => 'Livrare la EasyBox',
                'pickup_point_id' => 'easybox_5678',
                'shipping_cost_excl_vat' => 19.99,
                'shipping_cost_incl_vat' => 23.79,
                'shipping_cost_ron_excl_vat' => 19.99,
                'shipping_cost_ron_incl_vat' => 23.79,
            ],
            [
                'order_id' => $orderIds['ORD-2025-004'] ?? null,
                'shipping_method_id' => $fancourierId,
                'title' => 'Livrare FanCourier',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 25.00,
                'shipping_cost_incl_vat' => 29.75,
                'shipping_cost_ron_excl_vat' => 25.00,
                'shipping_cost_ron_incl_vat' => 29.75,
            ],
            [
                'order_id' => $orderIds['ORD-2025-005'] ?? null,
                'shipping_method_id' => $glsId,
                'title' => 'Livrare GLS',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 20.00,
                'shipping_cost_incl_vat' => 23.80,
                'shipping_cost_ron_excl_vat' => 20.00,
                'shipping_cost_ron_incl_vat' => 23.80,
            ],
            [
                'order_id' => $orderIds['ORD-2025-006'] ?? null,
                'shipping_method_id' => $samedayId,
                'title' => 'Livrare la EasyBox',
                'pickup_point_id' => 'easybox_9012',
                'shipping_cost_excl_vat' => 19.99,
                'shipping_cost_incl_vat' => 23.79,
                'shipping_cost_ron_excl_vat' => 19.99,
                'shipping_cost_ron_incl_vat' => 23.79,
            ],
            [
                'order_id' => $orderIds['ORD-2025-007'] ?? null,
                'shipping_method_id' => $dpdId,
                'title' => 'Livrare DPD',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 22.00,
                'shipping_cost_incl_vat' => 26.18,
                'shipping_cost_ron_excl_vat' => 22.00,
                'shipping_cost_ron_incl_vat' => 26.18,
            ],
            [
                'order_id' => $orderIds['ORD-2025-008'] ?? null,
                'shipping_method_id' => $fancourierId,
                'title' => 'Livrare FanCourier',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 25.00,
                'shipping_cost_incl_vat' => 29.75,
                'shipping_cost_ron_excl_vat' => 25.00,
                'shipping_cost_ron_incl_vat' => 29.75,
            ],
            [
                'order_id' => $orderIds['ORD-2025-009'] ?? null,
                'shipping_method_id' => $samedayId,
                'title' => 'Livrare la EasyBox',
                'pickup_point_id' => 'easybox_3456',
                'shipping_cost_excl_vat' => 19.99,
                'shipping_cost_incl_vat' => 23.79,
                'shipping_cost_ron_excl_vat' => 19.99,
                'shipping_cost_ron_incl_vat' => 23.79,
            ],
            [
                'order_id' => $orderIds['ORD-2025-010'] ?? null,
                'shipping_method_id' => $pickupId,
                'title' => 'Ridicare de la sediu',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 0.00,
                'shipping_cost_incl_vat' => 0.00,
                'shipping_cost_ron_excl_vat' => 0.00,
                'shipping_cost_ron_incl_vat' => 0.00,
            ],
            [
                'order_id' => $orderIds['ORD-2025-011'] ?? null,
                'shipping_method_id' => $glsId,
                'title' => 'Livrare GLS',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 20.00,
                'shipping_cost_incl_vat' => 23.80,
                'shipping_cost_ron_excl_vat' => 20.00,
                'shipping_cost_ron_incl_vat' => 23.80,
            ],
            [
                'order_id' => $orderIds['ORD-2025-012'] ?? null,
                'shipping_method_id' => $fancourierId,
                'title' => 'Livrare FanCourier',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 25.00,
                'shipping_cost_incl_vat' => 29.75,
                'shipping_cost_ron_excl_vat' => 25.00,
                'shipping_cost_ron_incl_vat' => 29.75,
            ],
            [
                'order_id' => $orderIds['ORD-2025-013'] ?? null,
                'shipping_method_id' => $glsId,
                'title' => 'Livrare GLS',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 20.00,
                'shipping_cost_incl_vat' => 23.80,
                'shipping_cost_ron_excl_vat' => 20.00,
                'shipping_cost_ron_incl_vat' => 23.80,
            ],
            [
                'order_id' => $orderIds['ORD-2025-014'] ?? null,
                'shipping_method_id' => $samedayId,
                'title' => 'Livrare la EasyBox',
                'pickup_point_id' => 'easybox_7890',
                'shipping_cost_excl_vat' => 19.99,
                'shipping_cost_incl_vat' => 23.79,
                'shipping_cost_ron_excl_vat' => 19.99,
                'shipping_cost_ron_incl_vat' => 23.79,
            ],
            [
                'order_id' => $orderIds['ORD-2025-015'] ?? null,
                'shipping_method_id' => $fancourierId,
                'title' => 'Livrare FanCourier',
                'pickup_point_id' => null,
                'shipping_cost_excl_vat' => 25.00,
                'shipping_cost_incl_vat' => 29.75,
                'shipping_cost_ron_excl_vat' => 25.00,
                'shipping_cost_ron_incl_vat' => 29.75,
            ],
        ];

        // Add shipping for 20 B2B Premium orders
        $shippingMethods = [
            ['id' => $samedayId, 'title' => 'Livrare la EasyBox', 'cost' => 19.99, 'locker' => true],
            ['id' => $fancourierId, 'title' => 'Livrare FanCourier', 'cost' => 25.00, 'locker' => false],
            ['id' => $glsId, 'title' => 'Livrare GLS', 'cost' => 20.00, 'locker' => false],
            ['id' => $dpdId, 'title' => 'Livrare DPD', 'cost' => 22.00, 'locker' => false],
            ['id' => $pickupId, 'title' => 'Ridicare de la sediu', 'cost' => 0.00, 'locker' => false],
        ];

        for ($i = 16; $i <= 35; $i++) {
            $orderNumber = 'ORD-2025-' . str_pad($i, 3, '0', STR_PAD_LEFT);
            if (isset($orderIds[$orderNumber])) {
                $randomShipping = $shippingMethods[array_rand($shippingMethods)];
                $shippingCostExclVat = $randomShipping['cost'];
                // B2B orders don't have VAT, so shipping_cost_incl_vat = shipping_cost_excl_vat
                $shippingCostInclVat = $shippingCostExclVat;
                $lockerBoxId = $randomShipping['locker'] ? 'easybox_' . rand(1000, 9999) : null;

                $shipping[] = [
                    'order_id' => $orderIds[$orderNumber],
                    'shipping_method_id' => $randomShipping['id'],
                    'title' => $randomShipping['title'],
                    'pickup_point_id' => $lockerBoxId,
                    'shipping_cost_excl_vat' => $shippingCostExclVat,
                    'shipping_cost_incl_vat' => $shippingCostInclVat,
                    'shipping_cost_ron_excl_vat' => $shippingCostExclVat,
                    'shipping_cost_ron_incl_vat' => $shippingCostInclVat,
                ];
            }
        }

        // Add shipping for 5 cancelled B2B Premium orders
        for ($i = 36; $i <= 40; $i++) {
            $orderNumber = 'ORD-2025-' . str_pad($i, 3, '0', STR_PAD_LEFT);
            if (isset($orderIds[$orderNumber])) {
                $randomShipping = $shippingMethods[array_rand($shippingMethods)];
                $shippingCostExclVat = $randomShipping['cost'];
                // B2B orders don't have VAT, so shipping_cost_incl_vat = shipping_cost_excl_vat
                $shippingCostInclVat = $shippingCostExclVat;
                $lockerBoxId = $randomShipping['locker'] ? 'easybox_' . rand(1000, 9999) : null;

                $shipping[] = [
                    'order_id' => $orderIds[$orderNumber],
                    'shipping_method_id' => $randomShipping['id'],
                    'title' => $randomShipping['title'],
                    'pickup_point_id' => $lockerBoxId,
                    'shipping_cost_excl_vat' => $shippingCostExclVat,
                    'shipping_cost_incl_vat' => $shippingCostInclVat,
                    'shipping_cost_ron_excl_vat' => $shippingCostExclVat,
                    'shipping_cost_ron_incl_vat' => $shippingCostInclVat,
                ];
            }
        }

        // Filter out shipping entries with null order_id
        $shipping = array_filter($shipping, fn($ship) => $ship['order_id'] !== null);

        foreach ($shipping as $ship) {
            DB::table('order_shipping')->updateOrInsert(
                ['order_id' => $ship['order_id']],
                array_merge($ship, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
