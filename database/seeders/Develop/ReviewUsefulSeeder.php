<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Review Useful Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds "useful" votes on reviews for development/testing.
 * Simulates customers marking reviews as useful.
 * 
 * Depends on: ReviewsSeeder, CustomersSeeder
 */
class ReviewUsefulSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding review useful votes...');
        $this->seedReviewUseful();
        $this->command->info('✓ Review useful votes seeded successfully');
    }

    private function seedReviewUseful(): void
    {
        // Get reviews
        $reviews = DB::table('reviews')
            ->where('is_approved', true)
            ->inRandomOrder()
            ->limit(50)
            ->get();

        if ($reviews->isEmpty()) {
            $this->command->warn('No reviews found. Please run ReviewsSeeder first.');
            return;
        }

        // Get customers
        $customers = DB::table('customers')
            ->join('users', 'customers.id', '=', 'users.customer_id')
            ->select('customers.id')
            ->get();

        if ($customers->isEmpty()) {
            $this->command->warn('No customers found. Please run CustomersSeeder first.');
            return;
        }

        $votesCreated = 0;

        foreach ($reviews as $review) {
            // Skip if review author is the only customer
            if ($customers->count() <= 1) {
                continue;
            }

            // Get other customers (not the review author)
            $otherCustomers = $customers->where('id', '!=', $review->customer_id);

            // 30-70% of other customers mark this review as useful
            $usefulCount = rand(
                (int)($otherCustomers->count() * 0.3),
                (int)($otherCustomers->count() * 0.7)
            );

            $selectedCustomers = $otherCustomers->random(min($usefulCount, $otherCustomers->count()));

            foreach ($selectedCustomers as $customer) {
                // Check if customer already marked this review as useful
                $exists = DB::table('review_useful')
                    ->where('review_id', $review->id)
                    ->where('customer_id', $customer->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                DB::table('review_useful')->insert([
                    'review_id' => $review->id,
                    'customer_id' => $customer->id,
                    'created_at' => now()->subDays(rand(1, 30)),
                    'updated_at' => now()->subDays(rand(1, 30)),
                ]);

                $votesCreated++;
            }

            // Update useful_count on review
            $actualCount = DB::table('review_useful')
                ->where('review_id', $review->id)
                ->count();

            DB::table('reviews')
                ->where('id', $review->id)
                ->update(['useful_count' => $actualCount]);
        }

        if ($votesCreated > 0) {
            $this->command->info("Created {$votesCreated} useful vote(s).");
        } else {
            $this->command->info('All useful votes already exist or no reviews/customers found.');
        }
    }
}

