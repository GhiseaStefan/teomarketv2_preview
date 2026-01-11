<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Currency;
use App\Models\CustomerGroup;
use App\Models\VatRate;
use App\Services\CountryDetectionService;
use App\Utils\CurrencyConverter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductPriceService
{
    protected CountryDetectionService $countryDetectionService;

    /**
     * Static cache for VAT rates per country (cached for the duration of the request).
     * Key: country_id, Value: VAT rate (float)
     * 
     * This cache prevents multiple DB queries for the same country when processing
     * product listings (e.g., 50 products on a page would trigger 50 queries without cache).
     */
    protected static array $vatRateCache = [];

    public function __construct(CountryDetectionService $countryDetectionService)
    {
        $this->countryDetectionService = $countryDetectionService;
    }
    /**
     * Calculate product base price for a specific quantity and customer group.
     * Returns price in RON (excluding VAT) - this is the base price from database.
     *
     * @param Product $product
     * @param int $quantity
     * @param int|null $customerGroupId
     * @return float Price in RON excluding VAT
     */
    public function calculatePriceRon(Product $product, int $quantity = 1, ?int $customerGroupId = null): float
    {
        $basePrice = (float) $product->price_ron;

        // Check for quantity-based pricing for the specific customer group
        if ($customerGroupId) {
            $groupPrices = $product->productGroupPrices()
                ->where('customer_group_id', $customerGroupId)
                ->where('min_quantity', '<=', $quantity)
                ->orderBy('min_quantity', 'desc')
                ->first();

            if ($groupPrices) {
                return (float) $groupPrices->price_ron;
            }
        }

        return $basePrice;
    }

    /**
     * Get VAT rate for a product based on country.
     *
     * @param Product $product
     * @param int|null $countryId Country ID (auto-detected if not provided)
     * @param float|null $defaultVatRate Default VAT rate if not found
     * @param Request|null $request Optional request object for country detection
     * @param int|null $customerGroupId Optional customer group ID for country detection (B2B vs B2C)
     * @return float VAT rate as percentage (e.g., 19.0 for 19%)
     */
    public function getVatRate(Product $product, ?int $countryId = null, ?float $defaultVatRate = null, ?Request $request = null, ?int $customerGroupId = null): float
    {
        // For B2B: VAT is always 0% (reverse charge), no country detection needed
        $effectiveCustomerGroupId = $this->getEffectiveCustomerGroupId($customerGroupId);
        $isB2B = !$this->shouldShowVat($effectiveCustomerGroupId);

        if ($isB2B) {
            return 0.0;
        }

        // Auto-detect country if not provided (only for B2C)
        if ($countryId === null) {
            if ($request) {
                $countryId = $this->countryDetectionService->getCountryId($request, $customerGroupId);
            }
            // Fallback to Romania (ID 1) if still null
            if ($countryId === null) {
                $countryId = 1; // Default to Romania
            }
        }

        // Use default VAT rate if not provided
        if ($defaultVatRate === null) {
            // Check cache first to avoid multiple DB queries for the same country
            if (isset(self::$vatRateCache[$countryId])) {
                $defaultVatRate = self::$vatRateCache[$countryId];
            } else {
                // Get VAT rate for this country from database
                $defaultVatRate = VatRate::where('country_id', $countryId)
                    ->orderBy('rate', 'desc')
                    ->value('rate');

                // Throw error if VAT rate not found
                if ($defaultVatRate === null) {
                    $country = \App\Models\Country::find($countryId);
                    $countryName = $country ? $country->name : "ID: {$countryId}";
                    throw new \Exception("VAT rate not found for country: {$countryName}");
                }

                // Cache the VAT rate for future requests in the same request cycle
                self::$vatRateCache[$countryId] = $defaultVatRate;
            }
        }

        // Return default VAT rate for the country
        return $defaultVatRate;
    }

    /**
     * Calculate price excluding VAT from price including VAT.
     *
     * @param float $priceInclVat Price including VAT
     * @param float $vatRate VAT rate as percentage (e.g., 19.0 for 19%)
     * @return float Price excluding VAT (rounded to 2 decimal places)
     */
    public function calculatePriceExclVat(float $priceInclVat, float $vatRate): float
    {
        $result = $priceInclVat / (1 + ($vatRate / 100));
        return round($result, 2);
    }

    /**
     * Calculate price including VAT from price excluding VAT.
     *
     * @param float $priceExclVat Price excluding VAT
     * @param float $vatRate VAT rate as percentage (e.g., 19.0 for 19%)
     * @return float Price including VAT (rounded to 2 decimal places)
     */
    public function calculatePriceInclVat(float $priceExclVat, float $vatRate): float
    {
        $result = $priceExclVat * (1 + ($vatRate / 100));
        return round($result, 2);
    }

    /**
     * Convert price from RON to target currency.
     *
     * @param float $priceRon Price in RON
     * @param Currency $currency Target currency
     * @return float Price in target currency
     */
    public function convertToCurrency(float $priceRon, Currency $currency): float
    {
        if ($currency->code === 'RON') {
            return $priceRon;
        }

        return CurrencyConverter::convertFromRon($priceRon, $currency->code);
    }

    /**
     * Get effective customer group ID.
     * If customerGroupId is provided, returns it. Otherwise, returns B2C group ID.
     * This is the single source of truth for customer group determination in pricing context.
     *
     * @param int|null $customerGroupId Customer group ID (can be null)
     * @return int|null Effective customer group ID (B2C if input is null)
     */
    public function getEffectiveCustomerGroupId(?int $customerGroupId = null): ?int
    {
        if ($customerGroupId !== null) {
            return $customerGroupId;
        }

        return CustomerGroup::getB2CGroupId();
    }

    /**
     * Determine if VAT should be shown based on customer group.
     * B2C/unlogged customers see prices with VAT, B2B customers see prices without VAT.
     * This is the single source of truth for VAT display logic.
     *
     * @param int|null $customerGroupId Customer group ID (null means B2C/unlogged)
     * @return bool True if VAT should be shown (B2C/unlogged), false otherwise (B2B)
     */
    public function shouldShowVat(?int $customerGroupId = null): bool
    {
        if ($customerGroupId === null) {
            return true; // B2C/unlogged see prices with VAT
        }

        $customerGroup = CustomerGroup::find($customerGroupId);
        if (!$customerGroup) {
            return true; // Default to showing VAT if group not found
        }

        // B2C customers see prices with VAT, others (B2B) see without VAT
        return $customerGroup->code === 'B2C';
    }

    /**
     * Get complete price information for a product.
     * This is the main method that should be used throughout the application.
     *
     * @param Product $product
     * @param Currency $currency
     * @param int $quantity
     * @param int|null $customerGroupId
     * @param int|null $countryId Country ID for VAT calculation (auto-detected if not provided)
     * @param Request|null $request Optional request object for country detection
     * @return array Complete price information
     */
    public function getPriceInfo(
        Product $product,
        Currency $currency,
        int $quantity = 1,
        ?int $customerGroupId = null,
        ?int $countryId = null,
        ?Request $request = null
    ): array {
        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $this->getEffectiveCustomerGroupId($customerGroupId);

        // Determine if this is a B2B customer
        $isB2B = !$this->shouldShowVat($customerGroupId);

        // Calculate base price in RON (excluding VAT) from database
        // price_ron in database is stored WITHOUT VAT
        $priceRonExclVat = $this->calculatePriceRon($product, $quantity, $customerGroupId);

        // For B2B: TVA is always 0% (reverse charge), so price stays the same
        // For B2C: Get VAT rate based on detected country and add VAT to base price
        if ($isB2B) {
            $vatRate = 0.0;
            // For B2B, price without VAT is the same as base price (no VAT added)
            $priceRonInclVat = $priceRonExclVat;
        } else {
            // B2C: Auto-detect country if not provided (priority: preferred address > geolocation)
            if ($countryId === null) {
                $countryId = $this->countryDetectionService->getCountryId($request, $customerGroupId);
            }

            // Get VAT rate for detected country
            $vatRate = $this->getVatRate($product, $countryId, null, $request, $customerGroupId);

            // Add VAT to base price for B2C customers
            $priceRonInclVat = $this->calculatePriceInclVat($priceRonExclVat, $vatRate);
        }

        // Convert to target currency (round after conversion to prevent floating point errors)
        $priceInclVat = round($this->convertToCurrency($priceRonInclVat, $currency), 2);
        $priceExclVat = round($this->convertToCurrency($priceRonExclVat, $currency), 2);

        // Calculate totals for quantity (round after each multiplication to prevent floating point errors)
        $totalInclVat = round($priceInclVat * $quantity, 2);
        $totalExclVat = round($priceExclVat * $quantity, 2);

        // Determine display price based on customer group
        // B2C/unlogged see prices with VAT, B2B see prices without VAT
        $showVat = $this->shouldShowVat($customerGroupId);
        $unitPriceDisplay = $showVat ? $priceInclVat : $priceExclVat;
        $totalPriceDisplay = $showVat ? $totalInclVat : $totalExclVat;

        // Calculate total RON prices (round after each multiplication to prevent floating point errors)
        $totalRonInclVat = round($priceRonInclVat * $quantity, 2);
        $totalRonExclVat = round($priceRonExclVat * $quantity, 2);

        return [
            'unit_price_ron_incl_vat' => round($priceRonInclVat, 2),
            'unit_price_ron_excl_vat' => round($priceRonExclVat, 2),
            'unit_price_incl_vat' => $priceInclVat, // Already rounded
            'unit_price_excl_vat' => $priceExclVat, // Already rounded
            'unit_price_display' => round($unitPriceDisplay, 2), // Price to display based on customer group
            'total_price_ron_incl_vat' => $totalRonInclVat, // Already rounded
            'total_price_ron_excl_vat' => $totalRonExclVat, // Already rounded
            'total_price_incl_vat' => $totalInclVat, // Already rounded
            'total_price_excl_vat' => $totalExclVat, // Already rounded
            'total_price_display' => round($totalPriceDisplay, 2), // Total to display based on customer group
            'vat_rate' => $vatRate, // 0% for B2B (reverse charge), country rate for B2C
            'vat_included' => !$isB2B, // Prices include VAT only for B2C, not for B2B
            'show_vat' => $showVat, // Whether to show VAT for this customer group
            'quantity' => $quantity,
            'customer_group_id' => $customerGroupId,
            'currency_code' => $currency->code,
        ];
    }

    /**
     * Get quantity-based price tiers for a product and customer group.
     *
     * @param Product $product
     * @param Currency $currency
     * @param int|null $customerGroupId
     * @param Request|null $request Optional request object for country detection
     * @return array Array of price tiers
     */
    public function getPriceTiers(Product $product, Currency $currency, ?int $customerGroupId = null, ?Request $request = null): array
    {
        // Get effective customer group ID (defaults to B2C if not provided)
        $customerGroupId = $this->getEffectiveCustomerGroupId($customerGroupId);
        $tiers = $product->getQuantityPriceTiers($customerGroupId);
        $formattedTiers = [];

        // Determine if this is a B2B customer
        $isB2B = !$this->shouldShowVat($customerGroupId);

        // For B2B: TVA is always 0% (reverse charge)
        // For B2C: Get VAT rate based on detected country (priority: preferred address > geolocation)
        if ($isB2B) {
            $vatRate = 0.0;
        } else {
            // B2C: Auto-detect country (priority: preferred address > geolocation)
            $countryId = $this->countryDetectionService->getCountryId($request, $customerGroupId);
            // Get VAT rate for detected country
            $vatRate = $this->getVatRate($product, $countryId, null, $request, $customerGroupId);
        }

        // Determine if we should show VAT for this customer group
        $showVat = $this->shouldShowVat($customerGroupId);

        foreach ($tiers as $tier) {
            // price_ron in database is stored WITHOUT VAT
            $tierPriceRonExclVat = (float) $tier['price_ron'];

            // For B2B: price stays the same (no VAT)
            // For B2C: add VAT to base price
            if ($isB2B) {
                $tierPriceRonInclVat = $tierPriceRonExclVat;
            } else {
                $tierPriceRonInclVat = $this->calculatePriceInclVat($tierPriceRonExclVat, $vatRate);
            }

            // Convert to target currency
            $tierPriceInclVat = $this->convertToCurrency($tierPriceRonInclVat, $currency);
            $tierPriceExclVat = $this->convertToCurrency($tierPriceRonExclVat, $currency);

            // Display price based on customer group
            $tierPriceDisplay = $showVat ? $tierPriceInclVat : $tierPriceExclVat;

            // Format quantity range
            $quantityRange = $tier['max_quantity'] !== null
                ? "{$tier['min_quantity']}-{$tier['max_quantity']}"
                : "{$tier['min_quantity']}+";

            $formattedTiers[] = [
                'min_quantity' => $tier['min_quantity'],
                'max_quantity' => $tier['max_quantity'],
                'quantity_range' => $quantityRange,
                'price_raw' => round($tierPriceInclVat, 2), // Keep for backward compatibility (incl VAT)
                'price_display' => round($tierPriceDisplay, 2), // Price to display based on customer group
            ];
        }

        return $formattedTiers;
    }

    /**
     * Clear the VAT rate cache.
     * Useful for testing or when VAT rates are updated during the request.
     *
     * @return void
     */
    public static function clearVatRateCache(): void
    {
        self::$vatRateCache = [];
    }
}
