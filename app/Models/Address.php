<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'address_type',
        'is_preferred',
        'first_name',
        'last_name',
        'phone',
        'address_line_1',
        'address_line_2',
        'city',
        'county_name',
        'county_code',
        'country_id',
        'zip_code',
    ];

    /**
     * Get the customer that owns this address.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the country for this address.
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /**
     * Create an OrderAddress from this address.
     * Company fields (company_name, fiscal_code, reg_number) are copied from the customer.
     * 
     * @param int $orderId
     * @param string $type 'billing' or 'shipping'
     * @return OrderAddress
     */
    public function toOrderAddress(int $orderId, string $type): OrderAddress
    {
        // Ensure customer relationship is loaded
        $customer = $this->customer ?? $this->customer()->first();
        
        // Get email from user
        $user = $customer->users()->first();
        $email = $user ? $user->email : null;
        
        return OrderAddress::create([
            'order_id' => $orderId,
            'type' => $type,
            // Company fields from customer (if company type)
            'company_name' => $customer->customer_type === 'company' ? $customer->company_name : null,
            'fiscal_code' => $customer->customer_type === 'company' ? $customer->fiscal_code : null,
            'reg_number' => $customer->customer_type === 'company' ? $customer->reg_number : null,
            // Address fields from this address
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'phone' => $this->phone,
            'email' => $email,
            'address_line_1' => $this->address_line_1,
            'address_line_2' => $this->address_line_2,
            'city' => $this->city,
            'county_name' => $this->county_name,
            'county_code' => $this->county_code,
            'country_id' => $this->country_id,
            'zip_code' => $this->zip_code,
        ]);
    }
}
