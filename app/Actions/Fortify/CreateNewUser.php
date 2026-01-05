<?php

namespace App\Actions\Fortify;

use App\Models\Address;
use App\Models\Customer;
use App\Models\User;
use App\Services\ViesService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $customerType = $input['customer_type'] ?? 'individual';
        
        $validationRules = [
            'first_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\-]+$/'],
            'last_name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s\-]+$/'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'phone' => ['required', 'string', 'max:255'],
            'password' => $this->passwordRules(),
            'password_confirmation' => ['required', 'same:password'],
            'customer_type' => ['required', 'string', 'in:individual,company'],
        ];

        // Add B2B validation rules if company type
        if ($customerType === 'company') {
            $validationRules['company_name'] = ['required', 'string', 'min:3', 'max:255', 'regex:/^[a-zA-Z0-9\s\.,\-\&@"]+$/'];
            $validationRules['fiscal_code'] = [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($input) {
                    // Determine country code from country_id
                    $countryCode = 'RO'; // Default to Romania
                    if (isset($input['country_id'])) {
                        $country = \App\Models\Country::find($input['country_id']);
                        if ($country && $country->iso_code_2) {
                            $countryCode = $country->iso_code_2;
                        }
                    }
                    
                    $viesService = app(ViesService::class);
                    $result = $viesService->validate($value, $countryCode);
                    
                    if (!$result['valid']) {
                        $message = $result['message'] ?? 'CUI is invalid or not found in VIES system';
                        $fail($message);
                    }
                },
            ];
            $validationRules['reg_number'] = ['required', 'string', 'max:255'];
            $validationRules['bank_name'] = ['nullable', 'string', 'max:255'];
            $validationRules['iban'] = [
                'nullable',
                'string',
                'max:34',
                'regex:/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/',
            ];
            // Company headquarters address validation
            $validationRules['address_line_1'] = ['required', 'string', 'min:5', 'max:255'];
            $validationRules['address_line_2'] = ['nullable', 'string', 'min:5', 'max:255'];
            $validationRules['city'] = ['required', 'string', 'max:255'];
            $validationRules['county_name'] = ['nullable', 'string', 'max:255'];
            $validationRules['county_code'] = ['nullable', 'string', 'max:2'];
            $validationRules['country_id'] = ['required', 'integer', 'exists:countries,id'];
            $validationRules['zip_code'] = ['required', 'string', 'max:255'];
        }

        Validator::make($input, $validationRules)->validate();

        // Get customer group ID based on type
        $customerGroupId = null;
        if ($customerType === 'company') {
            // Get B2B_STANDARD group ID for companies
            $customerGroupId = DB::table('customer_groups')
                ->where('code', 'B2B_STANDARD')
                ->value('id');
        } else {
            // Get B2C group ID for individuals
            $customerGroupId = DB::table('customer_groups')
                ->where('code', 'B2C')
                ->value('id');
        }

        // Create customer data
        $customerData = [
            'customer_type' => $customerType,
            'customer_group_id' => $customerGroupId,
            'phone' => $input['phone'],
        ];

        // Add B2B fields if company type
        if ($customerType === 'company') {
            $customerData['company_name'] = $input['company_name'];
            $customerData['fiscal_code'] = $input['fiscal_code'];
            $customerData['reg_number'] = $input['reg_number'];
            $customerData['bank_name'] = $input['bank_name'] ?? null;
            $customerData['iban'] = isset($input['iban']) ? strtoupper(str_replace(' ', '', $input['iban'])) : null;
        }

        // Create customer first
        $customer = Customer::create($customerData);

        // Create user
        $user = User::create([
            'customer_id' => $customer->id,
            'email' => $input['email'],
            'password' => $input['password'],
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
        ]);

        // Create company headquarters address if company type
        if ($customerType === 'company') {
            Address::create([
                'customer_id' => $customer->id,
                'address_type' => 'headquarters',
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'phone' => $input['phone'],
                'address_line_1' => $input['address_line_1'],
                'address_line_2' => $input['address_line_2'] ?? null,
                'city' => $input['city'],
                'county_name' => $input['county_name'] ?? null,
                'county_code' => $input['county_code'] ?? null,
                'country_id' => $input['country_id'],
                'zip_code' => $input['zip_code'],
                'is_preferred' => false, // Headquarters address is not a shipping address
            ]);
        }

        // Send email verification notification
        $user->sendEmailVerificationNotification();

        return $user;
    }
}
