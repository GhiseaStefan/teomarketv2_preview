<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Country;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    /**
     * Display the addresses management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->load('customer.addresses');
        $customer = $user->customer;
        $addresses = $customer ? $customer->addresses : collect();

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

        // Only show shipping addresses on the addresses page
        $shippingAddresses = $addresses->where('address_type', 'shipping');

        return Inertia::render('settings/addresses', [
            'customer_type' => $customer ? $customer->customer_type : null,
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
                    'country_id' => $address->country_id,
                    'is_preferred' => (bool) ($address->is_preferred ?? false),
                ];
            })->values(),
            'countries' => $countries,
        ]);
    }

    /**
     * Store a new address for the authenticated user.
     */
    public function store(Request $request): RedirectResponse
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
            'address_type' => ['nullable', 'string', 'in:shipping,billing'],
            'is_preferred' => ['nullable', 'boolean'],
            'state_id' => ['nullable', 'string'],
            'city_id' => ['nullable', 'string'],
        ]);

        // Addresses page only allows shipping addresses
        $addressType = $validated['address_type'] ?? 'shipping';

        // Check if this is the first shipping address for this customer
        $isFirstShippingAddress = !$customer->addresses()->where('address_type', 'shipping')->exists();
        
        // Use is_preferred from request if provided, otherwise use default logic
        $isPreferred = $request->has('is_preferred') 
            ? (bool) $validated['is_preferred'] 
            : $isFirstShippingAddress;

        $address = new Address();
        $address->customer_id = $customer->id;
        $address->address_type = $addressType;
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
        // Note: state_id and city_id are not stored in addresses table, only county_name/county_code and city name
        // is_preferred only applies to shipping addresses
        $address->is_preferred = $isPreferred;
        $address->save();

        // If JSON request (for AJAX/fetch), return JSON with address ID
        if ($request->wantsJson() || $request->header('Accept') === 'application/json') {
            return response()->json([
                'success' => true,
                'id' => $address->id,
                'message' => 'Address added successfully.',
            ]);
        }

        // If request is coming from order-details page, stay on that page
        $previousUrl = url()->previous();
        if ($previousUrl && (str_contains($previousUrl, '/checkout/order-details') || str_contains($previousUrl, 'order-details'))) {
            return back()->with('status', 'Address added successfully.');
        }

        return redirect()->route('addresses.index')->with('status', 'Address added successfully.');
    }

    /**
     * Update an existing address.
     */
    public function update(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer) {
            return back()->withErrors(['error' => 'Customer record not found.']);
        }

        $address = Address::where('id', $id)
            ->where('customer_id', $customer->id)
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

        // Keep the existing address type (addresses page only handles shipping addresses)
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
        // Reset is_preferred if address type is not shipping (for safety, though addresses page only has shipping)
        if ($address->address_type !== 'shipping') {
            $address->is_preferred = false;
        }
        $address->save();

        // If request is coming from order-details page, stay on that page
        $previousUrl = url()->previous();
        if ($previousUrl && (str_contains($previousUrl, '/checkout/order-details') || str_contains($previousUrl, 'order-details'))) {
            return back()->with('status', 'Address updated successfully.');
        }

        return redirect()->route('addresses.index')->with('status', 'Address updated successfully.');
    }

    /**
     * Delete an address.
     */
    public function destroy(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer) {
            return back()->withErrors(['error' => 'Customer record not found.']);
        }

        $address = Address::where('id', $id)
            ->where('customer_id', $customer->id)
            ->firstOrFail();

        $wasPreferred = $address->is_preferred;
        $addressType = $address->address_type;

        $address->delete();

        // If the deleted address was preferred shipping address, set the first remaining shipping address as preferred
        if ($wasPreferred && $addressType === 'shipping') {
            $firstRemainingShippingAddress = Address::where('customer_id', $customer->id)
                ->where('address_type', 'shipping')
                ->orderBy('created_at', 'asc')
                ->first();

            if ($firstRemainingShippingAddress) {
                // Unset all other preferred shipping addresses
                Address::where('customer_id', $customer->id)
                    ->where('address_type', 'shipping')
                    ->where('id', '!=', $firstRemainingShippingAddress->id)
                    ->update(['is_preferred' => false]);

                // Set the first remaining shipping address as preferred
                $firstRemainingShippingAddress->is_preferred = true;
                $firstRemainingShippingAddress->save();
            }
        }

        return redirect()->route('addresses.index')->with('status', 'Address deleted successfully.');
    }

    /**
     * Set an address as preferred.
     */
    public function setPreferred(Request $request, int $id): RedirectResponse
    {
        $user = $request->user();
        $customer = $user->customer;

        if (!$customer) {
            return back()->withErrors(['error' => 'Customer record not found.']);
        }

        $address = Address::where('id', $id)
            ->where('customer_id', $customer->id)
            ->firstOrFail();

        // Only shipping addresses can be set as preferred
        if ($address->address_type !== 'shipping') {
            return back()->withErrors(['error' => 'Only shipping addresses can be set as preferred.']);
        }

        // Unset all other preferred shipping addresses for this customer
        Address::where('customer_id', $customer->id)
            ->where('address_type', 'shipping')
            ->where('id', '!=', $id)
            ->update(['is_preferred' => false]);

        // Set this address as preferred
        $address->is_preferred = true;
        $address->save();

        return redirect()->route('addresses.index')->with('status', 'Address set as preferred successfully.');
    }
}
