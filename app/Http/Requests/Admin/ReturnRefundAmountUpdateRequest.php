<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReturnRefundAmountUpdateRequest extends FormRequest
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
            'refund_amount' => [
                'nullable',
                'numeric',
                'min:0',
                'max:999999999.99',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'refund_amount.numeric' => 'Refund amount must be a number',
            'refund_amount.min' => 'Refund amount cannot be negative',
            'refund_amount.max' => 'Refund amount is too large',
        ];
    }
}
