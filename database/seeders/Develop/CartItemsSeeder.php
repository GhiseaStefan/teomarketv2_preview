<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Cart Items Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds cart items for development/testing.
 * Adds products to existing carts.
 * 
 * Depends on: CartsSeeder, ProductsSeeder
 */
class CartItemsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding cart items...');
        $this->seedCartItems();
        $this->command->info('✓ Cart items seeded successfully');
    }

    private function seedCartItems(): void
    {
        // Get active carts
        $carts = DB::table('carts')
            ->where('status', 'active')
            ->get();

        if ($carts->isEmpty()) {
            $this->command->warn('No active carts found. Please run CartsSeeder first.');
            return;
        }

        // Get some products
        $products = DB::table('products')
            ->where('status', true)
            ->inRandomOrder()
            ->limit(20)
            ->get();

        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please run ProductsSeeder first.');
            return;
        }

        $itemsCreated = 0;

        foreach ($carts as $cart) {
            // Skip if cart already has items
            $existingItems = DB::table('cart_items')
                ->where('cart_id', $cart->id)
                ->count();

            if ($existingItems > 0) {
                continue;
            }

            // Add 1-4 random products to each cart
            $itemCount = rand(1, 4);
            $selectedProducts = $products->random($itemCount);

            foreach ($selectedProducts as $product) {
                DB::table('cart_items')->insert([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'quantity' => rand(1, 3),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $itemsCreated++;
            }

            // Update cart total (simplified calculation)
            $cartTotal = DB::table('cart_items')
                ->join('products', 'cart_items.product_id', '=', 'products.id')
                ->where('cart_items.cart_id', $cart->id)
                ->selectRaw('SUM(products.price_ron * cart_items.quantity) as total')
                ->value('total');

            if ($cartTotal) {
                DB::table('carts')
                    ->where('id', $cart->id)
                    ->update(['total_amount' => $cartTotal]);
            }
        }

        if ($itemsCreated > 0) {
            $this->command->info("Created {$itemsCreated} cart item(s).");
        } else {
            $this->command->info('All carts already have items or no carts found.');
        }
    }
}

