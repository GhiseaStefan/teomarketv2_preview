<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductFamily;
use App\Models\Attribute;

/**
 * Attribute Family Seeder
 * 
 * Static/Lookup Data - Production Data
 * 
 * Associates attributes with product families (many-to-many relationship).
 * This defines which attributes are available for each product family.
 * 
 * Note: ProductFamiliesSeeder and AttributesSeeder must be run first.
 * 
 * Run with: php artisan db:seed --class=AttributeFamilySeeder
 */
class AttributeFamilySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Associating attributes with product families...');

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

        // Electronics attributes with sort order
        // Order: Operating System, Processor Type, RAM, Display Diagonal, Color
        $electronicsAttributes = [
            'operating_system' => 1,
            'processor_type' => 2,
            'ram_capacity' => 3,
            'display_diagonal' => 4,
            'color' => 5, // Color can be used for electronics too (phone colors, laptop colors)
        ];

        $this->syncAttributesWithSortOrder($families['electronics'] ?? null, $electronicsAttributes, 'Electronice');

        // Fashion attributes with sort order
        // Order: Size, Color
        $fashionAttributes = [
            'size' => 1,
            'color' => 2,
        ];

        $this->syncAttributesWithSortOrder($families['fashion'] ?? null, $fashionAttributes, 'Fashion');

        // Furniture attributes with sort order
        $furnitureAttributes = [
            'color' => 1,
        ];

        $this->syncAttributesWithSortOrder($families['furniture'] ?? null, $furnitureAttributes, 'Mobila');

        // Toys attributes with sort order
        $toysAttributes = [
            'color' => 1,
        ];

        $this->syncAttributesWithSortOrder($families['toys'] ?? null, $toysAttributes, 'Jucarii');

        // Sports attributes with sort order
        // Order: Size, Color
        $sportsAttributes = [
            'size' => 1,
            'color' => 2,
        ];

        $this->syncAttributesWithSortOrder($families['sports'] ?? null, $sportsAttributes, 'Sport');

        // Home & Garden attributes with sort order
        $homeGardenAttributes = [
            'color' => 1,
        ];

        $this->syncAttributesWithSortOrder($families['home-garden'] ?? null, $homeGardenAttributes, 'Casa si Gradina');

        $this->command->info('✓ Attributes associated with product families successfully');
    }

    /**
     * Sync attributes with a family, including sort order.
     * 
     * @param ProductFamily|null $family
     * @param array $attributesMap Array of ['attribute_code' => sort_order, ...]
     * @param string $familyName For logging purposes
     */
    private function syncAttributesWithSortOrder($family, array $attributesMap, string $familyName): void
    {
        if (!$family) {
            return;
        }

        $syncData = [];
        foreach ($attributesMap as $attributeCode => $sortOrder) {
            $attribute = Attribute::where('code', $attributeCode)->first();
            if ($attribute) {
                $syncData[$attribute->id] = ['sort_order' => $sortOrder];
                $this->command->info("  ✓ Associated '{$attribute->name}' with '{$familyName}' (sort_order: {$sortOrder})");
            } else {
                $this->command->warn("  ⚠️  Attribute '{$attributeCode}' not found. Skipping.");
            }
        }

        if (!empty($syncData)) {
            $family->attributes()->sync($syncData);
        }
    }
}
