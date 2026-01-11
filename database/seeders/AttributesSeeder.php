<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attribute;

/**
 * Attributes Seeder
 * 
 * Static/Lookup Data - Production Data
 * 
 * Seeds only the attributes (without values).
 * These are essential attributes required for variant products.
 * 
 * Run with: php artisan db:seed --class=AttributesSeeder
 */
class AttributesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating attributes...');

        // Create Size attribute
        $sizeAttribute = Attribute::firstOrCreate(
            ['code' => 'size'],
            [
                'name' => 'Mărime',
                'type' => 'select',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$sizeAttribute->name} ({$sizeAttribute->code})");

        // Create Color attribute
        $colorAttribute = Attribute::firstOrCreate(
            ['code' => 'color'],
            [
                'name' => 'Culoare',
                'type' => 'color_swatch',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$colorAttribute->name} ({$colorAttribute->code})");

        // Create Operating System attribute
        $osAttribute = Attribute::firstOrCreate(
            ['code' => 'operating_system'],
            [
                'name' => 'Sistem de operare',
                'type' => 'select',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$osAttribute->name} ({$osAttribute->code})");

        // Create Processor Type attribute
        $processorAttribute = Attribute::firstOrCreate(
            ['code' => 'processor_type'],
            [
                'name' => 'Tip procesor',
                'type' => 'select',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$processorAttribute->name} ({$processorAttribute->code})");

        // Create RAM Capacity attribute
        $ramAttribute = Attribute::firstOrCreate(
            ['code' => 'ram_capacity'],
            [
                'name' => 'Capacitate memorie RAM',
                'type' => 'select',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$ramAttribute->name} ({$ramAttribute->code})");

        // Create Display Diagonal attribute
        $displayAttribute = Attribute::firstOrCreate(
            ['code' => 'display_diagonal'],
            [
                'name' => 'Diagonala display',
                'type' => 'select',
                'is_filterable' => true,
            ]
        );
        $this->command->info("  ✓ Created attribute: {$displayAttribute->name} ({$displayAttribute->code})");

        $this->command->info('✓ Attributes seeded successfully');
    }
}
