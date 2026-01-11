<?php

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderProduct;
use App\Models\ProductReturn;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReturnRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Public form, anyone can submit
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Dacă utilizatorul este autentificat, populează automat email-ul și telefonul
        if ($this->user()) {
            $user = $this->user();
            $customer = $user->customer;
            
            // Merge cu datele existente (nu suprascrie dacă sunt deja setate)
            $this->merge([
                'email' => $this->input('email') ?: $user->email,
                'phone' => $this->input('phone') ?: ($customer ? $customer->phone : null),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $user = $this->user();
        $isAuthenticated = $user !== null;
        
        $rules = [
            // Order and product IDs
            'order_id' => 'required|integer|exists:orders,id',
            'order_product_id' => 'required|integer|exists:order_products,id',
            
            // Informații despre comandă
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => $isAuthenticated ? 'nullable|email|max:255' : 'required|email|max:255',
            'phone' => $isAuthenticated ? 'nullable|string|max:255' : 'required|string|max:255',
            'order_number' => 'required|string|max:255',
            'order_date' => 'required|date',
            
            // Informații despre produs și motivul de returnare
            'product_name' => 'required|string|max:255',
            'product_sku' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'return_reason' => 'required|string|in:other,wrong_product,defect,order_error,sealed_return',
            'is_product_opened' => 'nullable|string|in:yes,no',
            'iban' => 'nullable|string|max:255',
        ];

        // Dacă motivul este "other" sau "defect", return_reason_details este obligatoriu
        if (in_array($this->input('return_reason'), ['other', 'defect'])) {
            $rules['return_reason_details'] = 'required|string|max:1000';
        } else {
            $rules['return_reason_details'] = 'nullable|string|max:1000';
        }

        return $rules;
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            // Honeypot check - if filled, it's a bot
            if ($this->filled('website')) {
                // Silently fail by adding a generic error
                $validator->errors()->add(
                    'order_id',
                    __('Invalid request.')
                );
                return;
            }

            // 1. Verificare status comandă - trebuie să fie DELIVERED
            $orderId = $this->input('order_id');
            $order = null;
            if ($orderId) {
                $order = Order::with('paymentMethod')->find($orderId);
                if ($order && $order->status !== OrderStatus::DELIVERED) {
                    $validator->errors()->add(
                        'order_id',
                        __('Return can only be requested for delivered orders.')
                    );
                }
            }
            
            // 2. Verificare IBAN - obligatoriu doar pentru ramburs
            if ($order && $order->paymentMethod) {
                $paymentMethodCode = strtolower($order->paymentMethod->code ?? '');
                $isRamburs = in_array($paymentMethodCode, ['ramburs', 'cod', 'cash_on_delivery']);
                $iban = $this->input('iban');
                
                if ($isRamburs && empty($iban)) {
                    $validator->errors()->add(
                        'iban',
                        __('IBAN is required for cash on delivery (ramburs) orders.')
                    );
                }
            }

            // 3. Verificare cantitate - trebuie să fie <= (cantitate comandată - cantitate deja returnată)
            $orderProductId = $this->input('order_product_id');
            $requestedQuantity = $this->input('quantity');
            
            if ($orderProductId && $requestedQuantity) {
                $orderProduct = OrderProduct::find($orderProductId);
                if ($orderProduct) {
                    $orderedQuantity = $orderProduct->quantity;
                    
                    // Calculează cantitatea deja returnată pentru acest order_product_id
                    $alreadyReturnedQuantity = ProductReturn::where('order_product_id', $orderProductId)
                        ->sum('quantity');
                    
                    $availableQuantity = $orderedQuantity - $alreadyReturnedQuantity;
                    
                    if ($requestedQuantity > $availableQuantity) {
                        $message = __('Cannot return more than available quantity. Ordered: :ordered, Already returned: :returned, Available: :available.', [
                            'ordered' => $orderedQuantity,
                            'returned' => $alreadyReturnedQuantity,
                            'available' => $availableQuantity,
                        ]);
                        $validator->errors()->add('quantity', $message);
                    }
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'first_name.required' => __('First name is required'),
            'last_name.required' => __('Last name is required'),
            'email.required' => __('Email is required'),
            'email.email' => __('Email must be a valid email address'),
            'phone.required' => __('Phone is required'),
            'order_number.required' => __('Order number is required'),
            'order_date.required' => __('Order date is required'),
            'order_date.date' => __('Order date must be a valid date'),
            'product_name.required' => __('Product name is required'),
            'product_sku.required' => __('Product SKU is required'),
            'quantity.required' => __('Quantity is required'),
            'quantity.integer' => __('Quantity must be a number'),
            'quantity.min' => __('Quantity must be at least 1'),
            'return_reason.required' => __('Return reason is required'),
            'return_reason.in' => __('Invalid return reason'),
            'return_reason_details.required' => __('Details are required for this return reason'),
            'is_product_opened.in' => __('Invalid value for product opened status'),
        ];
    }
}
