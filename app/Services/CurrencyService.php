<?php

namespace App\Services;

use App\Models\Currency;
use App\Services\LoggingService;
use Exception;
use Illuminate\Support\Facades\Http;

class CurrencyService
{
    private const BNR_API_URL = 'https://www.bnr.ro/nbrfxrates.xml';

    /**
     * Fetch exchange rates from BNR API and update the database.
     *
     * @return array Array with 'success' boolean and 'message' string
     */
    public function updateExchangeRates(): array
    {
        try {
            $response = Http::timeout(10)->get(self::BNR_API_URL);

            if (!$response->successful()) {
                throw new Exception('Failed to fetch exchange rates from BNR API. Status: ' . $response->status());
            }

            $xml = simplexml_load_string($response->body());
            if ($xml === false) {
                throw new Exception('Failed to parse XML response from BNR API');
            }

            // Register the namespace
            $xml->registerXPathNamespace('ns', 'http://www.bnr.ro/xsd');

            // Get the cube element with rates
            $cube = $xml->xpath('//ns:Cube[@date]');
            if (empty($cube)) {
                throw new Exception('No exchange rate data found in BNR response');
            }

            $rates = [];
            $date = (string) $cube[0]['date'];

            // Extract all rates
            foreach ($cube[0]->Rate as $rate) {
                $currencyCode = (string) $rate['currency'];
                $rateValue = (float) $rate;
                $multiplier = isset($rate['multiplier']) ? (int) $rate['multiplier'] : 1;

                // Adjust rate if multiplier exists (e.g., HUF, JPY use multiplier 100)
                $actualRate = $rateValue / $multiplier;

                $rates[$currencyCode] = $actualRate;
            }

            // Update currencies in database
            $updatedCount = 0;
            foreach ($rates as $currencyCode => $rateValue) {
                // Skip RON as it's the base currency
                if ($currencyCode === 'RON') {
                    continue;
                }

                $currency = Currency::where('code', $currencyCode)->first();
                if ($currency) {
                    $currency->update(['value' => $rateValue]);
                    $updatedCount++;
                } else {
                    // Optionally create new currencies if they don't exist
                    if (request()) {
                        LoggingService::addContext(request(), [
                            'currency_update_skipped' => $currencyCode,
                        ]);
                    }
                }
            }

            // Ensure RON exists with value 1.0000
            Currency::updateOrCreate(
                ['code' => 'RON'],
                [
                    'symbol_left' => null,
                    'symbol_right' => ' lei',
                    'value' => 1.0000,
                    'status' => true,
                ]
            );

            return [
                'success' => true,
                'message' => "Successfully updated {$updatedCount} exchange rates from BNR (date: {$date})",
                'date' => $date,
                'updated_count' => $updatedCount,
            ];
        } catch (Exception $e) {
            if (request()) {
                LoggingService::logError(request(), $e, [
                    'service' => 'currency',
                    'action' => 'update_exchange_rates',
                ]);
            }

            return [
                'success' => false,
                'message' => 'Failed to update exchange rates: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get the latest exchange rate for a specific currency from BNR API.
     *
     * @param string $currencyCode
     * @return float|null
     */
    public function getLatestRate(string $currencyCode): ?float
    {
        try {
            $response = Http::timeout(10)->get(self::BNR_API_URL);

            if (!$response->successful()) {
                return null;
            }

            $xml = simplexml_load_string($response->body());
            if ($xml === false) {
                return null;
            }

            $xml->registerXPathNamespace('ns', 'http://www.bnr.ro/xsd');
            $cube = $xml->xpath('//ns:Cube[@date]');

            if (empty($cube)) {
                return null;
            }

            foreach ($cube[0]->Rate as $rate) {
                if ((string) $rate['currency'] === $currencyCode) {
                    $rateValue = (float) $rate;
                    $multiplier = isset($rate['multiplier']) ? (int) $rate['multiplier'] : 1;
                    return $rateValue / $multiplier;
                }
            }

            return null;
        } catch (Exception $e) {
            if (request()) {
                LoggingService::logError(request(), $e, [
                    'service' => 'currency',
                    'action' => 'get_latest_rate',
                    'currency_code' => $currencyCode,
                ]);
            }

            return null;
        }
    }
}
