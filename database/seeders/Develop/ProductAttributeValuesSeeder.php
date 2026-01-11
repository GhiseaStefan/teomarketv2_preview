<?php

namespace Database\Seeders\Develop;

use Illuminate\Database\Seeder;
use App\Models\ProductFamily;
use App\Models\Attribute;
use App\Models\Product;
use App\Models\Category;
use App\Enums\ProductType;

/**
 * Product Attribute Values Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Associates products with product families and attributes.
 * This seeder uses various methods to determine the appropriate family for products:
 * 1. SKU patterns
 * 2. Product attributes
 * 3. Categories
 * 4. Product name keywords
 * 5. Configurable products by variants
 * 6. Inherit family from parent to variants
 * 
 * Note: ProductFamiliesSeeder, AttributesSeeder, AttributeFamilySeeder must be run first.
 * 
 * Run with: php artisan db:seed --class=Develop\\ProductAttributeValuesSeeder
 */
class ProductAttributeValuesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Associating products with families and attributes...');

        // Get all families
        $families = [
            'electronics' => ProductFamily::where('code', 'electronics')->first(),
            'fashion' => ProductFamily::where('code', 'fashion')->first(),
            'furniture' => ProductFamily::where('code', 'furniture')->first(),
            'toys' => ProductFamily::where('code', 'toys')->first(),
            'sports' => ProductFamily::where('code', 'sports')->first(),
            'home-garden' => ProductFamily::where('code', 'home-garden')->first(),
        ];

        // Check if families exist
        foreach ($families as $code => $family) {
            if (!$family) {
                $this->command->warn("  ⚠️  Family '{$code}' not found. Please run ProductFamiliesSeeder first.");
            }
        }

        // Associate products with families
        $this->associateProductsWithFamilies($families);

        $this->command->info('✓ Products associated with families successfully');
    }

    /**
     * Associate products with families based on SKU patterns, categories, attributes, and product names.
     */
    private function associateProductsWithFamilies(array $families): void
    {
        $this->command->info('  → Associating products with families...');

        // Step 1: Associate by SKU patterns
        $this->associateBySkuPatterns($families);

        // Step 2: Associate by attributes
        $this->associateByAttributes($families);

        // Step 3: Associate by categories
        $this->associateByCategories($families);

        // Step 4: Associate by product name keywords (fallback for products without categories)
        $this->associateByProductName($families);

        // Step 5: Associate configurable products by their variants' attributes
        // If a configurable product doesn't have a family, try to infer it from its variants' attributes
        $this->associateConfigurableProductsByVariants($families);

        // Step 6: Inherit family from parent products to variants
        // This must run AFTER all configurable products have their families set
        $this->inheritFamilyToVariants();

        // Count remaining products without family (SIMPLE and CONFIGURABLE only, not variants)
        $remainingCount = Product::whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
            ->whereNull('family_id')
            ->whereNull('parent_id')
            ->count();

        if ($remainingCount > 0) {
            $this->command->warn("  ⚠️  {$remainingCount} products (simple/configurable) remain without a family assigned");
        }

        // Count variants without family (their parent may not have family)
        $variantsWithoutFamilyCount = Product::where('type', ProductType::VARIANT->value)
            ->whereNull('family_id')
            ->count();

        if ($variantsWithoutFamilyCount > 0) {
            $this->command->warn("  ⚠️  {$variantsWithoutFamilyCount} variants remain without a family (their parent products may not have a family set)");
        }
    }

    /**
     * Associate products by SKU patterns.
     * Includes both SIMPLE and CONFIGURABLE products, but not variants.
     */
    private function associateBySkuPatterns(array $families): void
    {
        $this->command->info('    → Associating by SKU patterns...');

        // Electronics products (laptops, smartphones, tablets, etc.)
        $electronicsPatterns = ['LAP-', 'PHONE-', 'TAB-', 'SMART-', 'CAM-', 'TV-', 'MON-', 'HEAD-', 'CONSOLE-'];

        foreach ($electronicsPatterns as $pattern) {
            $productIds = Product::where('sku', 'LIKE', $pattern . '%')
                ->whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->pluck('id');
            if (isset($families['electronics']) && $productIds->isNotEmpty()) {
                Product::whereIn('id', $productIds)->update(['family_id' => $families['electronics']->id]);
                $this->command->info("      ✓ Associated {$productIds->count()} products with pattern '{$pattern}' to 'Electronice'");
            }
        }
    }

    /**
     * Associate products by attributes.
     */
    private function associateByAttributes(array $families): void
    {
        $this->command->info('    → Associating by attributes...');

        // Electronics: products with laptop/tech attributes
        $laptopAttributes = Attribute::whereIn('code', ['operating_system', 'processor_type', 'ram_capacity', 'display_diagonal'])->pluck('id');
        if ($laptopAttributes->isNotEmpty()) {
            $productsWithLaptopAttrsIds = Product::whereHas('attributeValues', function ($query) use ($laptopAttributes) {
                $query->whereIn('attribute_id', $laptopAttributes);
            })
                ->whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->pluck('id');

            if (isset($families['electronics']) && $productsWithLaptopAttrsIds->isNotEmpty()) {
                Product::whereIn('id', $productsWithLaptopAttrsIds)->update(['family_id' => $families['electronics']->id]);
                $this->command->info("      ✓ Associated {$productsWithLaptopAttrsIds->count()} products with tech attributes to 'Electronice'");
            }
        }

        // Fashion: products with size attribute (and no tech attributes)
        $sizeAttribute = Attribute::where('code', 'size')->first();
        if ($sizeAttribute && isset($families['fashion'])) {
            $productsWithSizeIds = Product::whereHas('attributeValues', function ($query) use ($sizeAttribute, $laptopAttributes) {
                $query->where('attribute_id', $sizeAttribute->id);
            })
                ->whereDoesntHave('attributeValues', function ($query) use ($laptopAttributes) {
                    if ($laptopAttributes->isNotEmpty()) {
                        $query->whereIn('attribute_id', $laptopAttributes);
                    }
                })
                ->whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
                ->whereNull('family_id')
                ->whereNull('parent_id') // Only main products, not variants
                ->pluck('id');

            if ($productsWithSizeIds->isNotEmpty()) {
                Product::whereIn('id', $productsWithSizeIds)->update(['family_id' => $families['fashion']->id]);
                $this->command->info("      ✓ Associated {$productsWithSizeIds->count()} products with size attribute to 'Fashion'");
            }
        }
    }

    /**
     * Associate products by categories.
     */
    private function associateByCategories(array $families): void
    {
        $this->command->info('    → Associating by categories...');

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
                // Get products in these categories that don't have a family yet (SIMPLE and CONFIGURABLE, not variants)
                $productIds = Product::whereHas('categories', function ($query) use ($categoryIds) {
                    $query->whereIn('categories.id', $categoryIds);
                })
                    ->whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
                    ->whereNull('family_id')
                    ->whereNull('parent_id') // Only main products, not variants
                    ->pluck('id');

                if ($productIds->isNotEmpty()) {
                    Product::whereIn('id', $productIds)->update(['family_id' => $families[$familyCode]->id]);
                    $this->command->info("      ✓ Associated {$productIds->count()} products in categories to '" . $families[$familyCode]->name . "'");
                }
            }
        }
    }

    /**
     * Associate products by product name keywords (fallback for products without categories).
     */
    private function associateByProductName(array $families): void
    {
        $this->command->info('    → Associating by product name keywords (fallback)...');

        // Only process products that still don't have a family and don't have categories
        // Include both SIMPLE and CONFIGURABLE products, but not variants
        $productsWithoutFamilyAndCategory = Product::whereIn('type', [ProductType::SIMPLE->value, ProductType::CONFIGURABLE->value])
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
                $this->command->info("      ✓ Associated {$productIds->count()} products by name to '" . $families[$familyCode]->name . "'");
            }
        }

        if ($matchedCount === 0) {
            $this->command->info("      ℹ️  No products matched by name keywords");
        }
    }

    /**
     * Associate configurable products by their variants' attributes.
     * If a configurable product doesn't have a family, try to infer it from its variants.
     */
    private function associateConfigurableProductsByVariants(array $families): void
    {
        $this->command->info('    → Associating configurable products by their variants...');

        // Get configurable products without family that have variants
        $configurablesWithoutFamily = Product::where('type', ProductType::CONFIGURABLE->value)
            ->whereNull('family_id')
            ->whereHas('children') // Has variants
            ->get();

        if ($configurablesWithoutFamily->isEmpty()) {
            return;
        }

        // Get attribute codes for family detection
        $sizeAttribute = Attribute::where('code', 'size')->first();
        $colorAttribute = Attribute::where('code', 'color')->first();
        $techAttributes = Attribute::whereIn('code', ['operating_system', 'processor_type', 'ram_capacity', 'display_diagonal'])->pluck('id');

        $updatedCount = 0;
        foreach ($configurablesWithoutFamily as $configurable) {
            // Check variants for attributes that indicate a family
            $variants = $configurable->children()->with(['attributeValues' => function ($query) {
                $query->with('attribute');
            }])->get();

            $hasSizeAttribute = false;
            $hasColorAttribute = false;
            $hasTechAttributes = false;

            foreach ($variants as $variant) {
                // Get attribute IDs directly from product_attribute_values
                $variantAttributeIds = \App\Models\ProductAttributeValue::where('product_id', $variant->id)
                    ->pluck('attribute_id')
                    ->toArray();

                // Check for size attribute
                if ($sizeAttribute && in_array($sizeAttribute->id, $variantAttributeIds)) {
                    $hasSizeAttribute = true;
                }

                // Check for color attribute
                if ($colorAttribute && in_array($colorAttribute->id, $variantAttributeIds)) {
                    $hasColorAttribute = true;
                }

                // Check for tech attributes
                foreach ($techAttributes as $techAttrId) {
                    if (in_array($techAttrId, $variantAttributeIds)) {
                        $hasTechAttributes = true;
                        break;
                    }
                }
            }

            // Determine family based on variant attributes
            $familyId = null;
            if ($hasTechAttributes && isset($families['electronics'])) {
                $familyId = $families['electronics']->id;
            } elseif (($hasSizeAttribute || $hasColorAttribute) && isset($families['fashion'])) {
                // If has size or color attributes (and no tech), it's likely Fashion
                $familyId = $families['fashion']->id;
            }

            if ($familyId) {
                Product::where('id', $configurable->id)->update(['family_id' => $familyId]);
                $updatedCount++;
                $familyName = collect($families)->firstWhere('id', $familyId)->name ?? 'Unknown';
                $this->command->info("      ✓ Associated configurable product '{$configurable->name}' (ID: {$configurable->id}) to '{$familyName}' based on variant attributes");
            }
        }

        if ($updatedCount === 0) {
            $this->command->info("      ℹ️  No configurable products could be associated by variant attributes");
        }
    }

    /**
     * Inherit family from parent products to variants.
     */
    private function inheritFamilyToVariants(): void
    {
        $this->command->info('    → Inheriting family from parent products to variants...');

        // Get all variants (products with parent_id) that don't have a family yet
        $variantsWithoutFamily = Product::whereNotNull('parent_id')
            ->whereNull('family_id')
            ->with('parent:id,family_id')
            ->get();

        $updatedCount = 0;
        $variantsWithParentsWithoutFamily = 0;

        foreach ($variantsWithoutFamily as $variant) {
            if ($variant->parent && $variant->parent->family_id) {
                // Variant's parent has a family, so inherit it
                Product::where('id', $variant->id)->update(['family_id' => $variant->parent->family_id]);
                $updatedCount++;
            } elseif ($variant->parent && !$variant->parent->family_id) {
                // Variant's parent exists but doesn't have a family
                $variantsWithParentsWithoutFamily++;
            }
        }

        if ($updatedCount > 0) {
            $this->command->info("      ✓ Inherited family to {$updatedCount} variants from their parent products");
        }

        if ($variantsWithParentsWithoutFamily > 0) {
            $this->command->warn("      ⚠️  {$variantsWithParentsWithoutFamily} variants cannot inherit family because their parent products don't have a family set");
        }

        if ($updatedCount === 0 && $variantsWithParentsWithoutFamily === 0) {
            $this->command->info("      ℹ️  No variants needed family inheritance");
        }
    }
}
