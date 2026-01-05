<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Order Addresses Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds billing and shipping addresses for orders.
 * 
 * Depends on: OrdersSeeder, AddressesSeeder
 */
class OrderAddressesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding order addresses...');
        $this->seedOrderAddresses();
        $this->command->info('✓ Order addresses seeded successfully');
    }

    private function seedOrderAddresses(): void
    {
        $romaniaId = DB::table('countries')->where('iso_code_2', 'RO')->value('id');

        // Get all orders with their customer data
        $orders = DB::table('orders')
            ->join('customers', 'orders.customer_id', '=', 'customers.id')
            ->select(
                'orders.id as order_id',
                'orders.order_number',
                'orders.customer_id',
                'customers.customer_type',
                'customers.company_name',
                'customers.fiscal_code',
                'customers.reg_number',
                'customers.phone'
            )
            ->get();

        // Get user data for each customer (first user per customer)
        $customerUserMap = [];
        $users = DB::table('users')
            ->select('customer_id', 'first_name', 'last_name')
            ->whereIn('customer_id', $orders->pluck('customer_id')->unique())
            ->orderBy('id')
            ->get()
            ->groupBy('customer_id')
            ->map(function ($userGroup) {
                return $userGroup->first();
            });

        foreach ($users as $user) {
            $customerUserMap[$user->customer_id] = $user;
        }

        $orderAddresses = [];

        foreach ($orders as $order) {
            // Get user data for this customer
            $user = $customerUserMap[$order->customer_id] ?? null;

            // Get customer's address (if exists)
            $customerAddress = DB::table('addresses')
                ->where('customer_id', $order->customer_id)
                ->first();

            // Prepare billing address data
            $billingAddress = [
                'order_id' => $order->order_id,
                'type' => 'billing',
                'company_name' => $order->company_name,
                'fiscal_code' => $order->fiscal_code,
                'reg_number' => $order->reg_number,
                'first_name' => $user->first_name ?? 'N/A',
                'last_name' => $user->last_name ?? 'N/A',
                'phone' => $order->phone,
            ];

            // Prepare shipping address data (use customer address if available, otherwise use billing data)
            $shippingAddress = [
                'order_id' => $order->order_id,
                'type' => 'shipping',
                // Shipping usually doesn't need company name
                'first_name' => $user->first_name ?? 'N/A',
                'last_name' => $user->last_name ?? 'N/A',
                'phone' => $order->phone,
            ];

            // If customer has an address, use it for both billing and shipping
            if ($customerAddress) {
                $billingAddress = array_merge($billingAddress, [
                    'address_line_1' => $customerAddress->address_line_1,
                    'address_line_2' => $customerAddress->address_line_2,
                    'city' => $customerAddress->city,
                    'county_name' => $customerAddress->county_name,
                    'county_code' => $customerAddress->county_code,
                    'country_id' => $customerAddress->country_id,
                    'zip_code' => $customerAddress->zip_code,
                ]);

                $shippingAddress = array_merge($shippingAddress, [
                    'address_line_1' => $customerAddress->address_line_1,
                    'address_line_2' => $customerAddress->address_line_2,
                    'city' => $customerAddress->city,
                    'county_name' => $customerAddress->county_name,
                    'county_code' => $customerAddress->county_code,
                    'country_id' => $customerAddress->country_id,
                    'zip_code' => $customerAddress->zip_code,
                ]);
            } else {
                // Generate default addresses based on customer type
                $defaultAddresses = $this->getDefaultAddressForCustomer($order->customer_type, $romaniaId);

                $billingAddress = array_merge($billingAddress, $defaultAddresses);
                $shippingAddress = array_merge($shippingAddress, $defaultAddresses);
            }

            $orderAddresses[] = $billingAddress;
            $orderAddresses[] = $shippingAddress;
        }

        // Insert order addresses
        foreach ($orderAddresses as $address) {
            DB::table('order_addresses')->updateOrInsert(
                [
                    'order_id' => $address['order_id'],
                    'type' => $address['type'],
                ],
                array_merge($address, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('  → Created billing and shipping addresses for ' . count($orders) . ' orders');
    }

    private function getDefaultAddressForCustomer(string $customerType, int $romaniaId): array
    {
        // Default addresses for customers without addresses
        $defaults = [
            'individual' => [
                'address_line_1' => 'Strada Exemplu nr. 1',
                'address_line_2' => 'Bloc A, Ap. 1',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '010001',
            ],
            'company' => [
                'address_line_1' => 'Calea Exemplu nr. 100',
                'address_line_2' => 'Etaj 1',
                'city' => 'Bucuresti',
                'county_name' => 'Bucuresti',
                'county_code' => 'B',
                'country_id' => $romaniaId,
                'zip_code' => '010001',
            ],
        ];

        return $defaults[$customerType] ?? $defaults['individual'];
    }
}

