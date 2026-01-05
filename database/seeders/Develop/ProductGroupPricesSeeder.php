<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Product Group Prices Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds product group prices for development/testing.
 * Sets special prices for all customer groups (B2C, B2B_STANDARD, B2B_PREMIUM) for all products.
 * 
 * Depends on: ProductsSeeder, CustomerGroupsSeeder
 */
class ProductGroupPricesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding product group prices...');
        $this->seedProductGroupPrices();
        $this->command->info('✓ Product group prices seeded successfully');
    }

    private function seedProductGroupPrices(): void
    {
        // Set special prices for ALL customer groups (B2C, B2B_STANDARD, B2B_PREMIUM) for ALL products
        // Price tiers: 1-2, 3-9, 10+

        $customerGroupIds = DB::table('customer_groups')->pluck('id', 'code')->toArray();

        $b2cId = $customerGroupIds['B2C'] ?? null;
        $b2bStandardId = $customerGroupIds['B2B_STANDARD'] ?? null;
        $b2bPremiumId = $customerGroupIds['B2B_PREMIUM'] ?? null;

        if (!$b2cId || !$b2bStandardId || !$b2bPremiumId) {
            $this->command->warn('Customer groups not found. Skipping product group prices.');
            return; // Customer groups not seeded yet
        }

        // Get ALL products
        $allProducts = DB::table('products')->get();

        foreach ($allProducts as $product) {
            $basePrice = (float) $product->price_ron;

            // Generate unique discount factors based on product ID and SKU
            // This ensures different discounts for each product while keeping Tier 1 = base price
            $productHash = crc32($product->id . $product->sku);

            // For all customer groups, Tier 1 (min_quantity = 1) uses base price
            // Tier 2 and Tier 3 have quantity-based discounts

            // B2C pricing tiers - same values as B2B_STANDARD
            $b2cTier1 = $basePrice; // Exact base price for quantity 1
            $b2cTier2 = round($basePrice * (0.95 + (($productHash % 2) / 100)), 2); // 95-96% of base
            $b2cTier3 = round($basePrice * (0.92 + (($productHash % 2) / 100)), 2); // 92-93% of base

            $this->insertProductGroupPrice($product->id, $b2cId, 1, $b2cTier1);
            $this->insertProductGroupPrice($product->id, $b2cId, 3, $b2cTier2);
            $this->insertProductGroupPrice($product->id, $b2cId, 10, $b2cTier3);

            // B2B Standard pricing tiers
            $b2bStandardTier1 = $basePrice; // Exact base price for quantity 1
            $b2bStandardTier2 = round($basePrice * (0.95 + (($productHash % 2) / 100)), 2); // 95-96% of base
            $b2bStandardTier3 = round($basePrice * (0.92 + (($productHash % 2) / 100)), 2); // 92-93% of base

            $this->insertProductGroupPrice($product->id, $b2bStandardId, 1, $b2bStandardTier1);
            $this->insertProductGroupPrice($product->id, $b2bStandardId, 3, $b2bStandardTier2);
            $this->insertProductGroupPrice($product->id, $b2bStandardId, 10, $b2bStandardTier3);

            // B2B Premium pricing tiers
            $b2bPremiumTier1 = $basePrice; // Exact base price for quantity 1
            $b2bPremiumTier2 = round($basePrice * (0.88 + (($productHash % 5) / 100)), 2); // 88-92% of base
            $b2bPremiumTier3 = round($basePrice * (0.82 + (($productHash % 5) / 100)), 2); // 82-86% of base

            $this->insertProductGroupPrice($product->id, $b2bPremiumId, 1, $b2bPremiumTier1);
            $this->insertProductGroupPrice($product->id, $b2bPremiumId, 3, $b2bPremiumTier2);
            $this->insertProductGroupPrice($product->id, $b2bPremiumId, 10, $b2bPremiumTier3);
        }
    }

    /**
     * Insert or update a product group price.
     *
     * @param int $productId
     * @param int $customerGroupId
     * @param int $minQuantity
     * @param float $priceRon
     * @return void
     */
    private function insertProductGroupPrice(int $productId, int $customerGroupId, int $minQuantity, float $priceRon): void
    {
        DB::table('product_group_prices')->updateOrInsert(
            [
                'product_id' => $productId,
                'customer_group_id' => $customerGroupId,
                'min_quantity' => $minQuantity,
            ],
            [
                'price_ron' => $priceRon,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
