<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attribute;
use App\Models\AttributeValue;

/**
 * Attribute Values Seeder
 * 
 * Static/Lookup Data - Production Data
 * 
 * Seeds only the values for attributes (attributes must be created first via AttributesSeeder).
 * These are essential attribute values required for variant products.
 * 
 * Run with: php artisan db:seed --class=AttributeValuesSeeder
 */
class AttributeValuesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating attribute values...');

        // Get Size attribute (must exist)
        $sizeAttribute = Attribute::where('code', 'size')->first();
        if (!$sizeAttribute) {
            $this->command->error('  ✗ Size attribute not found. Please run AttributesSeeder first.');
            return;
        }

        // Get Color attribute (must exist)
        $colorAttribute = Attribute::where('code', 'color')->first();
        if (!$colorAttribute) {
            $this->command->error('  ✗ Color attribute not found. Please run AttributesSeeder first.');
            return;
        }

        // Create size values
        $sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        foreach ($sizes as $index => $size) {
            AttributeValue::firstOrCreate(
                [
                    'attribute_id' => $sizeAttribute->id,
                    'value' => $size,
                ],
                [
                    'sort_order' => $index + 1,
                ]
            );
        }
        $this->command->info("  ✓ Created {$sizeAttribute->name} values: " . implode(', ', $sizes));

        // Create color values
        $colors = [
            // --- Neutre ---
            ['name' => 'Negru', 'code' => '#000000'],
            ['name' => 'Alb', 'code' => '#FFFFFF'],
            ['name' => 'Gri', 'code' => '#808080'],
            ['name' => 'Antracit', 'code' => '#36454F'],
            ['name' => 'Bej', 'code' => '#F5F5DC'],
            ['name' => 'Cream', 'code' => '#FFFDD0'],
            ['name' => 'Maro', 'code' => '#A52A2A'],

            // --- Culori Primare & Secundare ---
            ['name' => 'Roșu', 'code' => '#FF0000'],
            ['name' => 'Albastru', 'code' => '#0000FF'],
            ['name' => 'Verde', 'code' => '#008000'],
            ['name' => 'Galben', 'code' => '#FFFF00'],
            ['name' => 'Portocaliu', 'code' => '#FFA500'],
            ['name' => 'Mov', 'code' => '#800080'],
            ['name' => 'Roz', 'code' => '#FFC0CB'],

            // --- Variații Populare ---
            ['name' => 'Bleumarin', 'code' => '#000080'],
            ['name' => 'Turcoaz', 'code' => '#40E0D0'],
            ['name' => 'Bordo', 'code' => '#800020'],
            ['name' => 'Kaki', 'code' => '#F0E68C'],
            ['name' => 'Fucsia', 'code' => '#FF00FF'],
            ['name' => 'Lila', 'code' => '#C8A2C8'],

            // --- Metalice ---
            ['name' => 'Auriu', 'code' => '#FFD700'],
            ['name' => 'Argintiu', 'code' => '#C0C0C0'],
            ['name' => 'Cupru', 'code' => '#B87333'],

            // --- Speciale ---
            ['name' => 'Multicolor', 'code' => 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)'],
            ['name' => 'Transparent', 'code' => 'transparent'],
        ];

        foreach ($colors as $index => $color) {
            AttributeValue::firstOrCreate(
                [
                    'attribute_id' => $colorAttribute->id,
                    'value' => $color['name'],
                ],
                [
                    'meta_value' => $color['code'],
                    'sort_order' => $index + 1,
                ]
            );
        }
        $this->command->info("  ✓ Created {$colorAttribute->name} values: " . count($colors) . ' colors');

        // Create laptop attribute values
        $this->seedLaptopAttributeValues();

        $this->command->info('✓ Attribute values seeded successfully');
    }

    /**
     * Seed laptop-specific attribute values.
     */
    private function seedLaptopAttributeValues(): void
    {
        // Get Operating System attribute (must exist)
        $osAttribute = Attribute::where('code', 'operating_system')->first();
        if (!$osAttribute) {
            $this->command->warn('  ⚠️  Operating System attribute not found. Skipping OS values.');
        } else {
            // Create operating system values
            $osValues = ['Windows 11', 'Windows 10', 'macOS', 'Linux', 'FreeDOS', 'Without OS'];
            foreach ($osValues as $index => $os) {
                AttributeValue::firstOrCreate(
                    [
                        'attribute_id' => $osAttribute->id,
                        'value' => $os,
                    ],
                    ['sort_order' => $index + 1]
                );
            }
            $this->command->info("  ✓ Created {$osAttribute->name} values: " . count($osValues) . ' OS versions');
        }

        // Get Processor Type attribute (must exist)
        $processorAttribute = Attribute::where('code', 'processor_type')->first();
        if (!$processorAttribute) {
            $this->command->warn('  ⚠️  Processor Type attribute not found. Skipping processor values.');
        } else {
            // Create processor type values (common ones)
            $processorTypes = [
                'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
                'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
                'Apple M1', 'Apple M2', 'Apple M3', 'Apple M3 Pro', 'Apple M3 Max',
                'Intel Core i3', 'AMD Ryzen 3',
            ];
            foreach ($processorTypes as $index => $processor) {
                AttributeValue::firstOrCreate(
                    [
                        'attribute_id' => $processorAttribute->id,
                        'value' => $processor,
                    ],
                    ['sort_order' => $index + 1]
                );
            }
            $this->command->info("  ✓ Created {$processorAttribute->name} values: " . count($processorTypes) . ' processor types');
        }

        // Get RAM Capacity attribute (must exist)
        $ramAttribute = Attribute::where('code', 'ram_capacity')->first();
        if (!$ramAttribute) {
            $this->command->warn('  ⚠️  RAM Capacity attribute not found. Skipping RAM values.');
        } else {
            // Create RAM capacity values
            $ramValues = ['8GB', '16GB', '32GB', '64GB', '128GB'];
            foreach ($ramValues as $index => $ram) {
                AttributeValue::firstOrCreate(
                    [
                        'attribute_id' => $ramAttribute->id,
                        'value' => $ram,
                    ],
                    ['sort_order' => $index + 1]
                );
            }
            $this->command->info("  ✓ Created {$ramAttribute->name} values: " . implode(', ', $ramValues));
        }

        // Get Display Diagonal attribute (must exist)
        $displayAttribute = Attribute::where('code', 'display_diagonal')->first();
        if (!$displayAttribute) {
            $this->command->warn('  ⚠️  Display Diagonal attribute not found. Skipping display values.');
        } else {
            // Create display diagonal values
            $displayValues = ['13"', '13.3"', '13.4"', '13.5"', '14"', '15"', '15.3"', '15.6"', '16"', '16.2"', '17"', '17.3"', '18"'];
            foreach ($displayValues as $index => $display) {
                AttributeValue::firstOrCreate(
                    [
                        'attribute_id' => $displayAttribute->id,
                        'value' => $display,
                    ],
                    ['sort_order' => $index + 1]
                );
            }
            $this->command->info("  ✓ Created {$displayAttribute->name} values: " . count($displayValues) . ' display sizes');
        }
    }
}
