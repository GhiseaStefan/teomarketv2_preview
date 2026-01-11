<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderBatchUpdateRequest extends FormRequest
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
        return [
            'changes' => 'required|array|min:1',
            'originalUpdatedAt' => 'nullable|string',
            'changes.*.type' => [
                'required',
                'string',
                Rule::in(['add_product', 'update_quantity', 'remove_product', 'update_address', 'update_status', 'update_payment_status']),
            ],
            // Add product validation
            'changes.*.product_id' => 'required_if:changes.*.type,add_product|integer|exists:products,id',
            'changes.*.quantity' => 'required_if:changes.*.type,add_product|required_if:changes.*.type,update_quantity|integer|min:1',
            'changes.*.custom_price_ron' => 'nullable|numeric|min:0',
            // Update/Remove product validation
            'changes.*.order_product_id' => 'required_if:changes.*.type,update_quantity|required_if:changes.*.type,remove_product|integer|exists:order_products,id',
            // Address validation
            'changes.*.address_type' => 'required_if:changes.*.type,update_address|string|in:shipping,billing',
            'changes.*.first_name' => 'required_if:changes.*.type,update_address|string|max:255',
            'changes.*.last_name' => 'required_if:changes.*.type,update_address|string|max:255',
            'changes.*.phone' => 'required_if:changes.*.type,update_address|string|max:255',
            'changes.*.email' => 'nullable|email|max:255',
            'changes.*.address_line_1' => 'required_if:changes.*.type,update_address|string|max:500',
            'changes.*.address_line_2' => 'nullable|string|max:500',
            'changes.*.city' => 'required_if:changes.*.type,update_address|string|max:255',
            'changes.*.county_name' => 'nullable|string|max:255',
            'changes.*.county_code' => 'nullable|string|max:10',
            'changes.*.zip_code' => 'required_if:changes.*.type,update_address|string|max:20',
            'changes.*.country_id' => 'required_if:changes.*.type,update_address|integer|exists:countries,id',
            'changes.*.company_name' => 'nullable|string|max:255',
            'changes.*.fiscal_code' => 'nullable|string|max:255',
            'changes.*.reg_number' => 'nullable|string|max:255',
            // Status validation
            'changes.*.status' => 'required_if:changes.*.type,update_status|string',
            // Payment status validation
            'changes.*.is_paid' => 'required_if:changes.*.type,update_payment_status|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'changes.required' => 'At least one change is required',
            'changes.array' => 'Changes must be an array',
            'changes.min' => 'At least one change is required',
            'changes.*.type.required' => 'Each change must have a type',
            'changes.*.type.in' => 'Invalid change type',
            'changes.*.product_id.required_if' => 'Product ID is required for add_product action',
            'changes.*.product_id.exists' => 'Product not found',
            'changes.*.quantity.required_if' => 'Quantity is required',
            'changes.*.quantity.min' => 'Quantity must be at least 1',
            'changes.*.order_product_id.required_if' => 'Order product ID is required',
            'changes.*.order_product_id.exists' => 'Order product not found',
            'changes.*.address_type.required_if' => 'Address type is required',
            'changes.*.address_type.in' => 'Address type must be shipping or billing',
            'changes.*.first_name.required_if' => 'First name is required',
            'changes.*.last_name.required_if' => 'Last name is required',
            'changes.*.phone.required_if' => 'Phone is required',
            'changes.*.email.email' => 'Email must be a valid email address',
            'changes.*.address_line_1.required_if' => 'Address line 1 is required',
            'changes.*.city.required_if' => 'City is required',
            'changes.*.zip_code.required_if' => 'ZIP code is required',
            'changes.*.country_id.required_if' => 'Country is required',
            'changes.*.country_id.exists' => 'Country not found',
            'changes.*.status.required_if' => 'Status is required',
        ];
    }
}
