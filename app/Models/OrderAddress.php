<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * OrderAddress Model
 * 
 * IMPORTANT: This table stores "frozen" address data at the time of order creation.
 * It does NOT link to the addresses table via foreign key.
 * 
 * When creating an OrderAddress:
 * - Copy address fields (street, city, county, etc.) from Address model
 * - Copy company fields (company_name, fiscal_code, reg_number) from Customer model
 * - For locker/pickup points: Use createFromLockerData() to populate from courier_data
 * - Do NOT store address_id or create foreign key to addresses table
 * 
 * Why: If customer updates their address or company data later,
 * the old order must still show the original data from order_addresses.
 * 
 * Locker Address Flow:
 * When a customer selects a locker (Easybox, FanCourier Point, etc.):
 * 1. The physical address of the locker is stored in OrderAddress (type='shipping')
 * 2. Technical data (point_id, provider, coordinates) is stored in OrderShipping.courier_data
 * 3. This ensures consistency: every order has a shipping address, and locker details are preserved
 */
class OrderAddress extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'type',
        'company_name',
        'fiscal_code',
        'reg_number',
        'first_name',
        'last_name',
        'phone',
        'email',
        'address_line_1',
        'address_line_2',
        'city',
        'county_name',
        'county_code',
        'country_id',
        'zip_code',
    ];

    /**
     * Get the order that owns this address.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the country for this address.
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /**
     * Create an OrderAddress from locker/pickup point data.
     * 
     * When a customer selects a locker (Easybox, FanCourier Point, GLS Point, etc.),
     * this method creates a shipping address with the physical address of the locker.
     * 
     * @param int $orderId The order ID
     * @param array $courierData The courier data from OrderShipping.courier_data (JSON)
     * @param string $customerFirstName Customer's first name
     * @param string $customerLastName Customer's last name
     * @param string $customerPhone Customer's phone number
     * @return OrderAddress
     */
    public static function createFromLockerData(
        int $orderId,
        array $courierData,
        string $customerFirstName,
        string $customerLastName,
        string $customerPhone
    ): OrderAddress {
        // Extract locker details from courier_data
        $lockerDetails = $courierData['locker_details'] ?? [];
        $pointName = $courierData['point_name'] ?? 'Pickup Point';
        
        // Build address_line_1 from locker details
        $addressLine1 = $pointName;
        if (!empty($lockerDetails['address'])) {
            $addressLine1 .= ' - ' . $lockerDetails['address'];
        }
        
        // Extract location data
        $city = $lockerDetails['city'] ?? '';
        $countyName = $lockerDetails['county_name'] ?? '';
        $countyCode = $lockerDetails['county_code'] ?? '';
        $zipCode = $lockerDetails['zip_code'] ?? '';
        $countryId = $lockerDetails['country_id'] ?? 1; // Default to Romania (ID 1) if not specified
        
        return self::create([
            'order_id' => $orderId,
            'type' => 'shipping',
            'first_name' => $customerFirstName,
            'last_name' => $customerLastName,
            'phone' => $customerPhone,
            'email' => null, // Email will be added separately if needed
            'address_line_1' => $addressLine1,
            'address_line_2' => null,
            'city' => $city,
            'county_name' => $countyName,
            'county_code' => $countyCode,
            'country_id' => $countryId,
            'zip_code' => $zipCode,
        ]);
    }

    /**
     * Create an OrderAddress from an array of address data (for guest checkout).
     * 
     * @param int $orderId The order ID
     * @param array $addressData Array containing address fields (first_name, last_name, phone, address_line_1, etc.)
     * @param string $type 'billing' or 'shipping'
     * @return OrderAddress
     */
    public static function createFromArray(int $orderId, array $addressData, string $type): OrderAddress
    {
        return self::create([
            'order_id' => $orderId,
            'type' => $type,
            'company_name' => $addressData['company_name'] ?? null,
            'fiscal_code' => $addressData['fiscal_code'] ?? null,
            'reg_number' => $addressData['reg_number'] ?? null,
            'first_name' => $addressData['first_name'] ?? '',
            'last_name' => $addressData['last_name'] ?? '',
            'phone' => $addressData['phone'] ?? '',
            'email' => $addressData['email'] ?? null,
            'address_line_1' => $addressData['address_line_1'] ?? '',
            'address_line_2' => $addressData['address_line_2'] ?? null,
            'city' => $addressData['city'] ?? '',
            'county_name' => $addressData['county_name'] ?? null,
            'county_code' => $addressData['county_code'] ?? null,
            'country_id' => $addressData['country_id'] ?? 1,
            'zip_code' => $addressData['zip_code'] ?? '',
        ]);
    }
}
