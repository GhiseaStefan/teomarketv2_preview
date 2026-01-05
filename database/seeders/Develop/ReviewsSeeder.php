<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Reviews Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds product reviews for development/testing.
 * Creates reviews from customers who have purchased products.
 * 
 * Depends on: OrdersSeeder, OrderProductsSeeder, CustomersSeeder, ProductsSeeder
 */
class ReviewsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding reviews...');
        $this->seedReviews();
        $this->command->info('✓ Reviews seeded successfully');
    }

    private function seedReviews(): void
    {
        // Get customers who have orders (verified purchases)
        $customersWithOrders = DB::table('orders')
            ->join('order_products', 'orders.id', '=', 'order_products.order_id')
            ->select('orders.customer_id', 'order_products.product_id', 'orders.id as order_id')
            ->distinct()
            ->get();

        if ($customersWithOrders->isEmpty()) {
            $this->command->warn('No customers with orders found. Please run OrdersSeeder and OrderProductsSeeder first.');
            return;
        }

        $reviewsCreated = 0;
        $reviewComments = [
            'Produs excelent, recomand!',
            'Foarte multumit de achizitie. Calitate superioara.',
            'Produsul corespunde descrierii. Livrare rapida.',
            'Calitate buna pentru pret. Recomand cu incredere.',
            'Produs de calitate, dar livrarea a durat mai mult decat asteptat.',
            'Foarte bun raport calitate-pret. Multumit!',
            'Produsul este exact ce cautam. Recomand!',
            'Calitate exceptionala. Voi mai comanda sigur.',
            'Produs bun, dar am avut o mica problema la livrare.',
            'Foarte multumit! Produsul depaseste asteptarile.',
            'Calitate superioara. Livrare rapida si sigura.',
            'Produs excelent pentru pretul oferit.',
            'Recomand cu incredere. Calitate si serviciu excelent.',
            'Multumit de achizitie. Produsul corespunde perfect descrierii.',
            'Calitate buna, dar ar putea fi mai bine ambalat.',
        ];

        foreach ($customersWithOrders as $orderProduct) {
            // Check if customer already reviewed this product
            $existingReview = DB::table('reviews')
                ->where('customer_id', $orderProduct->customer_id)
                ->where('product_id', $orderProduct->product_id)
                ->exists();

            if ($existingReview) {
                continue;
            }

            // Random rating (mostly positive, but some negative for realism)
            $rating = $this->generateRating();

            // Random comment (70% chance to have a comment)
            $comment = null;
            if (rand(1, 10) <= 7) {
                $comment = $reviewComments[array_rand($reviewComments)];
            }

            // Mark as verified purchase if order exists
            $isVerifiedPurchase = true; // All reviews from orders are verified

            DB::table('reviews')->insert([
                'customer_id' => $orderProduct->customer_id,
                'product_id' => $orderProduct->product_id,
                'order_id' => $orderProduct->order_id,
                'rating' => $rating,
                'comment' => $comment,
                'is_verified_purchase' => $isVerifiedPurchase,
                'useful_count' => 0,
                'is_approved' => true,
                'created_at' => now()->subDays(rand(1, 90)), // Random date in last 90 days
                'updated_at' => now()->subDays(rand(1, 90)),
            ]);

            $reviewsCreated++;
        }

        // Also create some reviews from customers without orders (unverified)
        $customers = DB::table('customers')
            ->join('users', 'customers.id', '=', 'users.customer_id')
            ->select('customers.id')
            ->limit(5)
            ->get();

        $products = DB::table('products')
            ->where('status', true)
            ->inRandomOrder()
            ->limit(10)
            ->get();

        foreach ($customers as $customer) {
            foreach ($products->random(2) as $product) {
                $existingReview = DB::table('reviews')
                    ->where('customer_id', $customer->id)
                    ->where('product_id', $product->id)
                    ->exists();

                if ($existingReview) {
                    continue;
                }

                $rating = $this->generateRating();
                $comment = rand(1, 10) <= 5 ? $reviewComments[array_rand($reviewComments)] : null;

                DB::table('reviews')->insert([
                    'customer_id' => $customer->id,
                    'product_id' => $product->id,
                    'order_id' => null,
                    'rating' => $rating,
                    'comment' => $comment,
                    'is_verified_purchase' => false,
                    'useful_count' => 0,
                    'is_approved' => true,
                    'created_at' => now()->subDays(rand(1, 60)),
                    'updated_at' => now()->subDays(rand(1, 60)),
                ]);

                $reviewsCreated++;
            }
        }

        if ($reviewsCreated > 0) {
            $this->command->info("Created {$reviewsCreated} review(s).");
        } else {
            $this->command->info('All reviews already exist or no customers/products found.');
        }
    }

    /**
     * Generate a realistic rating (mostly positive).
     */
    private function generateRating(): int
    {
        $rand = rand(1, 100);
        
        // 60% chance for 5 stars
        if ($rand <= 60) {
            return 5;
        }
        // 20% chance for 4 stars
        if ($rand <= 80) {
            return 4;
        }
        // 10% chance for 3 stars
        if ($rand <= 90) {
            return 3;
        }
        // 7% chance for 2 stars
        if ($rand <= 97) {
            return 2;
        }
        // 3% chance for 1 star
        return 1;
    }
}

