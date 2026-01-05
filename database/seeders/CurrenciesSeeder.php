<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Services\CurrencyService;
use Illuminate\Database\Seeder;

/**
 * Currencies Seeder
 * 
 * Static/Lookup Data - Required for production
 * 
 * Seeds currencies used in the application.
 * Fetches exchange rates from BNR API. Throws exception if rates cannot be fetched.
 * Uses updateOrCreate for idempotency.
 */
class CurrenciesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * @throws \RuntimeException If exchange rates cannot be fetched from BNR API
     */
    public function run(): void
    {
        $this->command->info('Seeding currencies...');

        // Currency configuration (symbols and status)
        $currenciesConfig = [
            ['code' => 'RON', 'symbol_left' => null, 'symbol_right' => ' lei', 'status' => true],
            ['code' => 'EUR', 'symbol_left' => '€', 'symbol_right' => null, 'status' => true],
            ['code' => 'USD', 'symbol_left' => '$', 'symbol_right' => null, 'status' => true],
            ['code' => 'GBP', 'symbol_left' => '£', 'symbol_right' => null, 'status' => true],
        ];

        // Fetch rates from BNR API
        $currencyService = new CurrencyService();
        $bnrRates = [];
        $requiredCurrencies = ['EUR', 'USD', 'GBP'];

        $this->command->info('Fetching exchange rates from BNR...');
        foreach ($requiredCurrencies as $currencyCode) {
            $rate = $currencyService->getLatestRate($currencyCode);
            if ($rate === null) {
                throw new \RuntimeException("Failed to fetch exchange rate for {$currencyCode} from BNR API. Please check your internet connection and try again.");
            }
            $bnrRates[$currencyCode] = $rate;
            $this->command->info("  ✓ Fetched {$currencyCode} rate: {$rate}");
        }

        // Seed currencies with BNR rates
        foreach ($currenciesConfig as $currency) {
            $value = 1.0000; // Default for RON

            // Use BNR rate for foreign currencies
            if (isset($bnrRates[$currency['code']])) {
                $value = $bnrRates[$currency['code']];
            }

            Currency::updateOrCreate(
                ['code' => $currency['code']],
                array_merge($currency, [
                    'value' => $value,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('✓ Currencies seeded successfully');
    }
}
