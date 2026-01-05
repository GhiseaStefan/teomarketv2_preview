<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Product Images Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds product images for development/testing.
 * Assigns images to products based on their categories.
 * 
 * Depends on: ProductsSeeder, ProductToCategorySeeder
 */
class ProductImagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding product images...');
        $this->seedProductImages();
        $this->command->info('✓ Product images seeded successfully');
    }

    private function seedProductImages(): void
    {
        // Define image URLs by category (at least 10 images per category)
        $categoryImages = [
            'electronice' => [
                'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80',
            ],
            'imbracaminte' => [
                'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1506629905607-c30bb53999cb?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=800&h=800&fit=crop&q=80',
            ],
            'casa-gradina' => [
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1556912167-f556f1f39f8b?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1567013127542-490d757e51b1?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=800&fit=crop&q=80',
            ],
            'sport-fitness' => [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1605030753481-bb38b08c384a?w=800&h=800&fit=crop&q=80',
            ],
            'jocuri-consola' => [
                'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1606147931966-546962a84d3a?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1607820059870-39e0f3b24b91?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1614294148950-1f23fae0aa4e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1614294588092-894de21d99f7?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1550050073-14e46e0d6d36?w=800&h=800&fit=crop&q=80',
            ],
            'carti' => [
                'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&h=800&fit=crop&q=80',
            ],
        ];

        // Get main category IDs
        $mainCategoryIds = [
            'electronice' => DB::table('categories')->where('slug', 'electronice')->value('id'),
            'imbracaminte' => DB::table('categories')->where('slug', 'imbracaminte')->value('id'),
            'casa-gradina' => DB::table('categories')->where('slug', 'casa-gradina')->value('id'),
            'sport-fitness' => DB::table('categories')->where('slug', 'sport-fitness')->value('id'),
            'jocuri-consola' => DB::table('categories')->where('slug', 'jocuri-consola')->value('id'),
            'carti' => DB::table('categories')->where('slug', 'carti')->value('id'),
        ];

        // Create reverse mapping: category_id => main_category_slug
        $categoryToMainCategory = [];
        foreach ($mainCategoryIds as $slug => $id) {
            $categoryToMainCategory[$id] = $slug;
        }

        // Get all products with their categories
        $products = DB::table('products')
            ->leftJoin('product_to_category', 'products.id', '=', 'product_to_category.product_id')
            ->leftJoin('categories', 'product_to_category.category_id', '=', 'categories.id')
            ->select('products.id', 'products.sku', 'categories.slug as category_slug', 'categories.parent_id', 'categories.id as category_id')
            ->get()
            ->groupBy('id');

        foreach ($products as $productId => $productCategories) {
            // Delete existing images for this product
            DB::table('product_images')->where('product_id', $productId)->delete();

            // Find the main category for this product
            $mainCategorySlug = null;
            foreach ($productCategories as $pc) {
                // Check if this is a main category (parent_id is null)
                if ($pc->parent_id === null && isset($categoryImages[$pc->category_slug])) {
                    $mainCategorySlug = $pc->category_slug;
                    break;
                }

                // Check if this category's parent is a main category
                if ($pc->parent_id !== null && isset($categoryToMainCategory[$pc->parent_id])) {
                    $mainCategorySlug = $categoryToMainCategory[$pc->parent_id];
                    break;
                }
            }

            // Get images for this category or use default
            $defaultImages = [
                'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=800&fit=crop&q=80',
                'https://images.unsplash.com/photo-1575186083123-cc45060c8d83?w=800&h=800&fit=crop&q=80',
            ];
            $images = $mainCategorySlug && isset($categoryImages[$mainCategorySlug])
                ? $categoryImages[$mainCategorySlug]
                : $defaultImages;

            // Add 10 images per product (cycling through available images)
            $numImages = 10;
            for ($i = 0; $i < $numImages; $i++) {
                DB::table('product_images')->insert([
                    'product_id' => $productId,
                    'image_url' => $images[$i % count($images)],
                    'sort_order' => $i + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}

