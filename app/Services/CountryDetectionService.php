<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Service for detecting user's country for VAT calculation.
 * 
 * Priority order:
 * 1. Country from user's preferred address (if authenticated and has addresses)
 * 2. Country from user's first address (if authenticated and has addresses)
 * 3. Country detected from IP/geolocation
 * 4. Fallback to Romania (if country cannot be determined)
 */
class CountryDetectionService
{
    /**
     * Get country ID for the current request context.
     * 
     * For B2C customers:
     * - Priority 1: Country from user's preferred address (if authenticated and has addresses)
     * - Priority 2: Country detected from IP/geolocation
     * - Fallback: Romania (if country cannot be determined)
     * 
     * For B2B customers: Country detection is not needed (VAT is always 0% - reverse charge)
     * but a country ID is still returned for compatibility.
     * 
     * @param Request|null $request Optional request object (if null, uses current request)
     * @param int|null $customerGroupId Optional customer group ID to determine if B2B or B2C
     * @return int Country ID (always returns a value, defaults to Romania if detection fails)
     */
    public function getCountryId(?Request $request = null, ?int $customerGroupId = null): int
    {
        // Try to get request if not provided
        if ($request === null) {
            try {
                $request = request();
            } catch (\Exception $e) {
                // If request() fails (e.g., in console context), we cannot detect country
                $request = null;
            }
        }

        // Determine if this is B2B customer
        // If customerGroupId is provided, check if it's B2B
        // For B2B: No country detection needed (VAT is always 0% - reverse charge)
        // But we still need to return a country ID for compatibility, so we try to detect it
        // If detection fails for B2B, we can still proceed (VAT will be 0% anyway)
        $isB2B = false;
        if ($customerGroupId !== null) {
            $customerGroup = \App\Models\CustomerGroup::find($customerGroupId);
            if ($customerGroup && $customerGroup->code !== 'B2C') {
                $isB2B = true;
            }
        }

        // For B2C: Priority 1 - Check if user is authenticated and has addresses
        $user = Auth::user();
        if ($user && $user->customer_id) {
            $addressCountryId = $this->getCountryFromUserAddresses($user->customer_id);
            if ($addressCountryId !== null) {
                return $addressCountryId;
            }
        }

        // Priority 2: Detect country from IP/geolocation (only if we have a request)
        if ($request !== null) {
            $ipCountryId = $this->detectCountryFromIp($request);
            if ($ipCountryId !== null) {
                return $ipCountryId;
            }
        }

        // Fallback: If country could not be determined, default to Romania
        // This is especially important for local development where IP detection fails
        // For B2B, this is less critical (VAT is 0% anyway), but we still need a country ID
        return $this->getRomaniaCountryId();
    }

    /**
     * Get country ID detected only from IP geolocation.
     * This method ignores user addresses and only uses IP detection.
     * Useful for address forms where we want to suggest country based on location.
     * 
     * @param Request|null $request Optional request object (if null, uses current request)
     * @return int|null Country ID or null if detection fails
     */
    public function getCountryIdFromIpOnly(?Request $request = null): ?int
    {
        // Try to get request if not provided
        if ($request === null) {
            try {
                $request = request();
            } catch (\Exception $e) {
                // If request() fails (e.g., in console context), return null
                return null;
            }
        }

        // Detect country from IP/geolocation only
        if ($request !== null) {
            $ipCountryId = $this->detectCountryFromIp($request);
            if ($ipCountryId !== null) {
                return $ipCountryId;
            }
        }

        return null;
    }

    /**
     * Get country ID from user's addresses.
     * Returns country from preferred address, or first address if no preferred.
     * 
     * @param int $customerId
     * @return int|null Country ID or null if no addresses found
     */
    private function getCountryFromUserAddresses(int $customerId): ?int
    {
        // Priority 1: Try to get preferred address directly from database
        $preferredAddress = Address::where('customer_id', $customerId)
            ->where('is_preferred', true)
            ->with('country')
            ->first();

        if ($preferredAddress && $preferredAddress->country_id) {
            return $preferredAddress->country_id;
        }

        // Priority 2: Fallback to first address (by creation date, newest first)
        $firstAddress = Address::where('customer_id', $customerId)
            ->with('country')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($firstAddress && $firstAddress->country_id) {
            return $firstAddress->country_id;
        }

        return null;
    }

    /**
     * Detect country from IP address using geolocation service.
     * Uses caching to avoid excessive API calls.
     * 
     * @param Request $request
     * @return int|null Country ID or null if detection fails
     */
    private function detectCountryFromIp(Request $request): ?int
    {
        $ip = $this->getClientIp($request);
        
        // Skip detection for local/private IPs
        if ($this->isLocalIp($ip)) {
            return null;
        }

        // Use cache to avoid repeated API calls for same IP
        $cacheKey = "country_detection_ip_{$ip}";
        
        return Cache::remember($cacheKey, now()->addDays(7), function () use ($ip) {
            try {
                // Try ip-api.com (free, no API key required for basic usage)
                $response = Http::timeout(2)->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,countryCode,message'
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['status']) && $data['status'] === 'success' && isset($data['countryCode'])) {
                        $countryCode = $data['countryCode'];
                        
                        // Find country by ISO code
                        $country = Country::where('iso_code_2', $countryCode)
                            ->where('status', true)
                            ->first();
                            
                        if ($country) {
                            return $country->id;
                        }
                    }
                }
            } catch (\Exception $e) {
                // Silently fail - fallback to Romania
            }

            return null;
        });
    }

    /**
     * Get client IP address from request.
     * 
     * @param Request $request
     * @return string IP address
     */
    private function getClientIp(Request $request): string
    {
        // Check for forwarded IP (when behind proxy/load balancer)
        $forwardedIp = $request->header('X-Forwarded-For');
        if ($forwardedIp) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            $ips = explode(',', $forwardedIp);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        // Check for real IP header
        $realIp = $request->header('X-Real-IP');
        if ($realIp && filter_var($realIp, FILTER_VALIDATE_IP)) {
            return $realIp;
        }

        // Fallback to request IP
        return $request->ip() ?? '127.0.0.1';
    }

    /**
     * Check if IP is local/private (should skip geolocation).
     * 
     * @param string $ip
     * @return bool
     */
    private function isLocalIp(string $ip): bool
    {
        // Check for localhost
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost') {
            return true;
        }

        // Check for private IP ranges
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }

    /**
     * Get Romania country ID.
     * 
     * @return int Romania country ID
     */
    private function getRomaniaCountryId(): int
    {
        static $romaniaId = null;
        
        if ($romaniaId === null) {
            $romaniaId = DB::table('countries')
                ->where('iso_code_2', 'RO')
                ->value('id');
            
            // Fallback if Romania not found (shouldn't happen, but safety check)
            if ($romaniaId === null) {
                $romaniaId = Country::where('status', true)->value('id') ?? 1;
            }
        }
        
        return $romaniaId;
    }
}

