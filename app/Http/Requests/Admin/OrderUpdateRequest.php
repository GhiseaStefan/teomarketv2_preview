<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class OrderUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdminOrManager();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $action = $this->input('action');

        $rules = [
            'action' => 'required|string|in:add_product,update_quantity,remove_product,update_address,update_status',
        ];

        switch ($action) {
            case 'add_product':
                $rules['product_id'] = 'required|integer|exists:products,id';
                $rules['quantity'] = 'required|integer|min:1';
                $rules['custom_price_ron'] = 'nullable|numeric|min:0';
                break;

            case 'update_quantity':
                $rules['order_product_id'] = 'required|integer|exists:order_products,id';
                $rules['quantity'] = 'required|integer|min:1';
                break;

            case 'remove_product':
                $rules['order_product_id'] = 'required|integer|exists:order_products,id';
                break;

            case 'update_address':
                $rules['address_type'] = 'required|string|in:shipping,billing';
                $rules['first_name'] = 'required|string|max:255';
                $rules['last_name'] = 'required|string|max:255';
                $rules['phone'] = 'required|string|max:255';
                $rules['email'] = 'nullable|email|max:255';
                $rules['address_line_1'] = 'required|string|max:500';
                $rules['address_line_2'] = 'nullable|string|max:500';
                $rules['city'] = 'required|string|max:255';
                $rules['county_name'] = 'nullable|string|max:255';
                $rules['county_code'] = 'nullable|string|max:10';
                $rules['zip_code'] = 'required|string|max:20';
                $rules['country_id'] = 'required|integer|exists:countries,id';
                $rules['company_name'] = 'nullable|string|max:255';
                $rules['fiscal_code'] = 'nullable|string|max:255';
                $rules['reg_number'] = 'nullable|string|max:255';
                break;

            case 'update_status':
                $rules['status'] = 'required|string';
                break;
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'action.required' => 'Action is required',
            'action.in' => 'Invalid action. Must be one of: add_product, update_quantity, remove_product, update_address, update_status',
            'product_id.required' => 'Product ID is required',
            'product_id.exists' => 'Product not found',
            'quantity.required' => 'Quantity is required',
            'quantity.min' => 'Quantity must be at least 1',
            'order_product_id.required' => 'Order product ID is required',
            'order_product_id.exists' => 'Order product not found',
            'address_type.required' => 'Address type is required',
            'address_type.in' => 'Address type must be shipping or billing',
            'first_name.required' => 'First name is required',
            'last_name.required' => 'Last name is required',
            'phone.required' => 'Phone is required',
            'email.email' => 'Email must be a valid email address',
            'address_line_1.required' => 'Address line 1 is required',
            'city.required' => 'City is required',
            'zip_code.required' => 'ZIP code is required',
            'country_id.required' => 'Country is required',
            'country_id.exists' => 'Country not found',
            'status.required' => 'Status is required',
        ];
    }
}
