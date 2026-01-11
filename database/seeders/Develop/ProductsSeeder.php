<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Product;
use App\Models\ProductFamily;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\ProductAttributeValue;
use App\Models\ProductImage;
use App\Models\Category;
use App\Enums\ProductType;

/**
 * Products Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds products for development/testing.
 * Contains a large array of product data (gaming laptops, business laptops, smartphones, tablets, etc.)
 * Also includes examples of configurable products with variants and attributes.
 * 
 * What this seeder does:
 * - Creates all products (simple, configurable, variants) with all required fields
 * - Sets brand_id for all products (via detectBrandId method)
 * - Adds attributes to laptop products (via addLaptopAttributes method)
 * - Sets categories for configurable products (Tricou Basic, Jeans Clasic)
 * - Sets attributes for variant products (Size, Color)
 * 
 * What other seeders do:
 * - ProductAttributeValuesSeeder: Sets families for all products (simple, configurable, variants)
 * - ProductToCategorySeeder: Sets categories for simple products (based on SKU/name matching)
 * - ProductImagesSeeder: Sets images for all products (based on categories)
 * 
 * Depends on: BrandsSeeder, AttributesSeeder, AttributeValuesSeeder (must run before ProductsSeeder)
 */
class ProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding products...');

        // Note: Attributes should be seeded first using AttributeValuesSeeder
        // before running this seeder

        // Seed simple and configurable products
        $this->seedProducts();

        // Finally, seed configurable products with variants
        $this->seedConfigurableProducts();

        // Note: Families will be assigned by ProductAttributeValuesSeeder
        // Note: Categories will be assigned by ProductToCategorySeeder
        // Note: Images will be assigned by ProductImagesSeeder

        $this->command->info('✓ Products seeded successfully');
    }

    private function seedProducts(): void
    {
        // Get brands mapping
        $brands = DB::table('brands')->pluck('id', 'slug')->toArray();

        if (empty($brands)) {
            $this->command->warn('⚠️  No brands found. Please run BrandsSeeder first.');
        }

        $products = $this->getProductData();

        foreach ($products as $product) {
            // Detect brand from product name
            $brandId = $this->detectBrandId($product['name'], $brands);

            // Generate slug from name if not provided
            $slug = $product['slug'] ?? Str::slug($product['name']);

            // Remove laptop attribute keys from product data before saving to database
            // (these are not database columns, they are used only for attribute assignment)
            $productData = $product;
            unset(
                $productData['operating_system'],
                $productData['processor_type'],
                $productData['ram_capacity'],
                $productData['display_diagonal'],
                $productData['color']
            );

            // Ensure all required fields are populated with defaults if missing
            $productData = array_merge([
                'type' => ProductType::SIMPLE->value,
                'sku' => $productData['sku'] ?? null,
                'ean' => $productData['ean'] ?? null,
                'model' => $productData['model'] ?? null,
                'name' => $productData['name'] ?? 'Product without name',
                'slug' => $slug,
                'description' => $productData['description'] ?? '',
                'short_description' => $productData['short_description'] ?? '',
                'price_ron' => $productData['price_ron'] ?? 0.00,
                'purchase_price_ron' => $productData['purchase_price_ron'] ?? 0.00,
                'brand_id' => $brandId,
                'family_id' => $productData['family_id'] ?? null, // Will be set by ProductAttributeValuesSeeder
                'stock_quantity' => $productData['stock_quantity'] ?? 0,
                'weight' => $productData['weight'] ?? 0.00,
                'length' => $productData['length'] ?? 0.00,
                'width' => $productData['width'] ?? 0.00,
                'height' => $productData['height'] ?? 0.00,
                'main_image_url' => $productData['main_image_url'] ?? null,
                'status' => $productData['status'] ?? true,
                'parent_id' => null, // Simple products don't have parent
                'created_at' => now(),
                'updated_at' => now(),
            ], $productData);

            $productModel = Product::updateOrCreate(
                ['sku' => $product['sku']],
                $productData
            );

            // Add laptop attributes if this is a laptop
            // Pass the original $product array which contains the attribute data
            if (str_starts_with($product['sku'], 'LAP-')) {
                $this->addLaptopAttributes($productModel, $product);
            }
        }
    }

    /**
     * Seed configurable products with variants.
     * These are examples of products with multiple variants (e.g., different sizes and colors).
     */
    private function seedConfigurableProducts(): void
    {
        $this->command->info('Creating configurable products with variants...');

        // Get attributes
        $sizeAttribute = Attribute::where('code', 'size')->first();
        $colorAttribute = Attribute::where('code', 'color')->first();

        if (!$sizeAttribute || !$colorAttribute) {
            $this->command->warn('⚠️  Attributes not found. Skipping configurable products.');
            return;
        }

        // Get categories
        $tricouCategory = Category::where('slug', 'tricouri-maneca-scurta')->first();
        $jeansCategory = Category::where('slug', 'jeans-regular')->first();

        // Get brands mapping (optional - can be null)
        $brands = DB::table('brands')->pluck('id', 'slug')->toArray();
        // Try to find a generic brand or leave null

        // Get all size values
        $sizes = AttributeValue::where('attribute_id', $sizeAttribute->id)
            ->orderBy('sort_order')
            ->get()
            ->keyBy('value');

        $sizeM = $sizes->get('M');
        $sizeL = $sizes->get('L');
        $sizeXL = $sizes->get('XL');

        // Get all 8 base colors
        $colorWhite = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Alb')->first();
        $colorBlack = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Negru')->first();
        $colorRed = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Roșu')->first();
        $colorBlue = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Albastru')->first();
        $colorGreen = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Verde')->first();
        $colorGrey = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Gri')->first();
        $colorBeige = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Bej')->first();
        $colorBrown = AttributeValue::where('attribute_id', $colorAttribute->id)->where('value', 'Maro')->first();

        // Base EAN for generating unique EANs for variants (starting from 2000000000000)
        $eanBase = 2000000000000;
        $eanCounter = 0;

        // Example 1: Tricou Basic Configurable
        $tricouParent = Product::updateOrCreate(
            ['sku' => 'TRICOU-BASIC-CFG'],
            [
                'type' => ProductType::CONFIGURABLE->value,
                'parent_id' => null,
                'sku' => 'TRICOU-BASIC-CFG',
                'ean' => '2000000000000',
                'model' => 'Tricou Basic',
                'name' => 'Tricou Basic',
                'slug' => 'tricou-basic',
                'description' => 'Tricou de bază cu mai multe variante de mărime și culoare. Material 100% bumbac.',
                'short_description' => 'Tricou basic cu variante',
                'price_ron' => 0, // Parent doesn't have price
                'purchase_price_ron' => 0,
                'brand_id' => null, // Generic product, no specific brand
                'family_id' => null, // Will be set by ProductAttributeValuesSeeder
                'stock_quantity' => 0, // Parent doesn't have stock
                'weight' => 0.2,
                'length' => 30.0,
                'width' => 25.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&q=80',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Link parent to category
        if ($tricouCategory) {
            $tricouParent->categories()->syncWithoutDetaching([$tricouCategory->id]);
        }

        // Create variants for Tricou Basic - all 8 base colors × 3 sizes (M, L, XL) = 24 variants
        $tricouVariants = [];

        // Base colors array with prices and color-specific images
        $baseColors = [
            [
                'value' => $colorWhite,
                'price' => 49.99,
                'image_url' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&q=80&auto=format', // White t-shirt
            ],
            [
                'value' => $colorBlack,
                'price' => 49.99,
                'image_url' => 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=800&fit=crop&q=80&auto=format', // Black t-shirt
            ],
            [
                'value' => $colorRed,
                'price' => 52.99,
                'image_url' => 'https://plus.unsplash.com/premium_photo-1682092846845-d41a89d3ce8b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Red t-shirt
            ],
            [
                'value' => $colorBlue,
                'price' => 52.99,
                'image_url' => 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Blue t-shirt
            ],
            [
                'value' => $colorGreen,
                'price' => 51.99,
                'image_url' => 'https://plus.unsplash.com/premium_photo-1701204056494-1fff4540e991?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Green t-shirt
            ],
            [
                'value' => $colorGrey,
                'price' => 49.99,
                'image_url' => 'https://plus.unsplash.com/premium_photo-1689565524694-88720c282271?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8Z3JheSUyMHNoaXJ0fGVufDB8fDB8fHww', // Grey t-shirt
            ],
            [
                'value' => $colorBeige,
                'price' => 50.99,
                'image_url' => 'https://plus.unsplash.com/premium_photo-1689568076776-a0aa84bf591d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Beige/tan t-shirt
            ],
            [
                'value' => $colorBrown,
                'price' => 53.99,
                'image_url' => 'https://plus.unsplash.com/premium_photo-1690338235263-68f2c173b5cc?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Brown t-shirt
            ],
        ];

        // Create all combinations: 8 colors × 3 sizes
        foreach ($baseColors as $colorData) {
            // M size
            $tricouVariants[] = [
                'size' => $sizeM,
                'color' => $colorData['value'],
                'price' => $colorData['price'],
                'image_url' => $colorData['image_url'],
            ];

            // L size
            $tricouVariants[] = [
                'size' => $sizeL,
                'color' => $colorData['value'],
                'price' => $colorData['price'],
                'image_url' => $colorData['image_url'],
            ];

            // XL size (slightly higher price)
            $tricouVariants[] = [
                'size' => $sizeXL,
                'color' => $colorData['value'],
                'price' => $colorData['price'] + 5.00, // XL costs 5 RON more
                'image_url' => $colorData['image_url'],
            ];
        }

        foreach ($tricouVariants as $variant) {
            $variantName = "Tricou Basic - {$variant['color']->value} {$variant['size']->value}";
            $variantSlug = Str::slug($variantName);
            // Generate clean SKU using slug-friendly uppercase values
            $colorSlug = Str::upper(Str::slug($variant['color']->value));
            $sizeSlug = Str::upper($variant['size']->value);
            $variantSku = "TRICOU-BASIC-{$colorSlug}-{$sizeSlug}";
            $eanCounter++;
            $variantEan = (string)($eanBase + $eanCounter);

            // Use color-specific image URL
            $variantImageUrl = $variant['image_url'] ?? $tricouParent->main_image_url;

            // Set stock to 0 for green color variants, and for black color L size
            $stockQuantity = ($variant['color']->id === $colorGreen->id || ($variant['color']->id === $colorBlack->id && $variant['size']->id === $sizeL->id)) ? 0 : rand(5, 50);

            $variantProduct = Product::updateOrCreate(
                ['sku' => $variantSku],
                [
                    'parent_id' => $tricouParent->id,
                    'type' => ProductType::VARIANT->value,
                    'sku' => $variantSku,
                    'ean' => $variantEan,
                    'model' => 'Tricou Basic',
                    'name' => $variantName,
                    'slug' => $variantSlug,
                    'description' => $tricouParent->description,
                    'short_description' => $variantName,
                    'price_ron' => $variant['price'],
                    'purchase_price_ron' => 20.00,
                    'brand_id' => null, // Inherits from parent conceptually, but stored on variant
                    'family_id' => null, // Will be inherited from parent by ProductAttributeValuesSeeder
                    'stock_quantity' => $stockQuantity,
                    'weight' => 0.2,
                    'length' => 30.0,
                    'width' => 25.0,
                    'height' => 2.0,
                    'main_image_url' => $variantImageUrl,
                    'status' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Link variant to attributes
            ProductAttributeValue::updateOrCreate(
                [
                    'product_id' => $variantProduct->id,
                    'attribute_id' => $sizeAttribute->id,
                ],
                ['attribute_value_id' => $variant['size']->id]
            );

            ProductAttributeValue::updateOrCreate(
                [
                    'product_id' => $variantProduct->id,
                    'attribute_id' => $colorAttribute->id,
                ],
                ['attribute_value_id' => $variant['color']->id]
            );

            // Add color-specific image to product_images table
            ProductImage::updateOrCreate(
                [
                    'product_id' => $variantProduct->id,
                    'sort_order' => 1,
                ],
                [
                    'image_url' => $variantImageUrl,
                ]
            );
        }

        // Example 2: Jeans Configurable (only size variants)
        $jeansParent = Product::updateOrCreate(
            ['sku' => 'JEANS-CLASSIC-CFG'],
            [
                'type' => ProductType::CONFIGURABLE->value,
                'parent_id' => null,
                'sku' => 'JEANS-CLASSIC-CFG',
                'ean' => '2000000000100',
                'model' => 'Jeans Clasic',
                'name' => 'Jeans Clasic Albastru',
                'slug' => 'jeans-clasic-albastru',
                'description' => 'Jeans clasic din denim, fit regulat, confortabil și durabil. Disponibil în multiple mărimi.',
                'short_description' => 'Jeans clasic cu variante de mărime',
                'price_ron' => 0,
                'purchase_price_ron' => 0,
                'brand_id' => null, // Generic product, no specific brand
                'family_id' => null, // Will be set by ProductAttributeValuesSeeder
                'stock_quantity' => 0,
                'weight' => 0.8,
                'length' => 110.0,
                'width' => 40.0,
                'height' => 3.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop&q=80',
                'status' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Link parent to category
        if ($jeansCategory) {
            $jeansParent->categories()->syncWithoutDetaching([$jeansCategory->id]);
        }

        $jeansSizes = [
            ['size' => $sizeM, 'price' => 299.99],
            ['size' => $sizeL, 'price' => 299.99],
            ['size' => $sizeXL, 'price' => 319.99],
        ];

        foreach ($jeansSizes as $variant) {
            $variantName = "Jeans Clasic Albastru {$variant['size']->value}";
            $variantSlug = Str::slug($variantName);
            $sizeSlug = Str::upper($variant['size']->value);
            $variantSku = "JEANS-CLASSIC-{$sizeSlug}";
            $eanCounter++;
            $variantEan = (string)($eanBase + $eanCounter);

            $variantProduct = Product::updateOrCreate(
                ['sku' => $variantSku],
                [
                    'parent_id' => $jeansParent->id,
                    'type' => ProductType::VARIANT->value,
                    'sku' => $variantSku,
                    'ean' => $variantEan,
                    'model' => 'Jeans Clasic',
                    'name' => $variantName,
                    'slug' => $variantSlug,
                    'description' => $jeansParent->description,
                    'short_description' => $variantName,
                    'price_ron' => $variant['price'],
                    'purchase_price_ron' => 120.00,
                    'brand_id' => null, // Inherits from parent conceptually
                    'family_id' => null, // Will be inherited from parent by ProductAttributeValuesSeeder
                    'stock_quantity' => rand(10, 40),
                    'weight' => 0.8,
                    'length' => 110.0,
                    'width' => 40.0,
                    'height' => 3.0,
                    'main_image_url' => $jeansParent->main_image_url,
                    'status' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Link variant to size attribute only
            ProductAttributeValue::updateOrCreate(
                [
                    'product_id' => $variantProduct->id,
                    'attribute_id' => $sizeAttribute->id,
                ],
                ['attribute_value_id' => $variant['size']->id]
            );
        }

        $this->command->info('✓ Configurable products with variants created');
    }

    /**
     * Detect brand ID from product name.
     * 
     * This method tries to detect the brand from the product name by matching keywords.
     * Returns the brand ID if found, or null if no brand can be detected.
     * 
     * @param string $productName
     * @param array $brands Array of ['slug' => 'id'] mappings
     * @return int|null
     */
    private function detectBrandId(string $productName, array $brands): ?int
    {
        if (empty($brands)) {
            return null;
        }

        // Brand name to slug mapping (order matters - more specific first)
        $brandMapping = [
            // Apple products (check for iPhone, iPad, MacBook, AirPods, Apple Watch first)
            'iphone' => 'apple',
            'ipad' => 'apple',
            'macbook' => 'apple',
            'airpods' => 'apple',
            'apple watch' => 'apple',
            'apple' => 'apple',

            // Google/Pixel
            'pixel' => 'google',
            'google' => 'google',

            // Microsoft/Xbox
            'xbox' => 'microsoft',
            'surface' => 'microsoft',
            'microsoft' => 'microsoft',

            // Samsung
            'galaxy' => 'samsung',
            'samsung' => 'samsung',

            // Gaming brands
            'rog' => 'asus',
            'predator' => 'acer',
            'legion' => 'lenovo',
            'alienware' => 'dell',
            'nitro' => 'acer',

            // Laptop brands
            'asus' => 'asus',
            'zenbook' => 'asus',
            'lenovo' => 'lenovo',
            'thinkpad' => 'lenovo',
            'acer' => 'acer',
            'swift' => 'acer',
            'dell' => 'dell',
            'xps' => 'dell',
            'latitude' => 'dell',
            'hp' => 'hp',
            'elitebook' => 'hp',
            'spectre' => 'hp',

            // Phone brands
            'oneplus' => 'oneplus',
            'xiaomi' => 'xiaomi',
            'huawei' => 'huawei',
            'motorola' => 'motorola',
            'nokia' => 'nokia',
            'lg' => 'lg',

            // Camera brands
            'canon' => 'canon',
            'eos' => 'canon',
            'nikon' => 'nikon',
            'sony' => 'sony',
            'alpha' => 'sony',
            'wh-1000xm' => 'sony',

            // Fashion brands
            'nike' => 'nike',
            'adidas' => 'adidas',
        ];

        $productNameLower = mb_strtolower($productName);

        // Try to match brands (order matters - more specific first)
        foreach ($brandMapping as $keyword => $slug) {
            if (str_contains($productNameLower, $keyword) && isset($brands[$slug])) {
                return $brands[$slug];
            }
        }

        return null;
    }

    /**
     * Add laptop attributes to a product.
     * 
     * @param Product $product
     * @param array $productData
     */
    private function addLaptopAttributes(Product $product, array $productData): void
    {
        // Get attributes
        $osAttribute = Attribute::where('code', 'operating_system')->first();
        $processorAttribute = Attribute::where('code', 'processor_type')->first();
        $ramAttribute = Attribute::where('code', 'ram_capacity')->first();
        $displayAttribute = Attribute::where('code', 'display_diagonal')->first();
        $colorAttribute = Attribute::where('code', 'color')->first();

        if (!$osAttribute || !$processorAttribute || !$ramAttribute || !$displayAttribute) {
            return;
        }

        // Extract or use default values from product data
        $operatingSystem = $productData['operating_system'] ?? $this->extractOperatingSystem($productData);
        $processorType = $productData['processor_type'] ?? $this->extractProcessorType($productData);
        $ramCapacity = $productData['ram_capacity'] ?? $this->extractRAMCapacity($productData);
        $displayDiagonal = $productData['display_diagonal'] ?? $this->extractDisplayDiagonal($productData);
        $color = $productData['color'] ?? $this->extractLaptopColor($product);

        // Add operating system
        if ($operatingSystem) {
            $osValue = AttributeValue::where('attribute_id', $osAttribute->id)
                ->where('value', $operatingSystem)
                ->first();
            if ($osValue) {
                ProductAttributeValue::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'attribute_id' => $osAttribute->id,
                    ],
                    ['attribute_value_id' => $osValue->id]
                );
            }
        }

        // Add processor type
        if ($processorType) {
            $processorValue = AttributeValue::where('attribute_id', $processorAttribute->id)
                ->where('value', $processorType)
                ->first();
            if ($processorValue) {
                ProductAttributeValue::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'attribute_id' => $processorAttribute->id,
                    ],
                    ['attribute_value_id' => $processorValue->id]
                );
            }
        }

        // Add RAM capacity
        if ($ramCapacity) {
            $ramValue = AttributeValue::where('attribute_id', $ramAttribute->id)
                ->where('value', $ramCapacity)
                ->first();
            if ($ramValue) {
                ProductAttributeValue::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'attribute_id' => $ramAttribute->id,
                    ],
                    ['attribute_value_id' => $ramValue->id]
                );
            }
        }

        // Add display diagonal
        if ($displayDiagonal) {
            $displayValue = AttributeValue::where('attribute_id', $displayAttribute->id)
                ->where('value', $displayDiagonal)
                ->first();
            if ($displayValue) {
                ProductAttributeValue::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'attribute_id' => $displayAttribute->id,
                    ],
                    ['attribute_value_id' => $displayValue->id]
                );
            }
        }

        // Add color attribute
        if ($colorAttribute && $color) {
            $colorValue = AttributeValue::where('attribute_id', $colorAttribute->id)
                ->where('value', $color)
                ->first();
            if ($colorValue) {
                ProductAttributeValue::updateOrCreate(
                    [
                        'product_id' => $product->id,
                        'attribute_id' => $colorAttribute->id,
                    ],
                    ['attribute_value_id' => $colorValue->id]
                );
            }
        }
    }

    /**
     * Extract operating system from product data.
     */
    private function extractOperatingSystem(array $productData): ?string
    {
        $name = strtolower($productData['name'] ?? '');
        $description = strtolower($productData['description'] ?? '');

        // Apple products usually come with macOS
        if (str_contains($name, 'apple') || str_contains($name, 'macbook')) {
            return 'macOS';
        }

        // Default to Windows 11 for most laptops
        return 'Windows 11';
    }

    /**
     * Extract processor type from product data.
     */
    private function extractProcessorType(array $productData): ?string
    {
        $name = strtolower($productData['name'] ?? '');
        $description = strtolower($productData['description'] ?? '');
        $combined = $name . ' ' . $description;

        // Apple processors
        if (preg_match('/m3\s+max/i', $combined)) {
            return 'Apple M3 Max';
        }
        if (preg_match('/m3\s+pro/i', $combined)) {
            return 'Apple M3 Pro';
        }
        if (preg_match('/\bm3\b/i', $combined)) {
            return 'Apple M3';
        }
        if (preg_match('/\bm2\b/i', $combined)) {
            return 'Apple M2';
        }
        if (preg_match('/\bm1\b/i', $combined)) {
            return 'Apple M1';
        }

        // AMD processors
        if (preg_match('/ryzen\s*9/i', $combined)) {
            return 'AMD Ryzen 9';
        }
        if (preg_match('/ryzen\s*7/i', $combined)) {
            return 'AMD Ryzen 7';
        }
        if (preg_match('/ryzen\s*5/i', $combined)) {
            return 'AMD Ryzen 5';
        }

        // Intel processors
        if (preg_match('/core\s*i9/i', $combined)) {
            return 'Intel Core i9';
        }
        if (preg_match('/core\s*i7/i', $combined)) {
            return 'Intel Core i7';
        }
        if (preg_match('/core\s*i5/i', $combined)) {
            return 'Intel Core i5';
        }

        return null;
    }

    /**
     * Extract RAM capacity from product data.
     */
    private function extractRAMCapacity(array $productData): ?string
    {
        $description = strtolower($productData['description'] ?? '');

        if (preg_match('/(\d+)\s*gb\s*ram/i', $description, $matches)) {
            $ram = (int)$matches[1];
            if ($ram <= 8) return '8GB';
            if ($ram <= 16) return '16GB';
            if ($ram <= 32) return '32GB';
            if ($ram <= 64) return '64GB';
            return '128GB';
        }

        // Default to 16GB if not found
        return '16GB';
    }

    /**
     * Extract display diagonal from product data.
     */
    private function extractDisplayDiagonal(array $productData): ?string
    {
        $name = strtolower($productData['name'] ?? '');
        $description = strtolower($productData['description'] ?? '');
        $combined = $name . ' ' . $description;

        // Try to match display sizes
        if (preg_match('/(\d+\.?\d*)\s*["\']/i', $combined, $matches)) {
            $size = (float)$matches[1];
            // Round to nearest standard size
            if ($size >= 13 && $size < 13.5) return '13"';
            if ($size >= 13.5 && $size < 14) return '13.3"';
            if ($size >= 14 && $size < 14.5) return '14"';
            if ($size >= 15 && $size < 15.5) return '15"';
            if ($size >= 15.5 && $size < 16) return '15.6"';
            if ($size >= 16 && $size < 16.5) return '16"';
            if ($size >= 16.5 && $size < 17) return '16.2"';
            if ($size >= 17 && $size < 17.5) return '17"';
            if ($size >= 17.5 && $size < 18) return '17.3"';
            if ($size >= 18) return '18"';
            return $matches[1] . '"';
        }

        return null;
    }

    /**
     * Extract or assign a color for laptop products.
     * Returns a deterministic color based on product ID for consistency.
     */
    private function extractLaptopColor(Product $product): ?string
    {
        // Common laptop colors
        $commonLaptopColors = ['Negru', 'Gri', 'Argintiu', 'Alb', 'Antracit'];

        // Use product ID to deterministically assign a color
        // This ensures the same laptop always gets the same color
        $colorIndex = ($product->id % count($commonLaptopColors));

        return $commonLaptopColors[$colorIndex];
    }

    /**
     * Get product data array.
     * Contains the full product array extracted from DevelopmentSeeder.
     */
    private function getProductData(): array
    {
        $products = [

            // Gaming Laptops
            [
                'sku' => 'LAP-GAM-001',
                'ean' => '1234567890123',
                'model' => 'Gaming Pro 15',
                'name' => 'Laptop Gaming ASUS ROG Strix G15',
                'description' => 'Laptop gaming performant cu procesor AMD Ryzen 9 si placa video NVIDIA RTX 4070. Perfect pentru gaming si streaming.',
                'short_description' => 'Laptop gaming de top cu RTX 4070',
                'price_ron' => 8999.99,
                'purchase_price_ron' => 6500.00,
                'stock_quantity' => 15,
                'weight' => 2.5,
                'length' => 35.0,
                'width' => 25.0,
                'height' => 2.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 9',
                'ram_capacity' => '16GB',
                'display_diagonal' => '15"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-002',
                'ean' => '1234567890128',
                'model' => 'Legion 5 Pro',
                'name' => 'Lenovo Legion 5 Pro 16" RTX 4060',
                'description' => 'Laptop gaming cu ecran QHD 165Hz, procesor AMD Ryzen 7 si RTX 4060. Ideal pentru gaming competitiv.',
                'short_description' => 'Laptop gaming Legion cu RTX 4060',
                'price_ron' => 7499.99,
                'purchase_price_ron' => 5800.00,
                'stock_quantity' => 12,
                'weight' => 2.6,
                'length' => 35.6,
                'width' => 26.4,
                'height' => 2.6,
                'main_image_url' => 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-003',
                'ean' => '1234567890129',
                'model' => 'Predator Helios',
                'name' => 'Acer Predator Helios 16 RTX 4080',
                'description' => 'Laptop gaming premium cu RTX 4080, procesor Intel Core i9 si ecran 16" QHD.',
                'short_description' => 'Laptop gaming premium cu RTX 4080',
                'price_ron' => 12999.99,
                'purchase_price_ron' => 9800.00,
                'stock_quantity' => 8,
                'weight' => 2.8,
                'length' => 36.0,
                'width' => 28.0,
                'height' => 2.7,
                'main_image_url' => 'https://images.unsplash.com/photo-1499914485622-a88fac536970?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i9',
                'ram_capacity' => '32GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            // Business Laptops
            [
                'sku' => 'LAP-BUS-001',
                'ean' => '1234567890126',
                'model' => 'ThinkPad X1 Carbon',
                'name' => 'Lenovo ThinkPad X1 Carbon Gen 11',
                'description' => 'Laptop business ultraportabil cu procesor Intel Core i7, perfect pentru profesionisti.',
                'short_description' => 'Laptop business ultraportabil',
                'price_ron' => 6999.99,
                'purchase_price_ron' => 5500.00,
                'stock_quantity' => 10,
                'weight' => 1.12,
                'length' => 31.5,
                'width' => 22.2,
                'height' => 1.55,
                'main_image_url' => 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1120&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-002',
                'ean' => '1234567890130',
                'model' => 'MacBook Pro 14',
                'name' => 'Apple MacBook Pro 14" M3 Pro',
                'description' => 'Laptop profesional Apple cu chip M3 Pro, ecran Liquid Retina XDR si performanta exceptionala.',
                'short_description' => 'MacBook Pro 14" cu chip M3 Pro',
                'price_ron' => 12999.99,
                'purchase_price_ron' => 10500.00,
                'stock_quantity' => 6,
                'weight' => 1.6,
                'length' => 31.26,
                'width' => 22.12,
                'height' => 1.55,
                'main_image_url' => 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'macOS',
                'processor_type' => 'Apple M3 Pro',
                'ram_capacity' => '32GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-003',
                'ean' => '1234567890131',
                'model' => 'Dell XPS 13',
                'name' => 'Dell XPS 13 Plus Intel i7',
                'description' => 'Laptop ultraportabil cu ecran OLED 13.4", procesor Intel Core i7 si design premium.',
                'short_description' => 'Dell XPS 13 Plus ultraportabil',
                'price_ron' => 7999.99,
                'purchase_price_ron' => 6200.00,
                'stock_quantity' => 9,
                'weight' => 1.26,
                'length' => 29.57,
                'width' => 19.87,
                'height' => 1.5,
                'main_image_url' => 'https://plus.unsplash.com/premium_photo-1681302547899-9339f12aca53?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '13.4"',
                'status' => true,
            ],
            // Additional Laptops
            [
                'sku' => 'LAP-GAM-004',
                'ean' => '1234567890176',
                'model' => 'ROG Zephyrus G14',
                'name' => 'ASUS ROG Zephyrus G14 RTX 4070',
                'description' => 'Laptop gaming compact 14" cu RTX 4070, procesor AMD Ryzen 9 7940HS si ecran QHD 165Hz.',
                'short_description' => 'Laptop gaming compact ASUS ROG G14',
                'price_ron' => 9499.99,
                'purchase_price_ron' => 7200.00,
                'stock_quantity' => 10,
                'weight' => 1.72,
                'length' => 31.2,
                'width' => 22.7,
                'height' => 1.85,
                'main_image_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 9',
                'ram_capacity' => '32GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-005',
                'ean' => '1234567890177',
                'model' => 'Legion 7i Pro',
                'name' => 'Lenovo Legion 7i Pro Gen 8 RTX 4090',
                'description' => 'Laptop gaming flagship cu RTX 4090, procesor Intel Core i9-13900HX si ecran 16" WQXGA 240Hz.',
                'short_description' => 'Laptop gaming Legion 7i Pro cu RTX 4090',
                'price_ron' => 15999.99,
                'purchase_price_ron' => 12500.00,
                'stock_quantity' => 5,
                'weight' => 2.8,
                'length' => 35.8,
                'width' => 26.4,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i9',
                'ram_capacity' => '32GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-006',
                'ean' => '1234567890178',
                'model' => 'Nitro 5',
                'name' => 'Acer Nitro 5 AN515-58 RTX 4060',
                'description' => 'Laptop gaming accesibil cu RTX 4060, procesor Intel Core i7-12650H si ecran Full HD 144Hz.',
                'short_description' => 'Laptop gaming Acer Nitro 5 RTX 4060',
                'price_ron' => 5999.99,
                'purchase_price_ron' => 4800.00,
                'stock_quantity' => 18,
                'weight' => 2.4,
                'length' => 36.3,
                'width' => 27.8,
                'height' => 2.6,
                'main_image_url' => 'https://plus.unsplash.com/premium_photo-1681160405580-a68e9c4707f9?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '15.6"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-007',
                'ean' => '1234567890179',
                'model' => 'Alienware m18',
                'name' => 'Dell Alienware m18 RTX 4080',
                'description' => 'Laptop gaming performant 18" cu RTX 4080, procesor Intel Core i9-13900HX si ecran QHD+ 165Hz.',
                'short_description' => 'Laptop gaming Dell Alienware m18',
                'price_ron' => 13999.99,
                'purchase_price_ron' => 11000.00,
                'stock_quantity' => 7,
                'weight' => 4.23,
                'length' => 41.0,
                'width' => 32.0,
                'height' => 3.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i9',
                'ram_capacity' => '32GB',
                'display_diagonal' => '18"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-GAM-008',
                'ean' => '1234567890180',
                'model' => 'ROG Flow X16',
                'name' => 'ASUS ROG Flow X16 RTX 4070',
                'description' => 'Laptop gaming 2-in-1 cu RTX 4070, procesor AMD Ryzen 9 si ecran touchscreen QHD+ 165Hz.',
                'short_description' => 'Laptop gaming 2-in-1 ASUS ROG Flow',
                'price_ron' => 10999.99,
                'purchase_price_ron' => 8500.00,
                'stock_quantity' => 8,
                'weight' => 2.2,
                'length' => 35.5,
                'width' => 25.1,
                'height' => 1.95,
                'main_image_url' => 'https://images.unsplash.com/photo-1542744095-291d1f67b221?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 9',
                'ram_capacity' => '32GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-004',
                'ean' => '1234567890181',
                'model' => 'ThinkPad X1 Yoga',
                'name' => 'Lenovo ThinkPad X1 Yoga Gen 8',
                'description' => 'Laptop business convertibil 14" cu procesor Intel Core i7, touchscreen OLED si stilus inclus.',
                'short_description' => 'Laptop business convertibil ThinkPad X1 Yoga',
                'price_ron' => 8999.99,
                'purchase_price_ron' => 7200.00,
                'stock_quantity' => 11,
                'weight' => 1.39,
                'length' => 31.5,
                'width' => 22.2,
                'height' => 1.58,
                'main_image_url' => 'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-005',
                'ean' => '1234567890182',
                'model' => 'Latitude 7440',
                'name' => 'Dell Latitude 7440 Intel i7',
                'description' => 'Laptop business 14" cu procesor Intel Core i7-1365U, 16GB RAM si ecran Full HD antireflex.',
                'short_description' => 'Laptop business Dell Latitude 7440',
                'price_ron' => 5999.99,
                'purchase_price_ron' => 4800.00,
                'stock_quantity' => 14,
                'weight' => 1.35,
                'length' => 32.1,
                'width' => 21.4,
                'height' => 1.9,
                'main_image_url' => 'https://plus.unsplash.com/premium_photo-1670274609267-202ec99f8620?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-006',
                'ean' => '1234567890183',
                'model' => 'EliteBook 840',
                'name' => 'HP EliteBook 840 G10 Intel i7',
                'description' => 'Laptop business premium 14" cu procesor Intel Core i7-1355U, securitate avansata si design durabil.',
                'short_description' => 'Laptop business HP EliteBook 840',
                'price_ron' => 6499.99,
                'purchase_price_ron' => 5200.00,
                'stock_quantity' => 12,
                'weight' => 1.42,
                'length' => 31.59,
                'width' => 22.4,
                'height' => 1.99,
                'main_image_url' => 'https://images.unsplash.com/photo-1526657782461-9fe13402a841?q=80&w=692&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-007',
                'ean' => '1234567890184',
                'model' => 'MacBook Air 15',
                'name' => 'Apple MacBook Air 15" M3',
                'description' => 'Laptop ultraportabil Apple cu chip M3, ecran Liquid Retina 15.3" si baterie de lunga durata.',
                'short_description' => 'MacBook Air 15" cu chip M3',
                'price_ron' => 8999.99,
                'purchase_price_ron' => 7500.00,
                'stock_quantity' => 13,
                'weight' => 1.51,
                'length' => 34.04,
                'width' => 23.76,
                'height' => 1.15,
                'main_image_url' => 'https://plus.unsplash.com/premium_photo-1681666713677-8bd559bef6bb?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'macOS',
                'processor_type' => 'Apple M3',
                'ram_capacity' => '16GB',
                'display_diagonal' => '15"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-BUS-008',
                'ean' => '1234567890185',
                'model' => 'Surface Laptop 5',
                'name' => 'Microsoft Surface Laptop 5 13.5"',
                'description' => 'Laptop elegant cu ecran PixelSense touchscreen 13.5", procesor Intel Core i7 si design premium.',
                'short_description' => 'Microsoft Surface Laptop 5',
                'price_ron' => 7499.99,
                'purchase_price_ron' => 6000.00,
                'stock_quantity' => 10,
                'weight' => 1.30,
                'length' => 30.8,
                'width' => 22.3,
                'height' => 1.48,
                'main_image_url' => 'https://images.unsplash.com/photo-1471897488648-5eae4ac6686b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '13.3"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-ULTR-001',
                'ean' => '1234567890186',
                'model' => 'Swift 3',
                'name' => 'Acer Swift 3 SF314-72 Intel i5',
                'description' => 'Laptop ultraportabil 14" cu procesor Intel Core i5-1335U, design subtire si baterie de lunga durata.',
                'short_description' => 'Laptop ultraportabil Acer Swift 3',
                'price_ron' => 3999.99,
                'purchase_price_ron' => 3200.00,
                'stock_quantity' => 20,
                'weight' => 1.2,
                'length' => 32.34,
                'width' => 22.6,
                'height' => 1.59,
                'main_image_url' => 'https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?q=80&w=1296&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i5',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-ULTR-002',
                'ean' => '1234567890187',
                'model' => 'XPS 15',
                'name' => 'Dell XPS 15 9530 Intel i7',
                'description' => 'Laptop premium 15.6" cu procesor Intel Core i7-13700H, placa video RTX 4050 si ecran OLED 3.5K.',
                'short_description' => 'Dell XPS 15 premium cu RTX 4050',
                'price_ron' => 11999.99,
                'purchase_price_ron' => 9500.00,
                'stock_quantity' => 8,
                'weight' => 1.92,
                'length' => 34.44,
                'width' => 23.02,
                'height' => 1.83,
                'main_image_url' => 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '32GB',
                'display_diagonal' => '15.6"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-ULTR-003',
                'ean' => '1234567890188',
                'model' => 'Zenbook 14',
                'name' => 'ASUS Zenbook 14 OLED Intel i7',
                'description' => 'Laptop ultraportabil 14" cu ecran OLED 2.8K, procesor Intel Core i7-1360P si design elegant.',
                'short_description' => 'Laptop ultraportabil ASUS Zenbook 14',
                'price_ron' => 6499.99,
                'purchase_price_ron' => 5200.00,
                'stock_quantity' => 15,
                'weight' => 1.39,
                'length' => 31.4,
                'width' => 22.1,
                'height' => 1.69,
                'main_image_url' => 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-ULTR-004',
                'ean' => '1234567890189',
                'model' => 'Spectre x360',
                'name' => 'HP Spectre x360 14 Intel i7',
                'description' => 'Laptop convertibil premium 14" cu ecran OLED touchscreen, procesor Intel Core i7 si design premium.',
                'short_description' => 'Laptop convertibil HP Spectre x360',
                'price_ron' => 8999.99,
                'purchase_price_ron' => 7200.00,
                'stock_quantity' => 9,
                'weight' => 1.39,
                'length' => 29.84,
                'width' => 22.09,
                'height' => 1.7,
                'main_image_url' => 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-WORK-001',
                'ean' => '1234567890190',
                'model' => 'ThinkPad P16',
                'name' => 'Lenovo ThinkPad P16 Gen 2',
                'description' => 'Laptop workstation 16" cu procesor Intel Core i9-13950HX, placa video RTX 5000 Ada si 64GB RAM.',
                'short_description' => 'Laptop workstation ThinkPad P16',
                'price_ron' => 22999.99,
                'purchase_price_ron' => 18500.00,
                'stock_quantity' => 4,
                'weight' => 3.0,
                'length' => 36.0,
                'width' => 26.5,
                'height' => 2.7,
                'main_image_url' => 'https://images.unsplash.com/photo-1499914485622-a88fac536970?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i9',
                'ram_capacity' => '64GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-WORK-002',
                'ean' => '1234567890191',
                'model' => 'Precision 7780',
                'name' => 'Dell Precision 7780 Workstation',
                'description' => 'Laptop workstation 17" cu procesor Intel Core i9-13950HX, RTX 5000 Ada si ecran 4K UHD.',
                'short_description' => 'Laptop workstation Dell Precision 7780',
                'price_ron' => 24999.99,
                'purchase_price_ron' => 20000.00,
                'stock_quantity' => 3,
                'weight' => 3.2,
                'length' => 38.9,
                'width' => 26.3,
                'height' => 2.89,
                'main_image_url' => 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1120&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i9',
                'ram_capacity' => '64GB',
                'display_diagonal' => '17"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-WORK-003',
                'ean' => '1234567890192',
                'model' => 'MacBook Pro 16',
                'name' => 'Apple MacBook Pro 16" M3 Max',
                'description' => 'Laptop profesional Apple cu chip M3 Max, ecran Liquid Retina XDR 16.2" si performanta exceptionala.',
                'short_description' => 'MacBook Pro 16" cu chip M3 Max',
                'price_ron' => 18999.99,
                'purchase_price_ron' => 15500.00,
                'stock_quantity' => 6,
                'weight' => 2.14,
                'length' => 35.57,
                'width' => 24.81,
                'height' => 1.68,
                'main_image_url' => 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'macOS',
                'processor_type' => 'Apple M3 Max',
                'ram_capacity' => '64GB',
                'display_diagonal' => '16.2"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-MID-001',
                'ean' => '1234567890193',
                'model' => 'IdeaPad 5',
                'name' => 'Lenovo IdeaPad 5 Pro 16" AMD',
                'description' => 'Laptop versatil 16" cu procesor AMD Ryzen 7 7735HS, placa video RTX 3050 si ecran QHD 120Hz.',
                'short_description' => 'Laptop versatil Lenovo IdeaPad 5 Pro',
                'price_ron' => 5499.99,
                'purchase_price_ron' => 4400.00,
                'stock_quantity' => 16,
                'weight' => 2.0,
                'length' => 35.6,
                'width' => 25.1,
                'height' => 1.85,
                'main_image_url' => 'https://plus.unsplash.com/premium_photo-1681302547899-9339f12aca53?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '16"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-MID-002',
                'ean' => '1234567890194',
                'model' => 'Vivobook Pro 15',
                'name' => 'ASUS VivoBook Pro 15 OLED RTX 3050',
                'description' => 'Laptop creative 15.6" cu ecran OLED, procesor AMD Ryzen 7 5800HX si placa video RTX 3050.',
                'short_description' => 'Laptop creative ASUS VivoBook Pro 15',
                'price_ron' => 5999.99,
                'purchase_price_ron' => 4800.00,
                'stock_quantity' => 14,
                'weight' => 1.8,
                'length' => 35.98,
                'width' => 23.47,
                'height' => 1.99,
                'main_image_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'AMD Ryzen 7',
                'ram_capacity' => '16GB',
                'display_diagonal' => '15.6"',
                'status' => true,
            ],
            [
                'sku' => 'LAP-MID-003',
                'ean' => '1234567890195',
                'model' => 'Pavilion Plus',
                'name' => 'HP Pavilion Plus 14 Intel i5',
                'description' => 'Laptop versatile 14" cu ecran OLED 2.8K, procesor Intel Core i5-1340P si design modern.',
                'short_description' => 'Laptop versatile HP Pavilion Plus',
                'price_ron' => 4999.99,
                'purchase_price_ron' => 4000.00,
                'stock_quantity' => 17,
                'weight' => 1.4,
                'length' => 31.4,
                'width' => 22.4,
                'height' => 1.79,
                'main_image_url' => 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                'operating_system' => 'Windows 11',
                'processor_type' => 'Intel Core i5',
                'ram_capacity' => '16GB',
                'display_diagonal' => '14"',
                'status' => true,
            ],
            // Smartphones
            [
                'sku' => 'PHONE-001',
                'ean' => '1234567890124',
                'model' => 'iPhone 15 Pro',
                'name' => 'iPhone 15 Pro 256GB',
                'description' => 'Cel mai recent iPhone cu procesor A17 Pro, camera profesionala si design din titan.',
                'short_description' => 'iPhone 15 Pro 256GB',
                'price_ron' => 5999.99,
                'purchase_price_ron' => 4800.00,
                'stock_quantity' => 25,
                'weight' => 0.187,
                'length' => 15.9,
                'width' => 7.6,
                'height' => 0.83,
                'main_image_url' => 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'PHONE-002',
                'ean' => '1234567890125',
                'model' => 'Samsung Galaxy S24',
                'name' => 'Samsung Galaxy S24 Ultra 512GB',
                'description' => 'Smartphone flagship cu S Pen, camera de 200MP si ecran Dynamic AMOLED 2X.',
                'short_description' => 'Galaxy S24 Ultra cu S Pen',
                'price_ron' => 5499.99,
                'purchase_price_ron' => 4400.00,
                'stock_quantity' => 20,
                'weight' => 0.233,
                'length' => 16.2,
                'width' => 7.9,
                'height' => 0.88,
                'main_image_url' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'PHONE-003',
                'ean' => '1234567890132',
                'model' => 'Pixel 8 Pro',
                'name' => 'Google Pixel 8 Pro 256GB',
                'description' => 'Smartphone Google cu camera AI, procesor Tensor G3 si Android pur.',
                'short_description' => 'Google Pixel 8 Pro cu AI',
                'price_ron' => 4999.99,
                'purchase_price_ron' => 4000.00,
                'stock_quantity' => 18,
                'weight' => 0.213,
                'length' => 16.25,
                'width' => 7.65,
                'height' => 0.88,
                'main_image_url' => 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'PHONE-004',
                'ean' => '1234567890133',
                'model' => 'OnePlus 12',
                'name' => 'OnePlus 12 256GB',
                'description' => 'Smartphone flagship cu Snapdragon 8 Gen 3, camera Hasselblad si incarcare rapida 100W.',
                'short_description' => 'OnePlus 12 cu Snapdragon 8 Gen 3',
                'price_ron' => 4499.99,
                'purchase_price_ron' => 3600.00,
                'stock_quantity' => 15,
                'weight' => 0.220,
                'length' => 16.43,
                'width' => 7.56,
                'height' => 0.92,
                'main_image_url' => 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'PHONE-005',
                'ean' => '1234567890134',
                'model' => 'Xiaomi 14',
                'name' => 'Xiaomi 14 Pro 512GB',
                'description' => 'Smartphone premium cu Snapdragon 8 Gen 3, camera Leica si ecran LTPO AMOLED.',
                'short_description' => 'Xiaomi 14 Pro cu Leica',
                'price_ron' => 3999.99,
                'purchase_price_ron' => 3200.00,
                'stock_quantity' => 22,
                'weight' => 0.209,
                'length' => 16.1,
                'width' => 7.5,
                'height' => 0.85,
                'main_image_url' => 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Tablets
            [
                'sku' => 'TAB-001',
                'ean' => '1234567890135',
                'model' => 'iPad Pro 12.9',
                'name' => 'Apple iPad Pro 12.9" M2 256GB',
                'description' => 'Tableta profesionala cu chip M2, ecran Liquid Retina XDR si suport pentru Apple Pencil.',
                'short_description' => 'iPad Pro 12.9" cu chip M2',
                'price_ron' => 6999.99,
                'purchase_price_ron' => 5600.00,
                'stock_quantity' => 14,
                'weight' => 0.682,
                'length' => 28.06,
                'width' => 21.5,
                'height' => 0.64,
                'main_image_url' => 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'TAB-002',
                'ean' => '1234567890136',
                'model' => 'Galaxy Tab S9',
                'name' => 'Samsung Galaxy Tab S9 Ultra 256GB',
                'description' => 'Tableta Android premium cu ecran AMOLED 14.6", procesor Snapdragon 8 Gen 2 si S Pen inclus.',
                'short_description' => 'Galaxy Tab S9 Ultra cu S Pen',
                'price_ron' => 5999.99,
                'purchase_price_ron' => 4800.00,
                'stock_quantity' => 11,
                'weight' => 0.732,
                'length' => 32.64,
                'width' => 20.88,
                'height' => 0.55,
                'main_image_url' => 'https://images.unsplash.com/photo-1561154464-82e9adf32750?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Headphones
            [
                'sku' => 'HEAD-001',
                'ean' => '1234567890137',
                'model' => 'AirPods Pro 2',
                'name' => 'Apple AirPods Pro 2',
                'description' => 'Casti wireless cu cancelare activa a zgomotului, audio spatial si rezistenta la apa.',
                'short_description' => 'AirPods Pro 2 cu ANC',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 950.00,
                'stock_quantity' => 50,
                'weight' => 0.056,
                'length' => 6.0,
                'width' => 2.4,
                'height' => 2.4,
                'main_image_url' => 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'HEAD-002',
                'ean' => '1234567890138',
                'model' => 'Sony WH-1000XM5',
                'name' => 'Sony WH-1000XM5 Wireless',
                'description' => 'Casti over-ear cu cancelare activa a zgomotului, baterie 30h si calitate audio Hi-Res.',
                'short_description' => 'Sony WH-1000XM5 cu ANC',
                'price_ron' => 1999.99,
                'purchase_price_ron' => 1500.00,
                'stock_quantity' => 30,
                'weight' => 0.250,
                'length' => 20.0,
                'width' => 18.0,
                'height' => 8.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Smartwatches
            [
                'sku' => 'WATCH-001',
                'ean' => '1234567890139',
                'model' => 'Apple Watch Ultra 2',
                'name' => 'Apple Watch Ultra 2 GPS',
                'description' => 'Smartwatch premium pentru sport cu ecran Always-On, GPS precis si rezistenta extrema.',
                'short_description' => 'Apple Watch Ultra 2 pentru sport',
                'price_ron' => 4499.99,
                'purchase_price_ron' => 3600.00,
                'stock_quantity' => 20,
                'weight' => 0.061,
                'length' => 4.9,
                'width' => 4.9,
                'height' => 1.4,
                'main_image_url' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'WATCH-002',
                'ean' => '1234567890140',
                'model' => 'Galaxy Watch 6',
                'name' => 'Samsung Galaxy Watch 6 Classic 47mm',
                'description' => 'Smartwatch Android cu ecran rotativ, monitorizare sanatate avansata si baterie de lunga durata.',
                'short_description' => 'Galaxy Watch 6 Classic',
                'price_ron' => 1999.99,
                'purchase_price_ron' => 1500.00,
                'stock_quantity' => 25,
                'weight' => 0.059,
                'length' => 4.7,
                'width' => 4.7,
                'height' => 1.3,
                'main_image_url' => 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Cameras
            [
                'sku' => 'CAM-001',
                'ean' => '1234567890141',
                'model' => 'Canon EOS R6',
                'name' => 'Canon EOS R6 Mark II Body',
                'description' => 'Camera mirrorless full-frame cu sensor 24MP, stabilizare 5-axa si filmare 4K 60fps.',
                'short_description' => 'Canon EOS R6 Mark II mirrorless',
                'price_ron' => 12999.99,
                'purchase_price_ron' => 10000.00,
                'stock_quantity' => 8,
                'weight' => 0.670,
                'length' => 13.8,
                'width' => 9.8,
                'height' => 8.4,
                'main_image_url' => 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'CAM-002',
                'ean' => '1234567890142',
                'model' => 'Sony A7 IV',
                'name' => 'Sony Alpha A7 IV Body',
                'description' => 'Camera mirrorless full-frame cu sensor 33MP, autofocus rapid si filmare 4K.',
                'short_description' => 'Sony Alpha A7 IV full-frame',
                'price_ron' => 11999.99,
                'purchase_price_ron' => 9500.00,
                'stock_quantity' => 10,
                'weight' => 0.658,
                'length' => 13.1,
                'width' => 9.6,
                'height' => 9.6,
                'main_image_url' => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Clothing - Men's T-shirts
            [
                'sku' => 'TSHIRT-001',
                'ean' => '1234567890127',
                'model' => 'Classic T-Shirt',
                'name' => 'Tricou Barbati Basic Alb',
                'description' => 'Tricou clasic din bumbac 100%, confortabil si versatil.',
                'short_description' => 'Tricou basic alb pentru barbati',
                'price_ron' => 49.99,
                'purchase_price_ron' => 20.00,
                'stock_quantity' => 100,
                'weight' => 0.2,
                'length' => 30.0,
                'width' => 25.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'TSHIRT-002',
                'ean' => '1234567890143',
                'model' => 'Premium T-Shirt',
                'name' => 'Tricou Barbati Premium Negru',
                'description' => 'Tricou premium din bumbac organic, design modern si confortabil.',
                'short_description' => 'Tricou premium negru pentru barbati',
                'price_ron' => 79.99,
                'purchase_price_ron' => 35.00,
                'stock_quantity' => 80,
                'weight' => 0.22,
                'length' => 31.0,
                'width' => 26.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'TSHIRT-003',
                'ean' => '1234567890144',
                'model' => 'Polo Shirt',
                'name' => 'Polo Barbati Albastru',
                'description' => 'Polo clasic cu guler, perfect pentru casual si business casual.',
                'short_description' => 'Polo albastru pentru barbati',
                'price_ron' => 129.99,
                'purchase_price_ron' => 55.00,
                'stock_quantity' => 60,
                'weight' => 0.25,
                'length' => 32.0,
                'width' => 27.0,
                'height' => 2.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Men's Jeans
            [
                'sku' => 'JEANS-001',
                'ean' => '1234567890145',
                'model' => 'Classic Jeans',
                'name' => 'Jeans Barbati Clasic Albastru',
                'description' => 'Jeans clasic din denim, fit regulat, confortabil si durabil.',
                'short_description' => 'Jeans clasic albastru pentru barbati',
                'price_ron' => 299.99,
                'purchase_price_ron' => 120.00,
                'stock_quantity' => 70,
                'weight' => 0.8,
                'length' => 110.0,
                'width' => 40.0,
                'height' => 3.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'JEANS-002',
                'ean' => '1234567890146',
                'model' => 'Slim Jeans',
                'name' => 'Jeans Barbati Slim Negru',
                'description' => 'Jeans fit slim, modern si elegant, perfect pentru stil casual.',
                'short_description' => 'Jeans slim negru pentru barbati',
                'price_ron' => 329.99,
                'purchase_price_ron' => 135.00,
                'stock_quantity' => 55,
                'weight' => 0.75,
                'length' => 108.0,
                'width' => 38.0,
                'height' => 3.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Women's Clothing
            [
                'sku' => 'DRESS-001',
                'ean' => '1234567890147',
                'model' => 'Summer Dress',
                'name' => 'Rochia Femei Vara Floral',
                'description' => 'Rochia eleganta cu print floral, perfecta pentru sezonul cald.',
                'short_description' => 'Rochia vara floral pentru femei',
                'price_ron' => 199.99,
                'purchase_price_ron' => 80.00,
                'stock_quantity' => 45,
                'weight' => 0.3,
                'length' => 95.0,
                'width' => 40.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'BLOUSE-001',
                'ean' => '1234567890148',
                'model' => 'Elegant Blouse',
                'name' => 'Bluza Femei Eleganta Alba',
                'description' => 'Bluza eleganta din material premium, perfecta pentru birou sau evenimente.',
                'short_description' => 'Bluza eleganta alba pentru femei',
                'price_ron' => 179.99,
                'purchase_price_ron' => 75.00,
                'stock_quantity' => 50,
                'weight' => 0.25,
                'length' => 65.0,
                'width' => 45.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Furniture
            [
                'sku' => 'FURN-001',
                'ean' => '1234567890149',
                'model' => 'Office Chair',
                'name' => 'Scaun Birou Ergonom',
                'description' => 'Scaun birou ergonom cu suport lombar, reglabil in inaltime si brate.',
                'short_description' => 'Scaun birou ergonom',
                'price_ron' => 899.99,
                'purchase_price_ron' => 450.00,
                'stock_quantity' => 25,
                'weight' => 15.0,
                'length' => 65.0,
                'width' => 65.0,
                'height' => 120.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'FURN-002',
                'ean' => '1234567890150',
                'model' => 'Desk Table',
                'name' => 'Birou Modern 120cm',
                'description' => 'Birou modern din lemn masiv, cu sertare si design minimalist.',
                'short_description' => 'Birou modern 120cm',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 650.00,
                'stock_quantity' => 15,
                'weight' => 25.0,
                'length' => 120.0,
                'width' => 60.0,
                'height' => 75.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Kitchen
            [
                'sku' => 'KIT-001',
                'ean' => '1234567890151',
                'model' => 'Coffee Maker',
                'name' => 'Aparat Cafea Espresso Automat',
                'description' => 'Aparat de cafea espresso automat cu moara integrata si spuma de lapte.',
                'short_description' => 'Aparat cafea espresso automat',
                'price_ron' => 2499.99,
                'purchase_price_ron' => 1500.00,
                'stock_quantity' => 12,
                'weight' => 8.5,
                'length' => 35.0,
                'width' => 45.0,
                'height' => 50.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'KIT-002',
                'ean' => '1234567890152',
                'model' => 'Blender',
                'name' => 'Blender Puternic 1500W',
                'description' => 'Blender profesional cu motor 1500W, perfect pentru smoothie-uri si supe.',
                'short_description' => 'Blender puternic 1500W',
                'price_ron' => 599.99,
                'purchase_price_ron' => 300.00,
                'stock_quantity' => 30,
                'weight' => 3.2,
                'length' => 20.0,
                'width' => 20.0,
                'height' => 45.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Sports - Fitness
            [
                'sku' => 'FIT-001',
                'ean' => '1234567890153',
                'model' => 'Dumbbells Set',
                'name' => 'Set Gantere Ajustabile 2x20kg',
                'description' => 'Set gantere ajustabile, perfect pentru antrenament acasa.',
                'short_description' => 'Set gantere ajustabile 2x20kg',
                'price_ron' => 799.99,
                'purchase_price_ron' => 400.00,
                'stock_quantity' => 20,
                'weight' => 40.0,
                'length' => 50.0,
                'width' => 30.0,
                'height' => 15.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'FIT-002',
                'ean' => '1234567890154',
                'model' => 'Yoga Mat',
                'name' => 'Covoras Yoga Premium',
                'description' => 'Covoras yoga premium, antiderapant si confortabil, grosime 6mm.',
                'short_description' => 'Covoras yoga premium',
                'price_ron' => 149.99,
                'purchase_price_ron' => 60.00,
                'stock_quantity' => 40,
                'weight' => 1.5,
                'length' => 183.0,
                'width' => 61.0,
                'height' => 0.6,
                'main_image_url' => 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Running
            [
                'sku' => 'RUN-001',
                'ean' => '1234567890155',
                'model' => 'Running Shoes',
                'name' => 'Adidasi Alergare Nike Air Max',
                'description' => 'Adidasi de alergare cu tehnologie Air Max, confort si amortizare superioara.',
                'short_description' => 'Adidasi alergare Nike Air Max',
                'price_ron' => 699.99,
                'purchase_price_ron' => 350.00,
                'stock_quantity' => 35,
                'weight' => 0.8,
                'length' => 30.0,
                'width' => 12.0,
                'height' => 12.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-002',
                'ean' => '1234567890156',
                'model' => 'Adidas Ultraboost',
                'name' => 'Adidasi Alergare Adidas Ultraboost 23',
                'description' => 'Adidasi de alergare premium cu tehnologie Boost, perfect pentru alergari lungi si confort maxim.',
                'short_description' => 'Adidasi alergare Adidas Ultraboost 23',
                'price_ron' => 749.99,
                'purchase_price_ron' => 375.00,
                'stock_quantity' => 42,
                'weight' => 0.75,
                'length' => 31.0,
                'width' => 12.5,
                'height' => 12.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-003',
                'ean' => '1234567890157',
                'model' => 'Nike Pegasus',
                'name' => 'Adidasi Alergare Nike Air Pegasus 40',
                'description' => 'Adidasi versatili de alergare cu amortizare React si design aerodinamic.',
                'short_description' => 'Adidasi alergare Nike Pegasus 40',
                'price_ron' => 649.99,
                'purchase_price_ron' => 325.00,
                'stock_quantity' => 38,
                'weight' => 0.82,
                'length' => 30.5,
                'width' => 12.2,
                'height' => 12.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-004',
                'ean' => '1234567890158',
                'model' => 'Brooks Ghost',
                'name' => 'Adidasi Alergare Brooks Ghost 15',
                'description' => 'Adidasi neutri de alergare cu amortizare DNA Loft pentru confort premium la fiecare pas.',
                'short_description' => 'Adidasi alergare Brooks Ghost 15',
                'price_ron' => 679.99,
                'purchase_price_ron' => 340.00,
                'stock_quantity' => 33,
                'weight' => 0.78,
                'length' => 30.0,
                'width' => 12.0,
                'height' => 11.8,
                'main_image_url' => 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-005',
                'ean' => '1234567890159',
                'model' => 'Asics Gel Nimbus',
                'name' => 'Adidasi Alergare Asics Gel Nimbus 25',
                'description' => 'Adidasi premium cu tehnologie Gel pentru amortizare superioara si suport excelent.',
                'short_description' => 'Adidasi alergare Asics Gel Nimbus 25',
                'price_ron' => 799.99,
                'purchase_price_ron' => 400.00,
                'stock_quantity' => 28,
                'weight' => 0.85,
                'length' => 31.0,
                'width' => 12.8,
                'height' => 12.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-006',
                'ean' => '1234567890160',
                'model' => 'New Balance 1080',
                'name' => 'Adidasi Alergare New Balance Fresh Foam 1080',
                'description' => 'Adidasi cu talpa Fresh Foam X pentru amortizare si confort maxim in timpul alergarilor.',
                'short_description' => 'Adidasi alergare New Balance 1080',
                'price_ron' => 729.99,
                'purchase_price_ron' => 365.00,
                'stock_quantity' => 40,
                'weight' => 0.80,
                'length' => 30.5,
                'width' => 12.3,
                'height' => 12.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-007',
                'ean' => '1234567890161',
                'model' => 'Saucony Triumph',
                'name' => 'Adidasi Alergare Saucony Triumph 21',
                'description' => 'Adidasi cu amortizare PWRRUN+ pentru o experienta de alergare luxoasa si confortabila.',
                'short_description' => 'Adidasi alergare Saucony Triumph 21',
                'price_ron' => 689.99,
                'purchase_price_ron' => 345.00,
                'stock_quantity' => 35,
                'weight' => 0.83,
                'length' => 31.0,
                'width' => 12.5,
                'height' => 12.3,
                'main_image_url' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-008',
                'ean' => '1234567890162',
                'model' => 'Hoka Clifton',
                'name' => 'Adidasi Alergare Hoka One One Clifton 9',
                'description' => 'Adidasi usoare cu talpa ingrosata Meta-Rocker pentru o experienta de alergare placuta.',
                'short_description' => 'Adidasi alergare Hoka Clifton 9',
                'price_ron' => 759.99,
                'purchase_price_ron' => 380.00,
                'stock_quantity' => 32,
                'weight' => 0.72,
                'length' => 30.0,
                'width' => 12.0,
                'height' => 13.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-009',
                'ean' => '1234567890163',
                'model' => 'Mizuno Wave Rider',
                'name' => 'Adidasi Alergare Mizuno Wave Rider 27',
                'description' => 'Adidasi cu tehnologie Wave pentru stabilizare si amortizare excelenta la alergare.',
                'short_description' => 'Adidasi alergare Mizuno Wave Rider 27',
                'price_ron' => 669.99,
                'purchase_price_ron' => 335.00,
                'stock_quantity' => 37,
                'weight' => 0.79,
                'length' => 30.5,
                'width' => 12.2,
                'height' => 12.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-010',
                'ean' => '1234567890164',
                'model' => 'Under Armour Hovr',
                'name' => 'Adidasi Alergare Under Armour HOVR Sonic 6',
                'description' => 'Adidasi cu tehnologie HOVR pentru returnare de energie si conectivitate smart.',
                'short_description' => 'Adidasi alergare Under Armour HOVR Sonic 6',
                'price_ron' => 719.99,
                'purchase_price_ron' => 360.00,
                'stock_quantity' => 30,
                'weight' => 0.81,
                'length' => 30.8,
                'width' => 12.4,
                'height' => 12.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-011',
                'ean' => '1234567890165',
                'model' => 'Salomon Speedcross',
                'name' => 'Adidasi Alergare Trail Salomon Speedcross 6',
                'description' => 'Adidasi pentru alergare pe trasee cu aderenta excelenta si protectie la terenuri dificile.',
                'short_description' => 'Adidasi alergare trail Salomon Speedcross 6',
                'price_ron' => 779.99,
                'purchase_price_ron' => 390.00,
                'stock_quantity' => 25,
                'weight' => 0.88,
                'length' => 31.0,
                'width' => 13.0,
                'height' => 13.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-012',
                'ean' => '1234567890166',
                'model' => 'Reebok Floatride',
                'name' => 'Adidasi Alergare Reebok Floatride Energy 5',
                'description' => 'Adidasi usoare cu spuma Floatride pentru o experienta de alergare dinamica si confortabila.',
                'short_description' => 'Adidasi alergare Reebok Floatride Energy 5',
                'price_ron' => 649.99,
                'purchase_price_ron' => 325.00,
                'stock_quantity' => 36,
                'weight' => 0.74,
                'length' => 30.0,
                'width' => 12.0,
                'height' => 11.8,
                'main_image_url' => 'https://images.unsplash.com/photo-1605030753481-bb38b08c384a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-013',
                'ean' => '1234567890167',
                'model' => 'Puma Velocity',
                'name' => 'Adidasi Alergare Puma Velocity Nitro 2',
                'description' => 'Adidasi cu tehnologie Nitro pentru amortizare reactiva si viteza maxima.',
                'short_description' => 'Adidasi alergare Puma Velocity Nitro 2',
                'price_ron' => 699.99,
                'purchase_price_ron' => 350.00,
                'stock_quantity' => 34,
                'weight' => 0.76,
                'length' => 30.5,
                'width' => 12.2,
                'height' => 12.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-014',
                'ean' => '1234567890168',
                'model' => 'On Cloudrunner',
                'name' => 'Adidasi Alergare On Cloudrunner',
                'description' => 'Adidasi cu tehnologie CloudTec pentru o experienta de alergare unica si confortabila.',
                'short_description' => 'Adidasi alergare On Cloudrunner',
                'price_ron' => 849.99,
                'purchase_price_ron' => 425.00,
                'stock_quantity' => 22,
                'weight' => 0.77,
                'length' => 30.8,
                'width' => 12.3,
                'height' => 12.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-015',
                'ean' => '1234567890169',
                'model' => 'Nike Vomero',
                'name' => 'Adidasi Alergare Nike Air Zoom Vomero 17',
                'description' => 'Adidasi cu amortizare Zoom Air si React pentru confort si performanta la alergare.',
                'short_description' => 'Adidasi alergare Nike Vomero 17',
                'price_ron' => 759.99,
                'purchase_price_ron' => 380.00,
                'stock_quantity' => 31,
                'weight' => 0.84,
                'length' => 31.0,
                'width' => 12.5,
                'height' => 12.3,
                'main_image_url' => 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-016',
                'ean' => '1234567890170',
                'model' => 'Asics Kayano',
                'name' => 'Adidasi Alergare Asics Gel Kayano 30',
                'description' => 'Adidasi cu suport si stabilizare excelenta pentru alergatori cu pronatie sau picioare late.',
                'short_description' => 'Adidasi alergare Asics Gel Kayano 30',
                'price_ron' => 829.99,
                'purchase_price_ron' => 415.00,
                'stock_quantity' => 27,
                'weight' => 0.86,
                'length' => 31.2,
                'width' => 13.0,
                'height' => 12.8,
                'main_image_url' => 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-017',
                'ean' => '1234567890171',
                'model' => 'Brooks Glycerin',
                'name' => 'Adidasi Alergare Brooks Glycerin 21',
                'description' => 'Adidasi premium cu amortizare maxima DNA Loft v3 pentru confort maxim la alergare.',
                'short_description' => 'Adidasi alergare Brooks Glycerin 21',
                'price_ron' => 799.99,
                'purchase_price_ron' => 400.00,
                'stock_quantity' => 29,
                'weight' => 0.87,
                'length' => 31.0,
                'width' => 12.8,
                'height' => 12.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-018',
                'ean' => '1234567890172',
                'model' => 'New Balance 880',
                'name' => 'Adidasi Alergare New Balance 880v13',
                'description' => 'Adidasi versatili cu talpa Fresh Foam pentru o experienta de alergare confortabila si stabila.',
                'short_description' => 'Adidasi alergare New Balance 880v13',
                'price_ron' => 689.99,
                'purchase_price_ron' => 345.00,
                'stock_quantity' => 33,
                'weight' => 0.81,
                'length' => 30.5,
                'width' => 12.3,
                'height' => 12.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-019',
                'ean' => '1234567890173',
                'model' => 'Saucony Ride',
                'name' => 'Adidasi Alergare Saucony Ride 16',
                'description' => 'Adidasi cu talpa PWRRUN pentru o experienta de alergare echilibrata si confortabila.',
                'short_description' => 'Adidasi alergare Saucony Ride 16',
                'price_ron' => 659.99,
                'purchase_price_ron' => 330.00,
                'stock_quantity' => 38,
                'weight' => 0.78,
                'length' => 30.5,
                'width' => 12.2,
                'height' => 12.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1605030753481-bb38b08c384a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-020',
                'ean' => '1234567890174',
                'model' => 'Nike React Infinity',
                'name' => 'Adidasi Alergare Nike React Infinity Run 4',
                'description' => 'Adidasi cu tehnologie React pentru reducerea riscului de accidentari si confort la alergare.',
                'short_description' => 'Adidasi alergare Nike React Infinity Run 4',
                'price_ron' => 789.99,
                'purchase_price_ron' => 395.00,
                'stock_quantity' => 26,
                'weight' => 0.83,
                'length' => 31.0,
                'width' => 12.5,
                'height' => 12.4,
                'main_image_url' => 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'RUN-021',
                'ean' => '1234567890175',
                'model' => 'Adidas Solarboost',
                'name' => 'Adidasi Alergare Adidas Solarboost 23',
                'description' => 'Adidasi cu suport si stabilitate pentru alergari lungi, cu tehnologie Boost pentru energia continua.',
                'short_description' => 'Adidasi alergare Adidas Solarboost 23',
                'price_ron' => 769.99,
                'purchase_price_ron' => 385.00,
                'stock_quantity' => 28,
                'weight' => 0.85,
                'length' => 31.2,
                'width' => 12.6,
                'height' => 12.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Gaming Consoles
            [
                'sku' => 'CONS-001',
                'ean' => '1234567890156',
                'model' => 'PlayStation 5',
                'name' => 'Sony PlayStation 5 Console',
                'description' => 'Consola de jocuri next-gen cu SSD ultra-rapid si grafica 4K.',
                'short_description' => 'PlayStation 5 console',
                'price_ron' => 2999.99,
                'purchase_price_ron' => 2400.00,
                'stock_quantity' => 18,
                'weight' => 4.5,
                'length' => 39.0,
                'width' => 26.0,
                'height' => 10.4,
                'main_image_url' => 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'CONS-002',
                'ean' => '1234567890157',
                'model' => 'Xbox Series X',
                'name' => 'Microsoft Xbox Series X',
                'description' => 'Consola de jocuri de ultima generatie cu tehnologie Quick Resume.',
                'short_description' => 'Xbox Series X console',
                'price_ron' => 2799.99,
                'purchase_price_ron' => 2200.00,
                'stock_quantity' => 15,
                'weight' => 4.45,
                'length' => 30.1,
                'width' => 15.1,
                'height' => 15.1,
                'main_image_url' => 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Video Games
            [
                'sku' => 'GAME-001',
                'ean' => '1234567890158',
                'model' => 'Game PS5',
                'name' => 'God of War Ragnarök PS5',
                'description' => 'Joc de actiune-aventura epic pentru PlayStation 5.',
                'short_description' => 'God of War Ragnarök PS5',
                'price_ron' => 299.99,
                'purchase_price_ron' => 150.00,
                'stock_quantity' => 50,
                'weight' => 0.1,
                'length' => 17.0,
                'width' => 13.5,
                'height' => 1.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'GAME-002',
                'ean' => '1234567890159',
                'model' => 'Game Xbox',
                'name' => 'Forza Horizon 5 Xbox',
                'description' => 'Joc de curse open-world pentru Xbox Series X/S.',
                'short_description' => 'Forza Horizon 5 Xbox',
                'price_ron' => 279.99,
                'purchase_price_ron' => 140.00,
                'stock_quantity' => 45,
                'weight' => 0.1,
                'length' => 17.0,
                'width' => 13.5,
                'height' => 1.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Books - Fiction
            [
                'sku' => 'BOOK-001',
                'ean' => '1234567890160',
                'model' => 'Novel',
                'name' => 'Cartile lui Haruki Murakami - Set 5 volume',
                'description' => 'Set complet cu cele mai populare romane ale lui Haruki Murakami.',
                'short_description' => 'Set Murakami 5 volume',
                'price_ron' => 249.99,
                'purchase_price_ron' => 120.00,
                'stock_quantity' => 30,
                'weight' => 2.5,
                'length' => 20.0,
                'width' => 13.0,
                'height' => 15.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Books - Non-Fiction
            [
                'sku' => 'BOOK-002',
                'ean' => '1234567890161',
                'model' => 'Business Book',
                'name' => 'Atomic Habits - James Clear',
                'description' => 'Carte despre formarea de obiceiuri bune si eliminarea celor rele.',
                'short_description' => 'Atomic Habits - James Clear',
                'price_ron' => 59.99,
                'purchase_price_ron' => 30.00,
                'stock_quantity' => 60,
                'weight' => 0.4,
                'length' => 21.0,
                'width' => 14.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            // Products with low stock (< 4)
            [
                'sku' => 'LOW-STOCK-001',
                'ean' => '1234567890200',
                'model' => 'Gaming Mouse Pro',
                'name' => 'Mouse Gaming Razer DeathAdder V3',
                'description' => 'Mouse gaming profesional cu senzor Focus Pro 30K si design ergonomic.',
                'short_description' => 'Mouse gaming Razer DeathAdder V3',
                'price_ron' => 399.99,
                'purchase_price_ron' => 250.00,
                'stock_quantity' => 1,
                'weight' => 0.063,
                'length' => 12.7,
                'width' => 6.8,
                'height' => 4.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-002',
                'ean' => '1234567890201',
                'model' => 'Mechanical Keyboard',
                'name' => 'Tastatura Mecanica Logitech G915',
                'description' => 'Tastatura mecanica wireless cu switch-uri GL cu iluminare RGB.',
                'short_description' => 'Tastatura mecanica Logitech G915',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 900.00,
                'stock_quantity' => 2,
                'weight' => 0.810,
                'length' => 47.5,
                'width' => 15.0,
                'height' => 2.2,
                'main_image_url' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-003',
                'ean' => '1234567890202',
                'model' => 'Monitor 4K',
                'name' => 'Monitor LG UltraGear 27" 4K 144Hz',
                'description' => 'Monitor gaming 4K cu refresh rate 144Hz si HDR10, perfect pentru gaming si productie.',
                'short_description' => 'Monitor LG UltraGear 27" 4K',
                'price_ron' => 2999.99,
                'purchase_price_ron' => 2200.00,
                'stock_quantity' => 3,
                'weight' => 5.8,
                'length' => 61.4,
                'width' => 27.0,
                'height' => 4.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-004',
                'ean' => '1234567890203',
                'model' => 'SSD NVMe',
                'name' => 'SSD Samsung 990 PRO 2TB NVMe',
                'description' => 'SSD NVMe PCIe 4.0 cu viteza de citire pana la 7450 MB/s si scriere 6900 MB/s.',
                'short_description' => 'SSD Samsung 990 PRO 2TB',
                'price_ron' => 899.99,
                'purchase_price_ron' => 650.00,
                'stock_quantity' => 1,
                'weight' => 0.009,
                'length' => 8.0,
                'width' => 2.2,
                'height' => 0.15,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-005',
                'ean' => '1234567890204',
                'model' => 'Webcam 4K',
                'name' => 'Webcam Logitech Brio 4K',
                'description' => 'Webcam 4K cu HDR si microfon stereo, perfect pentru streaming si video conferinte.',
                'short_description' => 'Webcam Logitech Brio 4K',
                'price_ron' => 799.99,
                'purchase_price_ron' => 550.00,
                'stock_quantity' => 2,
                'weight' => 0.720,
                'length' => 10.4,
                'width' => 2.9,
                'height' => 2.9,
                'main_image_url' => 'https://images.unsplash.com/photo-1587825147138-346b0064a98b?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-006',
                'ean' => '1234567890205',
                'model' => 'Graphics Card',
                'name' => 'Placa Video NVIDIA RTX 4090',
                'description' => 'Placa video top of the line cu 24GB GDDR6X si tehnologie DLSS 3.0.',
                'short_description' => 'Placa video NVIDIA RTX 4090',
                'price_ron' => 8999.99,
                'purchase_price_ron' => 7500.00,
                'stock_quantity' => 1,
                'weight' => 2.2,
                'length' => 30.4,
                'width' => 13.7,
                'height' => 6.1,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-007',
                'ean' => '1234567890206',
                'model' => 'RAM Kit',
                'name' => 'Memorie RAM Corsair Vengeance 32GB DDR5',
                'description' => 'Kit memorie RAM DDR5 32GB (2x16GB) cu frecventa 6000MHz si RGB.',
                'short_description' => 'RAM Corsair Vengeance 32GB DDR5',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 950.00,
                'stock_quantity' => 3,
                'weight' => 0.150,
                'length' => 13.3,
                'width' => 0.5,
                'height' => 5.1,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-008',
                'ean' => '1234567890207',
                'model' => 'Power Supply',
                'name' => 'Sursa Corsair RM1000x 1000W 80+ Gold',
                'description' => 'Sursa modulara 1000W cu certificare 80+ Gold si ventilatoare silentioase.',
                'short_description' => 'Sursa Corsair RM1000x 1000W',
                'price_ron' => 899.99,
                'purchase_price_ron' => 650.00,
                'stock_quantity' => 2,
                'weight' => 1.8,
                'length' => 16.0,
                'width' => 15.0,
                'height' => 8.6,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-009',
                'ean' => '1234567890208',
                'model' => 'Motherboard',
                'name' => 'Placa de Baza ASUS ROG Strix X670E',
                'description' => 'Placa de baza AMD AM5 cu suport DDR5, PCIe 5.0 si WiFi 6E.',
                'short_description' => 'Placa de baza ASUS ROG Strix X670E',
                'price_ron' => 2499.99,
                'purchase_price_ron' => 1800.00,
                'stock_quantity' => 1,
                'weight' => 1.2,
                'length' => 30.5,
                'width' => 24.4,
                'height' => 0.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-010',
                'ean' => '1234567890209',
                'model' => 'CPU Cooler',
                'name' => 'Cooler CPU Noctua NH-D15',
                'description' => 'Cooler CPU air cooling premium cu doua ventilatoare si performanta exceptionala.',
                'short_description' => 'Cooler CPU Noctua NH-D15',
                'price_ron' => 599.99,
                'purchase_price_ron' => 420.00,
                'stock_quantity' => 3,
                'weight' => 1.32,
                'length' => 16.5,
                'width' => 15.0,
                'height' => 16.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-011',
                'ean' => '1234567890210',
                'model' => 'External HDD',
                'name' => 'Hard Disk Extern Seagate 8TB',
                'description' => 'Hard disk extern USB 3.0 cu capacitate 8TB, perfect pentru backup si stocare.',
                'short_description' => 'Hard disk extern Seagate 8TB',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 900.00,
                'stock_quantity' => 2,
                'weight' => 0.680,
                'length' => 11.7,
                'width' => 8.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-012',
                'ean' => '1234567890211',
                'model' => 'USB Hub',
                'name' => 'Hub USB-C Anker 7-in-1',
                'description' => 'Hub USB-C cu 7 porturi: HDMI 4K, USB 3.0, card reader si incarcare rapida.',
                'short_description' => 'Hub USB-C Anker 7-in-1',
                'price_ron' => 299.99,
                'purchase_price_ron' => 180.00,
                'stock_quantity' => 1,
                'weight' => 0.150,
                'length' => 12.0,
                'width' => 4.5,
                'height' => 1.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1587825147138-346b0064a98b?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-013',
                'ean' => '1234567890212',
                'model' => 'Microphone',
                'name' => 'Microfon Blue Yeti X',
                'description' => 'Microfon USB profesional cu 4 moduri de captare si iluminare RGB.',
                'short_description' => 'Microfon Blue Yeti X',
                'price_ron' => 1299.99,
                'purchase_price_ron' => 900.00,
                'stock_quantity' => 2,
                'weight' => 1.2,
                'length' => 12.0,
                'width' => 12.0,
                'height' => 30.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-014',
                'ean' => '1234567890213',
                'model' => 'Streaming Deck',
                'name' => 'Elgato Stream Deck MK.2',
                'description' => 'Panou de control cu 15 butoane programabile LCD pentru streaming si productie.',
                'short_description' => 'Elgato Stream Deck MK.2',
                'price_ron' => 899.99,
                'purchase_price_ron' => 650.00,
                'stock_quantity' => 1,
                'weight' => 0.220,
                'length' => 10.0,
                'width' => 8.0,
                'height' => 2.0,
                'main_image_url' => 'https://images.unsplash.com/photo-1587825147138-346b0064a98b?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],
            [
                'sku' => 'LOW-STOCK-015',
                'ean' => '1234567890214',
                'model' => 'Capture Card',
                'name' => 'Elgato Game Capture 4K60 Pro',
                'description' => 'Placa de captura 4K60 pentru streaming si inregistrare de jocuri in calitate 4K.',
                'short_description' => 'Elgato Game Capture 4K60 Pro',
                'price_ron' => 1999.99,
                'purchase_price_ron' => 1500.00,
                'stock_quantity' => 3,
                'weight' => 0.150,
                'length' => 16.7,
                'width' => 12.0,
                'height' => 1.5,
                'main_image_url' => 'https://images.unsplash.com/photo-1587825147138-346b0064a98b?w=800&h=800&fit=crop&q=80',
                'status' => true,
            ],

        ];

        return $products;
    }

    /**
     * Assign families to all simple products (excluding configurable products).
     * Uses the same logic as ProductFamiliesSeeder but only for simple products.
     */
    private function assignFamiliesToSimpleProducts(): void
    {
        $this->command->info('Assigning families to simple products...');

        // Get product families
        $families = ProductFamily::all()->keyBy('code');

        if ($families->isEmpty()) {
            $this->command->warn('⚠️  No product families found. Please run ProductFamiliesSeeder first.');
            return;
        }

        // Step 1: Associate by SKU patterns (only for simple products, not configurable)
        $this->assignBySkuPatterns($families);

        // Step 2: Associate by attributes (only for simple products)
        $this->assignByAttributes($families);

        // Step 3: Associate by categories (only for simple products)
        $this->assignByCategories($families);

        // Step 4: Associate by product name keywords (fallback for products without categories)
        $this->assignByProductName($families);

        // Count remaining simple products without family
        $remainingCount = Product::where('type', ProductType::SIMPLE->value)
            ->whereNull('family_id')
            ->whereNull('parent_id') // Only main products, not variants
            ->count();

        if ($remainingCount > 0) {
            $this->command->warn("  ⚠️  {$remainingCount} simple products remain without a family assigned");
        }
    }

    /**
     * Assign families by SKU patterns (only for simple products).
     */
    private function assignBySkuPatterns($families): void
    {
        // Electronics products (laptops, smartphones, tablets, etc.)
        $electronicsPatterns = ['LAP-', 'PHONE-', 'TAB-', 'SMART-', 'CAM-', 'TV-', 'MON-', 'HEAD-', 'CONSOLE-'];

        foreach ($electronicsPatterns as $pattern) {
            if (!isset($families['electronics'])) {
                continue;
            }

            $updatedCount = Product::where('sku', 'LIKE', $pattern . '%')
                ->where('type', ProductType::SIMPLE->value) // Only simple products
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->update(['family_id' => $families['electronics']->id]);

            if ($updatedCount > 0) {
                $this->command->info("  ✓ Associated {$updatedCount} products with pattern '{$pattern}' to 'Electronice'");
            }
        }
    }

    /**
     * Assign families by attributes (only for simple products).
     */
    private function assignByAttributes($families): void
    {
        // Electronics: products with laptop/tech attributes
        $laptopAttributes = Attribute::whereIn('code', ['operating_system', 'processor_type', 'ram_capacity', 'display_diagonal'])->pluck('id');
        if ($laptopAttributes->isNotEmpty() && isset($families['electronics'])) {
            $productsWithLaptopAttrsIds = Product::whereHas('attributeValues', function ($query) use ($laptopAttributes) {
                $query->whereIn('attribute_id', $laptopAttributes);
            })
                ->where('type', ProductType::SIMPLE->value) // Only simple products
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->pluck('id');

            if ($productsWithLaptopAttrsIds->isNotEmpty()) {
                Product::whereIn('id', $productsWithLaptopAttrsIds)->update(['family_id' => $families['electronics']->id]);
                $this->command->info("  ✓ Associated {$productsWithLaptopAttrsIds->count()} products with tech attributes to 'Electronice'");
            }
        }

        // Fashion: products with size attribute (and no tech attributes)
        $sizeAttribute = Attribute::where('code', 'size')->first();
        if ($sizeAttribute && isset($families['fashion'])) {
            $productsWithSizeIds = Product::whereHas('attributeValues', function ($query) use ($sizeAttribute) {
                $query->where('attribute_id', $sizeAttribute->id);
            })
                ->whereDoesntHave('attributeValues', function ($query) use ($laptopAttributes) {
                    if ($laptopAttributes->isNotEmpty()) {
                        $query->whereIn('attribute_id', $laptopAttributes);
                    }
                })
                ->where('type', ProductType::SIMPLE->value) // Only simple products
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->pluck('id');

            if ($productsWithSizeIds->isNotEmpty()) {
                Product::whereIn('id', $productsWithSizeIds)->update(['family_id' => $families['fashion']->id]);
                $this->command->info("  ✓ Associated {$productsWithSizeIds->count()} products with size attribute to 'Fashion'");
            }
        }
    }

    /**
     * Assign families by categories (only for simple products).
     */
    private function assignByCategories($families): void
    {
        // Map category name patterns to families
        $categoryMappings = [
            'electronics' => [
                'keywords' => ['electronice', 'telefoane', 'laptop', 'tablete', 'smartphone', 'telefon', 'tablet', 'computer', 'notebook', 'camera', 'foto', 'casti', 'headphone', 'tv', 'televizor', 'monitor', 'consola', 'console', 'gaming'],
                'family' => 'electronics',
            ],
            'fashion' => [
                'keywords' => ['fashion', 'haine', 'imbracaminte', 'tricou', 'pantaloni', 'pantalon', 'rochie', 'camasa', 'bluza', 'geaca', 'pantofi', 'incaltaminte', 'accesorii', 'genti', 'portofel', 'ceas', 'bijuterii', 'barbati', 'femei'],
                'family' => 'fashion',
            ],
            'furniture' => [
                'keywords' => ['mobila', 'furniture', 'scaun', 'mese', 'dulap', 'pat', 'canapea', 'comoda', 'birou', 'raft', 'servanta'],
                'family' => 'furniture',
            ],
            'toys' => [
                'keywords' => ['jucarii', 'toys', 'papusi', 'masini', 'lego', 'puzzle', 'board', 'jocuri', 'games'],
                'family' => 'toys',
            ],
            'sports' => [
                'keywords' => ['sport', 'sports', 'alergare', 'running', 'fitness', 'tenis', 'fotbal', 'baschet', 'volei', 'sneakers', 'adidasi'],
                'family' => 'sports',
            ],
            'home-garden' => [
                'keywords' => ['casa', 'gradina', 'home', 'garden', 'bucatarie', 'kitchen', 'bai', 'bath', 'decoratiuni', 'decorations', 'curte', 'yard'],
                'family' => 'home-garden',
            ],
        ];

        foreach ($categoryMappings as $mapping) {
            $familyCode = $mapping['family'];
            if (!isset($families[$familyCode])) {
                continue;
            }

            $keywords = $mapping['keywords'];
            $categoryIds = Category::where(function ($query) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $query->orWhere('name', 'LIKE', '%' . $keyword . '%')
                        ->orWhere('slug', 'LIKE', '%' . $keyword . '%');
                }
            })->pluck('id');

            if ($categoryIds->isNotEmpty()) {
                // Get simple products (not configurable) in these categories that don't have a family yet
                $productIds = Product::whereHas('categories', function ($query) use ($categoryIds) {
                    $query->whereIn('categories.id', $categoryIds);
                })
                    ->where('type', ProductType::SIMPLE->value) // Only simple products
                    ->whereNull('family_id')
                    ->whereNull('parent_id') // Only main products, not variants
                    ->pluck('id');

                if ($productIds->isNotEmpty()) {
                    Product::whereIn('id', $productIds)->update(['family_id' => $families[$familyCode]->id]);
                    $this->command->info("  ✓ Associated {$productIds->count()} products in categories to '" . $families[$familyCode]->name . "'");
                }
            }
        }
    }

    /**
     * Assign families by product name keywords (fallback for products without categories).
     */
    private function assignByProductName($families): void
    {
        // Only process simple products (not configurable) that still don't have a family and don't have categories
        $productsWithoutFamilyAndCategory = Product::where('type', ProductType::SIMPLE->value) // Only simple products
            ->whereNull('family_id')
            ->whereNull('parent_id') // Only main products, not variants
            ->whereDoesntHave('categories')
            ->get();

        if ($productsWithoutFamilyAndCategory->isEmpty()) {
            return;
        }

        // Map product name patterns to families
        $nameMappings = [
            'electronics' => [
                'keywords' => ['laptop', 'phone', 'smartphone', 'tablet', 'iphone', 'samsung', 'camera', 'casti', 'headphone', 'monitor', 'tv', 'televizor', 'consola', 'playstation', 'xbox', 'nintendo'],
                'family' => 'electronics',
            ],
            'fashion' => [
                'keywords' => ['tricou', 'pantaloni', 'pantalon', 'rochie', 'camasa', 'bluza', 'geaca', 'pantofi', 'adidasi', 'sneakers', 'genti', 'portofel', 'ceas', 'bijuterii'],
                'family' => 'fashion',
            ],
            'furniture' => [
                'keywords' => ['scaun', 'masa', 'mese', 'dulap', 'pat', 'canapea', 'comoda', 'birou', 'raft'],
                'family' => 'furniture',
            ],
            'toys' => [
                'keywords' => ['papusi', 'masini', 'lego', 'puzzle', 'board game', 'jocuri', 'jucarie'],
                'family' => 'toys',
            ],
            'sports' => [
                'keywords' => ['alergare', 'running', 'fitness', 'tenis', 'fotbal', 'baschet', 'volei'],
                'family' => 'sports',
            ],
            'home-garden' => [
                'keywords' => ['bucatarie', 'kitchen', 'bai', 'bath', 'decoratiuni', 'curte', 'gradina'],
                'family' => 'home-garden',
            ],
        ];

        $matchedCount = 0;
        foreach ($nameMappings as $mapping) {
            $familyCode = $mapping['family'];
            if (!isset($families[$familyCode])) {
                continue;
            }

            $keywords = $mapping['keywords'];
            $productIds = $productsWithoutFamilyAndCategory->filter(function ($product) use ($keywords) {
                $name = mb_strtolower($product->name ?? '');
                foreach ($keywords as $keyword) {
                    if (str_contains($name, mb_strtolower($keyword))) {
                        return true;
                    }
                }
                return false;
            })->pluck('id');

            if ($productIds->isNotEmpty()) {
                Product::whereIn('id', $productIds)->update(['family_id' => $families[$familyCode]->id]);
                $matchedCount += $productIds->count();
                $this->command->info("  ✓ Associated {$productIds->count()} products by name to '" . $families[$familyCode]->name . "'");
            }
        }

        if ($matchedCount === 0) {
            $this->command->info("    ℹ️  No products matched by name keywords");
        }
    }
}
