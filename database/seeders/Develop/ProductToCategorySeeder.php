<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Product To Category Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds product-to-category relationships for development/testing.
 * Assigns products to appropriate sub-subcategories based on SKU and name matching.
 * 
 * Depends on: ProductsSeeder, CategoriesSeeder
 */
class ProductToCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding product to category relationships...');
        $this->seedProductToCategory();
        $this->command->info('✓ Product to category relationships seeded successfully');
    }

    private function seedProductToCategory(): void
    {
        // Get all sub-subcategories with their slugs for matching
        $subSubCategories = DB::table('categories as c1')
            ->join('categories as c2', 'c1.parent_id', '=', 'c2.id')
            ->join('categories as c3', 'c2.parent_id', '=', 'c3.id')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('categories as c4')
                    ->whereColumn('c4.parent_id', 'c1.id');
            })
            ->where('c1.status', true)
            ->select('c1.id', 'c1.slug')
            ->get()
            ->keyBy('slug')
            ->map(function ($category) {
                return $category->id;
            })
            ->toArray();

        if (empty($subSubCategories)) {
            $this->command->warn('No sub-subcategories found. Products will not be assigned to categories.');
            return;
        }

        // Get all products with their SKU and name
        $allProducts = DB::table('products')->select('id', 'sku', 'name')->get();

        if ($allProducts->isEmpty()) {
            $this->command->warn('No products found. Skipping product to category assignment.');
            return;
        }

        $assignedCount = 0;

        // Assign each product to a matching sub-subcategory based on SKU and name
        foreach ($allProducts as $product) {
            $categoryId = $this->matchProductToSubSubCategory($product->sku, $product->name, $subSubCategories);

            if ($categoryId) {
                DB::table('product_to_category')->updateOrInsert(
                    [
                        'product_id' => $product->id,
                        'category_id' => $categoryId,
                    ],
                    [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
                $assignedCount++;
            } else {
                $this->command->warn("Could not match product {$product->sku} to a sub-subcategory.");
            }
        }

        $this->command->info("Assigned {$assignedCount} products to sub-subcategories.");
    }

    private function matchProductToSubSubCategory(string $sku, string $name, array $subSubCategories): ?int
    {
        $nameLower = mb_strtolower($name);
        $skuUpper = strtoupper($sku);

        // Gaming Laptops - no direct sub-subcategory, assign to closest (tablets android as fallback)
        if (strpos($skuUpper, 'LAP-GAM-') === 0) {
            // Since there's no gaming laptop sub-subcategory, we'll use a related one
            // In a real scenario, you'd create sub-subcategories for these
            return $subSubCategories['tablete-android'] ?? null;
        }

        // Business Laptops - no direct sub-subcategory, assign to closest
        if (strpos($skuUpper, 'LAP-BUS-') === 0) {
            // Since there's no business laptop sub-subcategory, we'll use a related one
            return $subSubCategories['tablete-ipad'] ?? null;
        }

        // Smartphones - no direct sub-subcategory, assign to closest
        if (strpos($skuUpper, 'PHONE-') === 0) {
            // Since there's no smartphone sub-subcategory, we'll use a related one
            if (strpos($nameLower, 'iphone') !== false || strpos($nameLower, 'apple') !== false) {
                return $subSubCategories['smartwatch-apple'] ?? null;
            }
            return $subSubCategories['smartwatch-android'] ?? null;
        }

        // Tablets
        if (strpos($skuUpper, 'TAB-') === 0) {
            if (strpos($nameLower, 'ipad') !== false) {
                return $subSubCategories['tablete-ipad'] ?? null;
            }
            return $subSubCategories['tablete-android'] ?? null;
        }

        // Headphones
        if (strpos($skuUpper, 'HEAD-') === 0) {
            if (strpos($nameLower, 'airpods') !== false || strpos($nameLower, 'wireless') !== false) {
                return $subSubCategories['casti-wireless'] ?? null;
            }
            return $subSubCategories['casti-cu-fir'] ?? null;
        }

        // Smartwatches
        if (strpos($skuUpper, 'WATCH-') === 0) {
            if (strpos($nameLower, 'apple') !== false) {
                return $subSubCategories['smartwatch-apple'] ?? null;
            }
            return $subSubCategories['smartwatch-android'] ?? null;
        }

        // Cameras
        if (strpos($skuUpper, 'CAM-') === 0) {
            // Canon EOS R and Sony Alpha are mirrorless
            if (strpos($nameLower, 'eos r') !== false || strpos($nameLower, 'alpha') !== false || strpos($nameLower, 'mirrorless') !== false) {
                return $subSubCategories['camere-mirrorless'] ?? null;
            }
            return $subSubCategories['camere-dslr'] ?? null;
        }

        // Men's T-shirts
        if (strpos($skuUpper, 'TSHIRT-') === 0) {
            if (strpos($nameLower, 'polo') !== false || strpos($nameLower, 'maneca lunga') !== false) {
                return $subSubCategories['tricouri-maneca-lunga'] ?? null;
            }
            return $subSubCategories['tricouri-maneca-scurta'] ?? null;
        }

        // Men's Jeans
        if (strpos($skuUpper, 'JEANS-') === 0) {
            if (strpos($nameLower, 'slim') !== false || strpos($nameLower, 'skinny') !== false) {
                return $subSubCategories['jeans-skinny'] ?? null;
            }
            return $subSubCategories['jeans-regular'] ?? null;
        }

        // Women's Dresses
        if (strpos($skuUpper, 'DRESS-') === 0) {
            return $subSubCategories['rochii-femei'] ?? null;
        }

        // Women's Blouses
        if (strpos($skuUpper, 'BLOUSE-') === 0) {
            return $subSubCategories['bluze-femei'] ?? null;
        }

        // Furniture
        if (strpos($skuUpper, 'FURN-') === 0) {
            if (strpos($nameLower, 'scaun') !== false || strpos($nameLower, 'chair') !== false) {
                return $subSubCategories['scaune'] ?? null;
            }
            if (strpos($nameLower, 'birou') !== false || strpos($nameLower, 'desk') !== false || strpos($nameLower, 'masa') !== false || strpos($nameLower, 'table') !== false) {
                return $subSubCategories['mese'] ?? null;
            }
            // Default to chairs if unclear
            return $subSubCategories['scaune'] ?? null;
        }

        // Kitchen
        if (strpos($skuUpper, 'KIT-') === 0) {
            if (strpos($nameLower, 'blender') !== false || strpos($nameLower, 'ustensil') !== false) {
                return $subSubCategories['ustensile-bucatarie'] ?? null;
            }
            if (strpos($nameLower, 'cafea') !== false || strpos($nameLower, 'coffee') !== false || strpos($nameLower, 'tigaie') !== false || strpos($nameLower, 'pan') !== false) {
                return $subSubCategories['tigari-bucatarie'] ?? null;
            }
            // Default to utensils
            return $subSubCategories['ustensile-bucatarie'] ?? null;
        }

        // Fitness
        if (strpos($skuUpper, 'FIT-') === 0) {
            if (strpos($nameLower, 'ganter') !== false || strpos($nameLower, 'dumbbell') !== false) {
                return $subSubCategories['gantere'] ?? null;
            }
            if (strpos($nameLower, 'covoras') !== false || strpos($nameLower, 'yoga') !== false || strpos($nameLower, 'band') !== false || strpos($nameLower, 'benzi') !== false) {
                return $subSubCategories['benzi-rezistenta'] ?? null;
            }
            // Default to dumbbells
            return $subSubCategories['gantere'] ?? null;
        }

        // Running shoes
        if (strpos($skuUpper, 'RUN-') === 0) {
            return $subSubCategories['incaltaminte-alergare'] ?? null;
        }

        // Consoles
        if (strpos($skuUpper, 'CONS-') === 0) {
            if (strpos($nameLower, 'playstation') !== false || strpos($nameLower, 'ps5') !== false) {
                return $subSubCategories['playstation'] ?? null;
            }
            if (strpos($nameLower, 'xbox') !== false) {
                return $subSubCategories['xbox'] ?? null;
            }
            // Default to PlayStation
            return $subSubCategories['playstation'] ?? null;
        }

        // Video Games
        if (strpos($skuUpper, 'GAME-') === 0) {
            if (strpos($nameLower, 'god of war') !== false || strpos($nameLower, 'action') !== false) {
                return $subSubCategories['jocuri-action'] ?? null;
            }
            if (strpos($nameLower, 'forza') !== false || strpos($nameLower, 'sport') !== false) {
                return $subSubCategories['jocuri-sport'] ?? null;
            }
            // Default to action
            return $subSubCategories['jocuri-action'] ?? null;
        }

        // Books
        if (strpos($skuUpper, 'BOOK-') === 0) {
            if (strpos($nameLower, 'murakami') !== false || strpos($nameLower, 'roman') !== false || strpos($nameLower, 'fictiune') !== false) {
                return $subSubCategories['romane'] ?? null;
            }
            if (strpos($nameLower, 'atomic') !== false || strpos($nameLower, 'habit') !== false || strpos($nameLower, 'biograf') !== false) {
                return $subSubCategories['biografii'] ?? null;
            }
            // Default to novels
            return $subSubCategories['romane'] ?? null;
        }

        return null;
    }
}

