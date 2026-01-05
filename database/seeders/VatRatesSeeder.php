<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\VatRate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * VAT Rates Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds VAT rates for different countries.
 * Depends on: CountriesSeeder
 * Uses updateOrCreate for idempotency.
 * 
 * Loads VAT rates from sales_tax_rates.json file for all countries in the database.
 */
class VatRatesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding VAT rates...');

        // Ensure JSON file exists, download if necessary
        $jsonPath = $this->ensureJsonFileExists();

        // Load tax rates from JSON file
        $taxRatesData = $this->loadJsonData($jsonPath);

        if ($taxRatesData === null) {
            return;
        }

        // Get all countries from database
        $countries = Country::all();

        if ($countries->isEmpty()) {
            $this->command->error('No countries found. Please run CountriesSeeder first.');
            return;
        }

        $seededCount = 0;
        $skippedCount = 0;

        foreach ($countries as $country) {
            $countryCode = $country->iso_code_2;

            // Check if country exists in JSON data
            if (!isset($taxRatesData[$countryCode])) {
                $this->command->warn("Country {$countryCode} ({$country->name}) not found in sales_tax_rates.json");
                $skippedCount++;
                continue;
            }

            $taxData = $taxRatesData[$countryCode];
            $taxType = $taxData['type'] ?? null;
            $taxRate = $taxData['rate'] ?? 0;

            // Skip if type is "none" or rate is 0
            if ($taxType === 'none' || $taxRate == 0) {
                $taxTypeDisplay = $taxType ?? 'unknown';
                $this->command->warn("Country {$countryCode} ({$country->name}) has no VAT rate (type: {$taxTypeDisplay})");
                $skippedCount++;
                continue;
            }

            // Convert rate from decimal (0.21) to percentage (21.00)
            $rate = $taxRate * 100;

            // Create description
            $description = 'Standard VAT ' . $country->name;

            // Create or update VAT rate
            VatRate::updateOrCreate(
                [
                    'country_id' => $country->id,
                    'rate' => round($rate, 2)
                ],
                [
                    'description' => $description,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $seededCount++;
        }

        $this->command->info("✓ VAT rates seeded successfully. Created/Updated: {$seededCount}, Skipped: {$skippedCount}");
    }

    /**
     * Ensure JSON file exists, download if necessary
     */
    private function ensureJsonFileExists(): string
    {
        $jsonPath = storage_path('app/sales_tax_rates.json');

        if (File::exists($jsonPath)) {
            $this->command->info("✓ Using existing JSON file: {$jsonPath}");
            return $jsonPath;
        }

        $this->command->info("📥 JSON file not found. Downloading from GitHub...");
        $this->downloadJsonFile($jsonPath);
        return $jsonPath;
    }

    /**
     * Download JSON file from GitHub
     */
    private function downloadJsonFile(string $path): void
    {
        $url = 'https://raw.githubusercontent.com/valeriansaliou/node-sales-tax/refs/heads/master/res/sales_tax_rates.json';

        try {
            $this->command->info("Downloading from: {$url}");

            $response = Http::timeout(300)->get($url);

            if (!$response->successful()) {
                throw new \Exception("Failed to download JSON file. HTTP Status: {$response->status()}");
            }

            File::ensureDirectoryExists(dirname($path));
            File::put($path, $response->body());

            $this->command->info("✓ JSON file downloaded successfully");
        } catch (\Exception $e) {
            $this->command->error("❌ Error downloading JSON file: " . $e->getMessage());
            $this->command->warn("\nPlease manually download the file from:");
            $this->command->warn("https://raw.githubusercontent.com/valeriansaliou/node-sales-tax/refs/heads/master/res/sales_tax_rates.json");
            $this->command->warn("And place it in: storage/app/sales_tax_rates.json");
            throw $e;
        }
    }

    /**
     * Load and validate JSON data
     */
    private function loadJsonData(string $jsonPath): ?array
    {
        $this->command->info("📖 Loading JSON data...");

        $json = File::get($jsonPath);
        $data = json_decode($json, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->command->error('Failed to parse sales_tax_rates.json: ' . json_last_error_msg());
            Log::channel('structured')->error('seeder.error', [
                'seeder' => 'VatRatesSeeder',
                'error_type' => 'json_parse_error',
                'error' => json_last_error_msg(),
                'path' => $jsonPath
            ]);
            return null;
        }

        if (!is_array($data)) {
            $this->command->error('Invalid JSON structure: expected array');
            Log::channel('structured')->error('seeder.error', [
                'seeder' => 'VatRatesSeeder',
                'error_type' => 'invalid_json_structure',
                'path' => $jsonPath
            ]);
            return null;
        }

        $this->command->info("✓ Loaded " . count($data) . " countries from JSON");
        return $data;
    }
}
