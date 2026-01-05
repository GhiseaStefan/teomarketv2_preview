<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Address;
use App\Models\City;
use App\Models\Country;
use App\Models\State;
use App\Models\Wishlist;
use App\Services\CountryDetectionService;
use App\Services\ViesService;
use App\Services\ReviewService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->load('customer.addresses');
        $customer = $user->customer;
        $addresses = $customer ? $customer->addresses : collect();
        // Filter only shipping addresses for display
        $shippingAddresses = $addresses->where('address_type', 'shipping');
        // Get preferred shipping address (is_preferred only applies to shipping addresses)
        $preferredAddress = $shippingAddresses->where('is_preferred', true)->first()
            ?? $shippingAddresses->first();
        // Get headquarters address for company accounts
        $headquartersAddress = $addresses->where('address_type', 'headquarters')->first();

        // Get activity stats
        $ordersCount = $customer ? $customer->orders()->count() : 0;
        $favoritesCount = $customer ? Wishlist::where('customer_id', $customer->id)->count() : 0;
        $favoriteListsCount = 0; // TODO: Implement favorite lists feature
        
        // Get review counts
        $reviewService = app(ReviewService::class);
        $reviewsCount = $customer ? $reviewService->getCustomerReviewCount($customer) : 0;
        $usefulReviewsCount = $customer ? $reviewService->getCustomerUsefulReviewCount($customer) : 0;

        // Get countries for address form
        $countries = Country::where('status', true)
            ->orderBy('name')
            ->get()
            ->map(function ($country) {
                return [
                    'id' => $country->id,
                    'name' => $country->name,
                    'iso_code_2' => $country->iso_code_2,
                ];
            });

        // Detect country from geolocation for default selection
        $countryDetectionService = app(CountryDetectionService::class);
        $detectedCountryId = $countryDetectionService->getCountryId($request);

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'customer' => $customer ? [
                'phone' => $customer->phone,
                'customer_type' => $customer->customer_type,
                'company_name' => $customer->company_name,
                'fiscal_code' => $customer->fiscal_code,
                'reg_number' => $customer->reg_number,
                'bank_name' => $customer->bank_name,
                'iban' => $customer->iban,
            ] : null,
            'addresses' => $shippingAddresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'address_type' => $address->address_type ?? 'shipping',
                    'first_name' => $address->first_name,
                    'last_name' => $address->last_name,
                    'phone' => $address->phone,
                    'address_line_1' => $address->address_line_1,
                    'address_line_2' => $address->address_line_2,
                    'city' => $address->city,
                    'county_name' => $address->county_name,
                    'zip_code' => $address->zip_code,
                    'is_preferred' => (bool) ($address->is_preferred ?? false),
                ];
            })->values(),
            'preferredAddress' => $preferredAddress ? [
                'id' => $preferredAddress->id,
                'first_name' => $preferredAddress->first_name,
                'last_name' => $preferredAddress->last_name,
                'phone' => $preferredAddress->phone,
                'address_line_1' => $preferredAddress->address_line_1,
                'address_line_2' => $preferredAddress->address_line_2,
                'city' => $preferredAddress->city,
                'county_name' => $preferredAddress->county_name,
                'zip_code' => $preferredAddress->zip_code,
            ] : null,
            'headquartersAddress' => $headquartersAddress ? [
                'id' => $headquartersAddress->id,
                'address_line_1' => $headquartersAddress->address_line_1,
                'address_line_2' => $headquartersAddress->address_line_2,
                'city' => $headquartersAddress->city,
                'county_name' => $headquartersAddress->county_name,
                'zip_code' => $headquartersAddress->zip_code,
            ] : null,
            'activityStats' => [
                'orders_count' => $ordersCount,
                'favorites_count' => $favoritesCount,
                'favorite_lists_count' => $favoriteListsCount,
                'reviews_count' => $reviewsCount,
                'useful_reviews_count' => $usefulReviewsCount,
            ],
            'countries' => $countries,
            'defaultCountryId' => $detectedCountryId,
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request)
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return back()->with('status', 'Profile updated successfully.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Store a new address for the authenticated user.
     */
    public function storeAddress(Request $request): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer) {
            return back()->withErrors(['error' => 'Customer record not found.']);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'county_name' => ['nullable', 'string', 'max:255'],
            'county_code' => ['nullable', 'string', 'max:2'],
            'country_id' => ['required', 'exists:countries,id'],
            'zip_code' => ['required', 'string', 'max:255'],
        ]);

        $address = new Address();
        $address->customer_id = $customer->id;
        $address->first_name = $validated['first_name'];
        $address->last_name = $validated['last_name'];
        $address->phone = $validated['phone'];
        $address->address_line_1 = $validated['address_line_1'];
        $address->address_line_2 = $validated['address_line_2'] ?? null;
        $address->city = $validated['city'];
        $address->county_name = $validated['county_name'] ?? null;
        $address->county_code = $validated['county_code'] ?? null;
        $address->country_id = $validated['country_id'];
        $address->zip_code = $validated['zip_code'];
        $address->save();

        return back()->with('status', 'Address added successfully.');
    }

    /**
     * Get states for a country.
     */
    public function getStates(Request $request, int $countryId): JsonResponse
    {
        $states = State::where('country_id', $countryId)
            ->select('name', 'code')
            ->selectRaw('MIN(id) as id')
            ->groupBy('name', 'code')
            ->orderBy('name')
            ->get()
            ->map(function ($state) {
                return [
                    'id' => $state->id,
                    'name' => $state->name,
                    'code' => $state->code,
                ];
            });

        return response()->json($states);
    }

    /**
     * Get cities for a state.
     */
    public function getCities(Request $request, int $stateId): JsonResponse
    {
        $cities = City::where('state_id', $stateId)
            ->orderBy('name')
            ->get()
            ->map(function ($city) {
                return [
                    'id' => $city->id,
                    'name' => $city->name,
                ];
            });

        return response()->json($cities);
    }

    /**
     * Get detected country ID from IP geolocation.
     * This endpoint only uses IP detection, ignoring user's existing addresses.
     * Falls back to Romania if detection fails or returns an invalid country.
     * 
     * Priority:
     * 1. Detect country from IP geolocation
     * 2. If IP detection fails or returns invalid country, use Romania as default
     */
    public function getDetectedCountry(Request $request): JsonResponse
    {
        // Get Romania country for fallback
        $romania = Country::where('iso_code_2', 'RO')
            ->where('status', true)
            ->first();

        if (!$romania) {
            // If Romania not found, get first active country as fallback
            $romania = Country::where('status', true)->first();
        }

        $detectedCountryId = null;

        // Priority 1: Detect country from IP geolocation (ignoring existing addresses)
        $countryDetectionService = app(CountryDetectionService::class);
        $ipDetectedCountryId = $countryDetectionService->getCountryIdFromIpOnly($request);

        if ($ipDetectedCountryId !== null) {
            // Verify the detected country exists and is active
            $detectedCountry = Country::where('id', $ipDetectedCountryId)
                ->where('status', true)
                ->first();

            if ($detectedCountry) {
                $detectedCountryId = $detectedCountry->id;
            }
        }

        // Priority 2: If IP detection fails or returns invalid country, use Romania as default
        if ($detectedCountryId === null && $romania) {
            $detectedCountryId = $romania->id;
        }

        return response()->json([
            'country_id' => $detectedCountryId,
        ]);
    }

    /**
     * Update customer company information (fiscal code, reg number, company name).
     */
    public function updateCompanyInfo(Request $request): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer) {
            return back()->withErrors(['error' => 'Customer record not found.']);
        }

        $validated = $request->validate([
            'fiscal_code' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($customer) {
                    // Determine country code - try to get from headquarters address (for companies) or preferred shipping address
                    $countryCode = 'RO'; // Default to Romania

                    if ($customer) {
                        // For companies, prefer headquarters address; otherwise use preferred shipping address
                        $address = $customer->customer_type === 'company'
                            ? $customer->addresses()->where('address_type', 'headquarters')->first()
                            : $customer->addresses()->where('address_type', 'shipping')->where('is_preferred', true)->first();

                        if (!$address) {
                            $address = $customer->addresses()->first();
                        }

                        if ($address && $address->country) {
                            $countryCode = $address->country->iso_code_2 ?? 'RO';
                        }
                    }

                    $viesService = app(ViesService::class);
                    // Clean CUI (remove spaces, RO prefix if present)
                    $cleanCui = trim($value);
                    $cleanCui = preg_replace('/[^A-Z0-9]/i', '', $cleanCui);
                    $cleanCui = strtoupper($cleanCui);

                    $result = $viesService->validate($cleanCui, $countryCode);

                    if (!$result['valid']) {
                        $message = $result['message'] ?? 'CUI is invalid or not found in VIES system';
                        $fail($message);
                    }
                },
            ],
            'reg_number' => ['required', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'min:3', 'max:255', 'regex:/^[a-zA-Z0-9\s\.,\-\&@"]+$/'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'iban' => [
                'nullable',
                'string',
                'max:34',
                'regex:/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/',
            ],
        ]);

        // Clean fiscal code before saving
        $cleanFiscalCode = trim($validated['fiscal_code']);
        $cleanFiscalCode = preg_replace('/[^A-Z0-9]/i', '', $cleanFiscalCode);
        $cleanFiscalCode = strtoupper($cleanFiscalCode);

        $customer->fiscal_code = $cleanFiscalCode;
        $customer->reg_number = $validated['reg_number'];
        $customer->company_name = $validated['company_name'];
        $customer->bank_name = $validated['bank_name'] ?? null;
        $customer->iban = isset($validated['iban']) ? strtoupper(str_replace(' ', '', $validated['iban'])) : null;
        $customer->save();

        return back()->with('status', 'Company information updated successfully.');
    }

    /**
     * Show the billing information page.
     */
    public function editBilling(Request $request): Response
    {
        $user = $request->user()->load('customer.addresses');
        $customer = $user->customer;
        $addresses = $customer ? $customer->addresses : collect();

        // Get headquarters address (only for companies)
        $headquartersAddress = $addresses->where('address_type', 'headquarters')->first();

        // Get billing addresses
        $billingAddresses = $addresses->where('address_type', 'billing')->values();

        return Inertia::render('settings/billing', [
            'customer' => $customer ? [
                'customer_type' => $customer->customer_type,
                'company_name' => $customer->company_name,
                'fiscal_code' => $customer->fiscal_code,
                'reg_number' => $customer->reg_number,
                'bank_name' => $customer->bank_name,
                'iban' => $customer->iban,
            ] : null,
            'headquartersAddress' => $headquartersAddress ? [
                'id' => $headquartersAddress->id,
                'first_name' => $headquartersAddress->first_name,
                'last_name' => $headquartersAddress->last_name,
                'phone' => $headquartersAddress->phone,
                'address_line_1' => $headquartersAddress->address_line_1,
                'address_line_2' => $headquartersAddress->address_line_2,
                'city' => $headquartersAddress->city,
                'county_name' => $headquartersAddress->county_name,
                'zip_code' => $headquartersAddress->zip_code,
                'country_id' => $headquartersAddress->country_id,
            ] : null,
            'billingAddresses' => $billingAddresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'first_name' => $address->first_name,
                    'last_name' => $address->last_name,
                    'phone' => $address->phone,
                    'address_line_1' => $address->address_line_1,
                    'address_line_2' => $address->address_line_2,
                    'city' => $address->city,
                    'county_name' => $address->county_name,
                    'zip_code' => $address->zip_code,
                    'country_id' => $address->country_id,
                ];
            })->values(),
            'countries' => Country::where('status', true)
                ->orderBy('name')
                ->get()
                ->map(function ($country) {
                    return [
                        'id' => $country->id,
                        'name' => $country->name,
                        'iso_code_2' => $country->iso_code_2,
                    ];
                }),
        ]);
    }

    /**
     * Store a new billing address.
     */
    public function storeBillingAddress(Request $request): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer || $customer->customer_type !== 'company') {
            return back()->withErrors(['error' => 'Billing addresses are only available for company accounts.']);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'county_name' => ['nullable', 'string', 'max:255'],
            'county_code' => ['nullable', 'string', 'max:2'],
            'country_id' => ['required', 'exists:countries,id'],
            'zip_code' => ['required', 'string', 'max:255'],
        ]);

        $address = new Address();
        $address->customer_id = $customer->id;
        $address->address_type = 'billing';
        $address->first_name = $validated['first_name'];
        $address->last_name = $validated['last_name'];
        $address->phone = $validated['phone'];
        $address->address_line_1 = $validated['address_line_1'];
        $address->address_line_2 = $validated['address_line_2'] ?? null;
        $address->city = $validated['city'];
        $address->county_name = $validated['county_name'] ?? null;
        $address->county_code = $validated['county_code'] ?? null;
        $address->country_id = $validated['country_id'];
        $address->zip_code = $validated['zip_code'];
        $address->is_preferred = false;
        $address->save();

        // If JSON request (for AJAX/fetch), return JSON with address ID
        if ($request->wantsJson() || $request->header('Accept') === 'application/json') {
            return response()->json([
                'success' => true,
                'id' => $address->id,
                'message' => 'Billing address added successfully.',
            ]);
        }

        // If request is coming from order-details page, stay on that page
        $previousUrl = url()->previous();
        if ($previousUrl && (str_contains($previousUrl, '/checkout/order-details') || str_contains($previousUrl, 'order-details'))) {
            return back()->with('status', 'Billing address added successfully.');
        }

        return redirect()->route('billing.edit')->with('status', 'Billing address added successfully.');
    }

    /**
     * Update an existing billing address.
     */
    public function updateBillingAddress(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer || $customer->customer_type !== 'company') {
            return back()->withErrors(['error' => 'Billing addresses are only available for company accounts.']);
        }

        $address = Address::where('id', $id)
            ->where('customer_id', $customer->id)
            ->whereIn('address_type', ['billing', 'headquarters'])
            ->firstOrFail();

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'county_name' => ['nullable', 'string', 'max:255'],
            'county_code' => ['nullable', 'string', 'max:2'],
            'country_id' => ['required', 'exists:countries,id'],
            'zip_code' => ['required', 'string', 'max:255'],
        ]);

        $address->first_name = $validated['first_name'];
        $address->last_name = $validated['last_name'];
        $address->phone = $validated['phone'];
        $address->address_line_1 = $validated['address_line_1'];
        $address->address_line_2 = $validated['address_line_2'] ?? null;
        $address->city = $validated['city'];
        $address->county_name = $validated['county_name'] ?? null;
        $address->county_code = $validated['county_code'] ?? null;
        $address->country_id = $validated['country_id'];
        $address->zip_code = $validated['zip_code'];
        $address->save();

        // If request is coming from order-details page, stay on that page
        $previousUrl = url()->previous();
        if ($previousUrl && (str_contains($previousUrl, '/checkout/order-details') || str_contains($previousUrl, 'order-details'))) {
            return back()->with('status', 'Billing address updated successfully.');
        }

        return redirect()->route('billing.edit')->with('status', 'Billing address updated successfully.');
    }

    /**
     * Delete a billing address.
     */
    public function destroyBillingAddress(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer || $customer->customer_type !== 'company') {
            return back()->withErrors(['error' => 'Billing addresses are only available for company accounts.']);
        }

        $address = Address::where('id', $id)
            ->where('customer_id', $customer->id)
            ->where('address_type', 'billing')
            ->firstOrFail();

        $address->delete();

        return redirect()->route('billing.edit')->with('status', 'Billing address deleted successfully.');
    }
}
