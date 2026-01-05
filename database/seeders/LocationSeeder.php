<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LocationSeeder extends Seeder
{
    /**
     * Chunk size for bulk inserts
     */
    private const CHUNK_SIZE = 1000;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Increase memory limit and execution time for large JSON processing
        ini_set('memory_limit', '512M');
        set_time_limit(600); // 10 minutes

        $this->command->info('🚀 Starting location data import...');
        $startTime = microtime(true);

        try {
            // Step 1: Ensure JSON file exists
            $jsonPath = $this->ensureJsonFileExists();

            // Step 2: Load and validate JSON data
            $data = $this->loadJsonData($jsonPath);

            // Step 3: Get countries from database
            $countries = $this->getCountriesFromDatabase();

            if (empty($countries)) {
                $this->command->warn('⚠️  No active countries found in database. Please seed countries first.');
                return;
            }

            $this->command->info("✓ Found " . count($countries) . " active countries in database");

            // Step 4: Import states and cities
            $this->importLocations($data, $countries);

            $executionTime = round(microtime(true) - $startTime, 2);
            $this->command->info("\n✅ Import completed successfully in {$executionTime} seconds!");
        } catch (\Exception $e) {
            $this->command->error("❌ Import failed: " . $e->getMessage());
            Log::channel('structured')->error('seeder.error', [
                'seeder' => 'LocationSeeder',
                'error_type' => get_class($e),
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Ensure JSON file exists, download if necessary
     */
    private function ensureJsonFileExists(): string
    {
        $jsonPath = storage_path('app/countries+states+cities.json');

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
        $url = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json';

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
            $this->command->warn("https://github.com/dr5hn/countries-states-cities-database/blob/master/json/countries%2Bstates%2Bcities.json");
            $this->command->warn("And place it in: storage/app/countries+states+cities.json");
            throw $e;
        }
    }

    /**
     * Load and validate JSON data
     */
    private function loadJsonData(string $jsonPath): array
    {
        $this->command->info("📖 Loading JSON data...");

        $json = File::get($jsonPath);
        $data = json_decode($json, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Failed to parse JSON: " . json_last_error_msg());
        }

        if (!is_array($data)) {
            throw new \Exception("Invalid JSON structure: expected array");
        }

        $this->command->info("✓ Loaded " . count($data) . " countries from JSON");
        return $data;
    }

    /**
     * Get active countries from database
     */
    private function getCountriesFromDatabase(): array
    {
        return DB::table('countries')
            ->where('status', true)
            ->pluck('id', 'iso_code_2')
            ->toArray();
    }

    /**
     * Import states and cities for matching countries
     */
    private function importLocations(array $jsonData, array $dbCountries): void
    {
        $stats = [
            'countries_processed' => 0,
            'states_imported' => 0,
            'cities_imported' => 0,
            'countries_skipped' => 0,
        ];

        // Clear existing data
        $this->command->info("🗑️  Clearing existing states and cities...");
        DB::table('cities')->truncate();
        DB::table('states')->truncate();
        $this->command->info("✓ Cleared existing data");

        // Process each country in the JSON
        foreach ($jsonData as $countryData) {
            $iso2 = $countryData['iso2'] ?? null;

            // Skip if country not in database or missing ISO2
            if (!$iso2 || !isset($dbCountries[$iso2])) {
                $stats['countries_skipped']++;
                continue;
            }

            $countryId = $dbCountries[$iso2];
            $countryName = $countryData['name'] ?? $iso2;
            $stats['countries_processed']++;

            $this->command->info("\n📦 Processing: {$countryName} ({$iso2})");

            // Process states for this country
            $states = $countryData['states'] ?? [];

            if (empty($states)) {
                $this->command->warn("  ⚠️  No states found for {$countryName}");
                continue;
            }

            $this->importStatesForCountry($countryId, $states, $stats);
        }

        // Display summary
        $this->displaySummary($stats);
    }

    /**
     * Import states and their cities for a specific country
     */
    private function importStatesForCountry(int $countryId, array $states, array &$stats): void
    {
        $stateCount = count($states);
        $this->command->info("  📍 Found {$stateCount} states");

        foreach ($states as $index => $stateData) {
            // Use native name if available (e.g., "București" instead of "Bucharest" for Romania)
            $stateName = !empty($stateData['native']) ? $stateData['native'] : ($stateData['name'] ?? 'Unknown');

            // Show progress for large countries
            if ($stateCount > 50 && ($index + 1) % 50 === 0) {
                $this->command->info("  ⏳ Processing state " . ($index + 1) . " / {$stateCount}...");
            }

            try {
                // Insert state
                $stateId = DB::table('states')->insertGetId([
                    'country_id' => $countryId,
                    'name' => $stateName,
                    'code' => $stateData['iso2'] ?? $stateData['state_code'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $stats['states_imported']++;

                // Import cities for this state
                $cities = $stateData['cities'] ?? [];
                if (!empty($cities)) {
                    // Pass both native and standard state names for comparison
                    $stateStandardName = $stateData['name'] ?? $stateName;
                    $this->importCitiesForState($stateId, $stateName, $stateStandardName, $cities, $stats);
                }
            } catch (\Exception $e) {
                $this->command->error("  ❌ Failed to import state '{$stateName}': " . $e->getMessage());
                Log::channel('structured')->error('seeder.error', [
                    'seeder' => 'LocationSeeder',
                    'error_type' => 'state_import_failed',
                    'state' => $stateName,
                    'country_id' => $countryId,
                    'error_message' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * Import cities for a specific state using bulk inserts
     */
    private function importCitiesForState(int $stateId, string $stateName, string $stateStandardName, array $cities, array &$stats): void
    {
        $citiesToInsert = [];

        foreach ($cities as $cityData) {
            $cityName = $cityData['name'] ?? null;

            if (empty($cityName)) {
                continue; // Skip cities without names
            }

            // Skip cities that have the same name as the state
            // Compare with both native name (e.g., "București") and standard name (e.g., "Bucharest")
            $cityNameTrimmed = trim($cityName);
            if (
                strcasecmp($cityNameTrimmed, trim($stateName)) === 0 ||
                strcasecmp($cityNameTrimmed, trim($stateStandardName)) === 0
            ) {
                continue;
            }

            $citiesToInsert[] = [
                'state_id' => $stateId,
                'name' => $cityName,
                'latitude' => $this->parseCoordinate($cityData['latitude'] ?? null),
                'longitude' => $this->parseCoordinate($cityData['longitude'] ?? null),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Bulk insert in chunks for better performance
        if (!empty($citiesToInsert)) {
            foreach (array_chunk($citiesToInsert, self::CHUNK_SIZE) as $chunk) {
                try {
                    DB::table('cities')->insert($chunk);
                    $stats['cities_imported'] += count($chunk);
                } catch (\Exception $e) {
                    $this->command->error("  ❌ Failed to insert cities chunk: " . $e->getMessage());
                    Log::channel('structured')->error('seeder.error', [
                        'seeder' => 'LocationSeeder',
                        'error_type' => 'cities_chunk_insert_failed',
                        'state_id' => $stateId,
                        'chunk_size' => count($chunk),
                        'error_message' => $e->getMessage()
                    ]);
                }
            }
        }
    }

    /**
     * Parse coordinate value to float or null
     */
    private function parseCoordinate(?string $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $floatValue = (float) $value;
        return is_finite($floatValue) ? $floatValue : null;
    }

    /**
     * Display import summary
     */
    private function displaySummary(array $stats): void
    {
        $this->command->info("\n" . str_repeat('=', 50));
        $this->command->info("📊 Import Summary");
        $this->command->info(str_repeat('=', 50));
        $this->command->info("Countries processed: {$stats['countries_processed']}");
        $this->command->info("Countries skipped:   {$stats['countries_skipped']}");
        $this->command->info("States imported:     {$stats['states_imported']}");
        $this->command->info("Cities imported:     {$stats['cities_imported']}");
        $this->command->info(str_repeat('=', 50));
    }
}
