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
        // Get all sub-subcategories with their slugs for matching (3 levels: root -> sub -> sub-sub)
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

        // Get all subcategories (2 levels: root -> sub) for laptop categories that don't have sub-subcategories
        $subCategories = DB::table('categories as c1')
            ->join('categories as c2', 'c1.parent_id', '=', 'c2.id')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('categories as c3')
                    ->whereColumn('c3.parent_id', 'c1.id');
            })
            ->where('c1.status', true)
            ->select('c1.id', 'c1.slug')
            ->get()
            ->keyBy('slug')
            ->map(function ($category) {
                return $category->id;
            })
            ->toArray();

        // Merge both arrays, with sub-subcategories taking precedence
        $allCategories = array_merge($subCategories, $subSubCategories);

        if (empty($allCategories)) {
            $this->command->warn('No categories found. Products will not be assigned to categories.');
            return;
        }

        // Get all products with their SKU and name
        $allProducts = DB::table('products')->select('id', 'sku', 'name')->get();

        if ($allProducts->isEmpty()) {
            $this->command->warn('No products found. Skipping product to category assignment.');
            return;
        }

        // First, delete existing category assignments for products that will be reassigned
        $productIds = $allProducts->pluck('id')->toArray();
        DB::table('product_to_category')->whereIn('product_id', $productIds)->delete();

        $assignedCount = 0;

        // Assign each product to a matching category based on SKU and name
        foreach ($allProducts as $product) {
            $categoryId = $this->matchProductToSubSubCategory($product->sku, $product->name, $allCategories);

            if ($categoryId) {
                DB::table('product_to_category')->insert([
                    'product_id' => $product->id,
                    'category_id' => $categoryId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $assignedCount++;
            } else {
                $this->command->warn("Could not match product {$product->sku} to a category.");
            }
        }

        $this->command->info("Assigned {$assignedCount} products to categories.");
    }

    private function matchProductToSubSubCategory(string $sku, string $name, array $categories): ?int
    {
        $nameLower = mb_strtolower($name);
        $skuUpper = strtoupper($sku);

        // Gaming Laptops
        if (strpos($skuUpper, 'LAP-GAM-') === 0) {
            return $categories['laptopuri-gaming'] ?? null;
        }

        // Business Laptops
        if (strpos($skuUpper, 'LAP-BUS-') === 0) {
            return $categories['laptopuri-business'] ?? null;
        }

        // Ultraportable Laptops - assign to business laptops category
        if (strpos($skuUpper, 'LAP-ULTR-') === 0) {
            return $categories['laptopuri-business'] ?? null;
        }

        // Workstation Laptops - assign to business laptops category
        if (strpos($skuUpper, 'LAP-WORK-') === 0) {
            return $categories['laptopuri-business'] ?? null;
        }

        // Mid-range Laptops - assign to gaming laptops category
        if (strpos($skuUpper, 'LAP-MID-') === 0) {
            return $categories['laptopuri-gaming'] ?? null;
        }

        // Smartphones - no direct sub-subcategory, assign to closest
        if (strpos($skuUpper, 'PHONE-') === 0) {
            // Since there's no smartphone sub-subcategory, we'll use a related one
            if (strpos($nameLower, 'iphone') !== false || strpos($nameLower, 'apple') !== false) {
                return $categories['smartwatch-apple'] ?? null;
            }
            return $categories['smartwatch-android'] ?? null;
        }

        // Tablets
        if (strpos($skuUpper, 'TAB-') === 0) {
            if (strpos($nameLower, 'ipad') !== false) {
                return $categories['tablete-ipad'] ?? null;
            }
            return $categories['tablete-android'] ?? null;
        }

        // Headphones
        if (strpos($skuUpper, 'HEAD-') === 0) {
            if (strpos($nameLower, 'airpods') !== false || strpos($nameLower, 'wireless') !== false) {
                return $categories['casti-wireless'] ?? null;
            }
            return $categories['casti-cu-fir'] ?? null;
        }

        // Smartwatches
        if (strpos($skuUpper, 'WATCH-') === 0) {
            if (strpos($nameLower, 'apple') !== false) {
                return $categories['smartwatch-apple'] ?? null;
            }
            return $categories['smartwatch-android'] ?? null;
        }

        // Cameras
        if (strpos($skuUpper, 'CAM-') === 0) {
            // Canon EOS R and Sony Alpha are mirrorless
            if (strpos($nameLower, 'eos r') !== false || strpos($nameLower, 'alpha') !== false || strpos($nameLower, 'mirrorless') !== false) {
                return $categories['camere-mirrorless'] ?? null;
            }
            return $categories['camere-dslr'] ?? null;
        }

        // Configurable products and their variants - TRICOU-BASIC
        if (strpos($skuUpper, 'TRICOU-BASIC-') === 0 || $skuUpper === 'TRICOU-BASIC-CFG') {
            return $categories['tricouri-maneca-scurta'] ?? null;
        }

        // Configurable products and their variants - JEANS-CLASSIC
        if (strpos($skuUpper, 'JEANS-CLASSIC-') === 0 || $skuUpper === 'JEANS-CLASSIC-CFG') {
            return $categories['jeans-regular'] ?? null;
        }

        // Men's T-shirts
        if (strpos($skuUpper, 'TSHIRT-') === 0) {
            if (strpos($nameLower, 'polo') !== false || strpos($nameLower, 'maneca lunga') !== false) {
                return $categories['tricouri-maneca-lunga'] ?? null;
            }
            return $categories['tricouri-maneca-scurta'] ?? null;
        }

        // Men's Jeans
        if (strpos($skuUpper, 'JEANS-') === 0) {
            if (strpos($nameLower, 'slim') !== false || strpos($nameLower, 'skinny') !== false) {
                return $categories['jeans-skinny'] ?? null;
            }
            return $categories['jeans-regular'] ?? null;
        }

        // Women's Dresses
        if (strpos($skuUpper, 'DRESS-') === 0) {
            return $categories['rochii-femei'] ?? null;
        }

        // Women's Blouses
        if (strpos($skuUpper, 'BLOUSE-') === 0) {
            return $categories['bluze-femei'] ?? null;
        }

        // Furniture
        if (strpos($skuUpper, 'FURN-') === 0) {
            if (strpos($nameLower, 'scaun') !== false || strpos($nameLower, 'chair') !== false) {
                return $categories['scaune'] ?? null;
            }
            if (strpos($nameLower, 'birou') !== false || strpos($nameLower, 'desk') !== false || strpos($nameLower, 'masa') !== false || strpos($nameLower, 'table') !== false) {
                return $categories['mese'] ?? null;
            }
            // Default to chairs if unclear
            return $categories['scaune'] ?? null;
        }

        // Kitchen
        if (strpos($skuUpper, 'KIT-') === 0) {
            if (strpos($nameLower, 'blender') !== false || strpos($nameLower, 'ustensil') !== false) {
                return $categories['ustensile-bucatarie'] ?? null;
            }
            if (strpos($nameLower, 'cafea') !== false || strpos($nameLower, 'coffee') !== false || strpos($nameLower, 'tigaie') !== false || strpos($nameLower, 'pan') !== false) {
                return $categories['tigari-bucatarie'] ?? null;
            }
            // Default to utensils
            return $categories['ustensile-bucatarie'] ?? null;
        }

        // Fitness
        if (strpos($skuUpper, 'FIT-') === 0) {
            if (strpos($nameLower, 'ganter') !== false || strpos($nameLower, 'dumbbell') !== false) {
                return $categories['gantere'] ?? null;
            }
            if (strpos($nameLower, 'covoras') !== false || strpos($nameLower, 'yoga') !== false || strpos($nameLower, 'band') !== false || strpos($nameLower, 'benzi') !== false) {
                return $categories['benzi-rezistenta'] ?? null;
            }
            // Default to dumbbells
            return $categories['gantere'] ?? null;
        }

        // Running shoes
        if (strpos($skuUpper, 'RUN-') === 0) {
            return $categories['incaltaminte-alergare'] ?? null;
        }

        // Consoles
        if (strpos($skuUpper, 'CONS-') === 0) {
            if (strpos($nameLower, 'playstation') !== false || strpos($nameLower, 'ps5') !== false) {
                return $categories['playstation'] ?? null;
            }
            if (strpos($nameLower, 'xbox') !== false) {
                return $categories['xbox'] ?? null;
            }
            // Default to PlayStation
            return $categories['playstation'] ?? null;
        }

        // Video Games
        if (strpos($skuUpper, 'GAME-') === 0) {
            if (strpos($nameLower, 'god of war') !== false || strpos($nameLower, 'action') !== false) {
                return $categories['jocuri-action'] ?? null;
            }
            if (strpos($nameLower, 'forza') !== false || strpos($nameLower, 'sport') !== false) {
                return $categories['jocuri-sport'] ?? null;
            }
            // Default to action
            return $categories['jocuri-action'] ?? null;
        }

        // Books
        if (strpos($skuUpper, 'BOOK-') === 0) {
            if (strpos($nameLower, 'murakami') !== false || strpos($nameLower, 'roman') !== false || strpos($nameLower, 'fictiune') !== false) {
                return $categories['romane'] ?? null;
            }
            if (strpos($nameLower, 'atomic') !== false || strpos($nameLower, 'habit') !== false || strpos($nameLower, 'biograf') !== false) {
                return $categories['biografii'] ?? null;
            }
            // Default to novels
            return $categories['romane'] ?? null;
        }

        // Low stock products - assign to appropriate categories
        if (strpos($skuUpper, 'LOW-STOCK-') === 0) {
            // Mouse and keyboard - assign to closest category (wireless headphones as fallback for accessories)
            if (strpos($nameLower, 'mouse') !== false) {
                return $categories['casti-wireless'] ?? null;
            }
            if (strpos($nameLower, 'tastatura') !== false || strpos($nameLower, 'keyboard') !== false) {
                return $categories['casti-wireless'] ?? null;
            }
            
            // Monitor - assign to tablets android (closest electronics category)
            if (strpos($nameLower, 'monitor') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            
            // Storage devices (SSD, HDD) - assign to tablets android
            if (strpos($nameLower, 'ssd') !== false || strpos($nameLower, 'hard disk') !== false || strpos($nameLower, 'hdd') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            
            // Webcam and microphone - assign to wireless headphones (audio/video accessories)
            if (strpos($nameLower, 'webcam') !== false || strpos($nameLower, 'microfon') !== false || strpos($nameLower, 'microphone') !== false) {
                return $categories['casti-wireless'] ?? null;
            }
            
            // Graphics card, RAM, Power supply, Motherboard, CPU cooler - PC components
            // Assign to gaming laptops (closest category for PC components)
            if (strpos($nameLower, 'placa video') !== false || strpos($nameLower, 'graphics card') !== false || 
                strpos($nameLower, 'rtx') !== false || strpos($nameLower, 'gtx') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            if (strpos($nameLower, 'ram') !== false || strpos($nameLower, 'memorie') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            if (strpos($nameLower, 'sursa') !== false || strpos($nameLower, 'power supply') !== false || strpos($nameLower, 'psu') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            if (strpos($nameLower, 'placa de baza') !== false || strpos($nameLower, 'motherboard') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            if (strpos($nameLower, 'cooler') !== false || strpos($nameLower, 'cpu cooler') !== false) {
                return $categories['tablete-android'] ?? null;
            }
            
            // USB Hub - assign to phone accessories
            if (strpos($nameLower, 'hub') !== false || strpos($nameLower, 'usb') !== false) {
                return $categories['accesorii-telefoane'] ?? null;
            }
            
            // Streaming equipment (Stream Deck, Capture Card) - assign to wireless headphones
            if (strpos($nameLower, 'stream') !== false || strpos($nameLower, 'capture') !== false) {
                return $categories['casti-wireless'] ?? null;
            }
            
            // Default fallback for any other low stock products
            return $categories['tablete-android'] ?? null;
        }

        return null;
    }
}

