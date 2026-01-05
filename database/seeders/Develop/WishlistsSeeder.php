<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Wishlists Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds wishlists for development/testing.
 * Adds products to customer wishlists.
 * 
 * Depends on: CustomersSeeder, ProductsSeeder
 */
class WishlistsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding wishlists...');
        $this->seedWishlists();
        $this->command->info('✓ Wishlists seeded successfully');
    }

    private function seedWishlists(): void
    {
        // Get customers (only those with customer_id, not guests)
        $customers = DB::table('customers')
            ->join('users', 'customers.id', '=', 'users.customer_id')
            ->select('customers.id')
            ->get();

        if ($customers->isEmpty()) {
            $this->command->warn('No customers found. Please run CustomersSeeder or TestUsersSeeder first.');
            return;
        }

        // Get products
        $products = DB::table('products')
            ->where('status', true)
            ->inRandomOrder()
            ->limit(30)
            ->get();

        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please run ProductsSeeder first.');
            return;
        }

        $itemsCreated = 0;

        foreach ($customers as $customer) {
            // Check existing wishlist items for this customer
            $existingCount = DB::table('wishlists')
                ->where('customer_id', $customer->id)
                ->count();

            // Skip if customer already has many items
            if ($existingCount >= 10) {
                continue;
            }

            // Add 2-8 random products to each customer's wishlist
            $itemCount = rand(2, 8);
            $selectedProducts = $products->random(min($itemCount, $products->count()));

            foreach ($selectedProducts as $product) {
                // Check if product is already in wishlist
                $exists = DB::table('wishlists')
                    ->where('customer_id', $customer->id)
                    ->where('product_id', $product->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                DB::table('wishlists')->insert([
                    'customer_id' => $customer->id,
                    'product_id' => $product->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $itemsCreated++;
            }
        }

        if ($itemsCreated > 0) {
            $this->command->info("Created {$itemsCreated} wishlist item(s).");
        } else {
            $this->command->info('All wishlists already populated or no customers/products found.');
        }
    }
}

