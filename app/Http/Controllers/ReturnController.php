<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReturnRequest;
use App\Http\Requests\SearchOrderRequest;
use App\Enums\ReturnStatus;
use App\Models\Order;
use App\Models\ProductReturn;
use App\Services\ReturnCodeGenerator;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class ReturnController extends Controller
{
    protected ReturnCodeGenerator $codeGenerator;

    public function __construct(ReturnCodeGenerator $codeGenerator)
    {
        $this->codeGenerator = $codeGenerator;
    }

    /**
     * Show the form for creating a new return.
     */
    public function create(Request $request): Response
    {
        $order = $request->session()->get('order');
        
        return Inertia::render('returns/create', [
            'order' => $order,
        ]);
    }

    /**
     * Search for an order by order number and email/phone.
     */
    public function searchOrder(Request $request)
    {
        // Honeypot check - if filled, it's a bot
        if ($request->filled('website')) {
            // Silently fail to avoid alerting bots
            return back()->withErrors([
                'message' => __('Order not found'),
            ]);
        }

        $user = $request->user();
        $isAuthenticated = $user !== null;
        
        // Dacă utilizatorul este autentificat, nu mai este nevoie de email/phone
        if ($isAuthenticated) {
            $request->validate([
                'order_number' => 'required|string',
            ]);
        } else {
            $request->validate([
                'order_number' => 'required|string',
                'email' => 'required_without:phone|nullable|email',
                'phone' => 'required_without:email|nullable|string',
            ]);
        }

        $orderNumber = $request->input('order_number');
        $email = $request->input('email') ?: null;
        $phone = $request->input('phone') ?: null;

        // Find order by order number
        $order = Order::with([
            'products.product.images',
            'shippingAddress',
            'billingAddress',
            'customer.users',
            'paymentMethod',
        ])
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return back()->withErrors([
                'message' => __('Order not found'),
            ]);
        }

        // Dacă utilizatorul este autentificat, verifică dacă comanda îi aparține
        if ($isAuthenticated && $user->customer) {
            if ($order->customer_id !== $user->customer->id) {
                return back()->withErrors([
                    'message' => __('This order does not belong to your account'),
                ]);
            }
            // Skip email/phone verification for authenticated users
        } else {
            // Verify email or phone matches (pentru utilizatorii neautentificați)
            $emailMatches = false;
            $phoneMatches = false;

            // Check shipping address email/phone
            if ($order->shippingAddress) {
                if ($email && $order->shippingAddress->email) {
                    if (strtolower(trim($order->shippingAddress->email)) === strtolower(trim($email))) {
                        $emailMatches = true;
                    }
                }
                if ($phone && $order->shippingAddress->phone) {
                    // Normalize phone numbers (remove spaces, dashes, etc.)
                    $normalizedOrderPhone = preg_replace('/[^0-9+]/', '', $order->shippingAddress->phone);
                    $normalizedInputPhone = preg_replace('/[^0-9+]/', '', $phone);
                    if ($normalizedOrderPhone === $normalizedInputPhone) {
                        $phoneMatches = true;
                    }
                }
            }

            // Check billing address email/phone
            if ($order->billingAddress) {
                if ($email && $order->billingAddress->email) {
                    if (strtolower(trim($order->billingAddress->email)) === strtolower(trim($email))) {
                        $emailMatches = true;
                    }
                }
                if ($phone && $order->billingAddress->phone) {
                    $normalizedOrderPhone = preg_replace('/[^0-9+]/', '', $order->billingAddress->phone);
                    $normalizedInputPhone = preg_replace('/[^0-9+]/', '', $phone);
                    if ($normalizedOrderPhone === $normalizedInputPhone) {
                        $phoneMatches = true;
                    }
                }
            }

            // Check customer users email
            if ($order->customer && $order->customer->users) {
                foreach ($order->customer->users as $orderUser) {
                    if ($email && $orderUser->email) {
                        if (strtolower(trim($orderUser->email)) === strtolower(trim($email))) {
                            $emailMatches = true;
                        }
                    }
                }
            }

            // Check customer phone if no phone in addresses
            if ($phone && $order->customer && $order->customer->phone) {
                $normalizedOrderPhone = preg_replace('/[^0-9+]/', '', $order->customer->phone);
                $normalizedInputPhone = preg_replace('/[^0-9+]/', '', $phone);
                if ($normalizedOrderPhone === $normalizedInputPhone) {
                    $phoneMatches = true;
                }
            }

            if (!$emailMatches && !$phoneMatches) {
                return back()->withErrors([
                    'message' => __('Email or phone does not match the order'),
                ]);
            }
        }

        // Format order data for frontend
        $shippingAddress = $order->shippingAddress;
        $customer = $order->customer;
        $user = $customer ? $customer->users->first() : null;

        $paymentMethod = $order->paymentMethod;
        $paymentMethodCode = $paymentMethod ? strtolower($paymentMethod->code ?? '') : '';
        $isRamburs = in_array($paymentMethodCode, ['ramburs', 'cod', 'cash_on_delivery']);
        
        $orderData = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_date' => $order->created_at->format('Y-m-d'),
            'payment_method_code' => $paymentMethodCode,
            'is_ramburs' => $isRamburs,
            'first_name' => $shippingAddress?->first_name ?? $user?->first_name ?? '',
            'last_name' => $shippingAddress?->last_name ?? $user?->last_name ?? '',
            'email' => $shippingAddress?->email ?? $user?->email ?? '',
            'phone' => $shippingAddress?->phone ?? $customer?->phone ?? '',
            'products' => $order->products->map(function ($orderProduct) {
                $product = $orderProduct->product;
                // Get product image - prefer main_image_url, fallback to first product image
                $imageUrl = null;
                if ($product) {
                    if ($product->main_image_url) {
                        $imageUrl = $product->main_image_url;
                    } elseif ($product->images && $product->images->count() > 0) {
                        $imageUrl = $product->images->first()->image_url;
                    }
                }
                
                return [
                    'id' => $orderProduct->id,
                    'product_id' => $orderProduct->product_id,
                    'name' => $orderProduct->name,
                    'sku' => $orderProduct->sku,
                    'quantity' => $orderProduct->quantity,
                    'image_url' => $imageUrl,
                ];
            }),
        ];

        $request->session()->flash('order', $orderData);
        
        return redirect()->route('returns.create');
    }

    /**
     * Store a newly created return.
     */
    public function store(ReturnRequest $request)
    {
        $validated = $request->validated();
        $user = $request->user();
        
        // Dacă utilizatorul este autentificat, folosește email-ul și telefonul din cont
        $email = $validated['email'] ?? ($user ? $user->email : null);
        $phone = $validated['phone'] ?? ($user && $user->customer ? $user->customer->phone : null);
        
        // Generate temporary return number (will be replaced with real one after ID is created)
        $tempReturnNumber = 'TEMP-RET-' . time() . '-' . strtoupper(substr(uniqid(), -6));
        
        // Create the return record
        $return = ProductReturn::create([
            'order_id' => $validated['order_id'],
            'order_product_id' => $validated['order_product_id'],
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $email,
            'phone' => $phone,
            'return_number' => $tempReturnNumber,
            'order_number' => $validated['order_number'],
            'order_date' => $validated['order_date'],
            'product_name' => $validated['product_name'],
            'product_sku' => $validated['product_sku'],
            'quantity' => $validated['quantity'],
            'return_reason' => $validated['return_reason'],
            'return_reason_details' => $validated['return_reason_details'] ?? null,
            'is_product_opened' => $validated['is_product_opened'] ?? null,
            'iban' => $validated['iban'] ?? null,
            'status' => ReturnStatus::PENDING,
        ]);

        // Generate return number from return ID using ReturnCodeGenerator
        $returnNumber = $this->codeGenerator->generateFromId($return->id);
        $return->return_number = $returnNumber;
        $return->save();
        
        // Store return ID in session for confirmation page
        $request->session()->flash('return_id', $return->id);
        
        return redirect()->route('returns.confirmation');
    }

    /**
     * Show the return confirmation page.
     */
    public function confirmation(Request $request): Response
    {
        // Get return ID from session flash (one-time use)
        $returnId = $request->session()->get('return_id');

        if (!$returnId) {
            // If no return_id in session, redirect to create page
            return redirect()->route('returns.create');
        }

        // Load return with relationships
        $return = ProductReturn::with(['order', 'orderProduct'])
            ->find($returnId);

        if (!$return) {
            return redirect()->route('returns.create');
        }

        return Inertia::render('returns/confirmation', [
            'return' => [
                'id' => $return->id,
                'return_number' => $return->return_number,
                'order_number' => $return->order_number,
                'product_name' => $return->product_name,
                'product_sku' => $return->product_sku,
                'quantity' => $return->quantity,
                'created_at' => $return->created_at->format('Y-m-d H:i:s'),
            ],
        ]);
    }
}
