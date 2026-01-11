<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderUpdateRequest;
use App\Http\Requests\Admin\OrderBatchUpdateRequest;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ShippingMethod;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrdersController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }
    /**
     * Display a listing of orders.
     */
    public function index(Request $request): Response
    {
        $filter = $request->get('filter', 'all');
        $search = $request->get('search', '');
        $customerId = $request->get('customer_id');

        // Advanced filters
        $paymentStatus = $request->get('payment_status');
        $orderStatus = $request->get('order_status');
        $paymentMethodId = $request->get('payment_method_id');
        $shippingMethodId = $request->get('shipping_method_id');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $amountMin = $request->get('amount_min');
        $amountMax = $request->get('amount_max');
        $city = $request->get('city');
        $hasInvoice = $request->get('has_invoice');

        $query = Order::with([
            'paymentMethod',
            'shipping.shippingMethod',
            'shippingAddress',
            'products' => function ($query) {
                $query->select('order_id', 'name', 'quantity');
            }
        ])->orderBy('created_at', 'desc');

        // Filter by customer if provided
        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        // Filter by payment status
        if ($paymentStatus !== null && $paymentStatus !== '') {
            if ($paymentStatus === 'paid' || $paymentStatus === '1' || $paymentStatus === true || $paymentStatus === 'true') {
                $query->where('is_paid', true);
            } elseif ($paymentStatus === 'unpaid' || $paymentStatus === '0' || $paymentStatus === false || $paymentStatus === 'false') {
                $query->where('is_paid', false);
            }
        }

        // Filter by order status
        if ($orderStatus !== null && $orderStatus !== '') {
            try {
                $statusEnum = OrderStatus::from($orderStatus);
                $query->where('status', $statusEnum->value);
            } catch (\ValueError $e) {
                // Invalid status value, ignore filter
            }
        }

        // Filter by payment method
        if ($paymentMethodId) {
            $query->where('payment_method_id', $paymentMethodId);
        }

        // Filter by shipping method
        if ($shippingMethodId) {
            $query->whereHas('shipping', function ($q) use ($shippingMethodId) {
                $q->where('shipping_method_id', $shippingMethodId);
            });
        }

        // Filter by date range
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Filter by amount range
        if ($amountMin !== null && $amountMin !== '') {
            $query->where('total_ron_incl_vat', '>=', (float) $amountMin);
        }
        if ($amountMax !== null && $amountMax !== '') {
            $query->where('total_ron_incl_vat', '<=', (float) $amountMax);
        }

        // Filter by city
        if ($city) {
            $query->whereHas('shippingAddress', function ($q) use ($city) {
                $q->where('city', 'like', "%{$city}%");
            });
        }

        // Filter by invoice status
        if ($hasInvoice !== null && $hasInvoice !== '') {
            if ($hasInvoice === 'yes' || $hasInvoice === '1' || $hasInvoice === true || $hasInvoice === 'true') {
                $query->whereNotNull('invoice_number')->where('invoice_number', '!=', '');
            } elseif ($hasInvoice === 'no' || $hasInvoice === '0' || $hasInvoice === false || $hasInvoice === 'false') {
                $query->where(function ($q) {
                    $q->whereNull('invoice_number')->orWhere('invoice_number', '');
                });
            }
        }

        // Apply filters based on status enum
        switch ($filter) {
            case 'new':
                // NOI (De Procesat): Pending, Awaiting Payment, Confirmed, Processing
                $query->whereIn('status', [
                    OrderStatus::PENDING->value,
                    OrderStatus::AWAITING_PAYMENT->value,
                    OrderStatus::CONFIRMED->value,
                    OrderStatus::PROCESSING->value,
                ]);
                break;
            case 'in_delivery':
                // ÎN LIVRARE (La Curier): Shipped
                $query->where('status', OrderStatus::SHIPPED->value);
                break;
            case 'completed':
                // FINALIZATE (Succes): Delivered
                $query->where('status', OrderStatus::DELIVERED->value);
                break;
            case 'problems':
                // PROBLEME / ANULATE: Cancelled, Refunded
                $query->whereIn('status', [
                    OrderStatus::CANCELLED->value,
                    OrderStatus::REFUNDED->value,
                ]);
                break;
            case 'all':
            default:
                // Toate comenzile
                break;
        }

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('shippingAddress', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%");
                    });
            });
        }

        $orders = $query->paginate(50)->appends($request->only([
            'filter',
            'search',
            'customer_id',
            'payment_status',
            'order_status',
            'payment_method_id',
            'shipping_method_id',
            'date_from',
            'date_to',
            'amount_min',
            'amount_max',
            'city',
            'has_invoice',
        ]));

        // Get payment methods for filter dropdown
        $paymentMethods = PaymentMethod::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                ];
            });

        // Get shipping methods for filter dropdown
        $shippingMethods = ShippingMethod::orderBy('name')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                ];
            });

        // Get unique cities for filter dropdown
        $cities = DB::table('order_addresses')
            ->where('type', 'shipping')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->select('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city')
            ->filter()
            ->values();

        // Format orders for frontend
        $formattedOrders = $orders->getCollection()->map(function ($order) {
            $shippingAddress = $order->shippingAddress;
            $shipping = $order->shipping;
            $shippingMethod = $shipping?->shippingMethod;

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $order->created_at->format('d.m.Y H:i'),
                'client_name' => $shippingAddress
                    ? trim(($shippingAddress->first_name ?? '') . ' ' . ($shippingAddress->last_name ?? ''))
                    : 'N/A',
                'client_city' => $shippingAddress?->city ?? 'N/A',
                'status' => [
                    'value' => $order->status->value,
                    'name' => $order->status->label(), // Send translation key, translate in frontend
                    'color' => $order->status->colorCode(),
                ],
                'payment' => [
                    'method' => $order->paymentMethod?->name ?? 'N/A',
                    'total' => number_format(
                        ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0),
                        2,
                        '.',
                        ''
                    ) . ' RON',
                    'is_paid' => $order->is_paid ?? false,
                    'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                    'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
                ],
                'shipping' => [
                    'tracking_number' => $shipping?->tracking_number,
                    'method_name' => $shippingMethod?->name ?? 'N/A',
                    'method_type' => $shippingMethod?->type?->value ?? null,
                    'has_tracking' => !empty($shipping?->tracking_number),
                    'is_pickup' => $this->isPickupPoint($shipping, $shippingMethod),
                ],
                'products_count' => $order->products->count(),
                'products_summary' => $this->getProductsSummary($order->products),
            ];
        });

        return Inertia::render('admin/orders', [
            'orders' => $formattedOrders,
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
            'filters' => [
                'filter' => $filter,
                'search' => $search,
                'customer_id' => $customerId,
                'payment_status' => $paymentStatus,
                'order_status' => $orderStatus,
                'payment_method_id' => $paymentMethodId,
                'shipping_method_id' => $shippingMethodId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'amount_min' => $amountMin,
                'amount_max' => $amountMax,
                'city' => $city,
                'has_invoice' => $hasInvoice,
            ],
            'paymentMethods' => $paymentMethods,
            'shippingMethods' => $shippingMethods,
            'orderStatuses' => OrderStatus::all(),
            'cities' => $cities,
        ]);
    }

    /**
     * Display the specified order.
     */
    public function show(string $orderNumber): Response
    {
        $order = Order::with([
            'customer.users',
            'paymentMethod',
            'shipping.shippingMethod',
            'shippingAddress.country',
            'billingAddress.country',
            'products.product.images',
            'history.user',
        ])->where('order_number', $orderNumber)->firstOrFail();

        $shipping = $order->shipping;
        $shippingMethod = $shipping?->shippingMethod;

        // Build customer name
        $customerName = null;
        if ($order->customer) {
            if ($order->customer->customer_type === 'company' && $order->customer->company_name) {
                $customerName = $order->customer->company_name;
            } else {
                $user = $order->customer->users->first();
                if ($user) {
                    $customerName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
                }
            }
        }

        // Format order for frontend
        $formattedOrder = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_series' => $order->invoice_series,
            'invoice_number' => $order->invoice_number,
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'created_at_formatted' => $order->created_at->format('d.m.Y H:i'),
            'status' => [
                'value' => $order->status->value,
                'name' => $order->status->label(), // Send translation key, translate in frontend
                'color' => $order->status->colorCode(),
            ],
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'email' => $order->customer->users->first()?->email ?? null,
                'name' => $customerName ?: 'N/A',
            ] : null,
            'shipping_address' => $order->shippingAddress ? [
                'first_name' => $order->shippingAddress->first_name,
                'last_name' => $order->shippingAddress->last_name,
                'company_name' => $order->shippingAddress->company_name,
                'phone' => $order->shippingAddress->phone,
                'email' => $order->shippingAddress->email,
                'address_line_1' => $order->shippingAddress->address_line_1,
                'address_line_2' => $order->shippingAddress->address_line_2,
                'city' => $order->shippingAddress->city,
                'county_name' => $order->shippingAddress->county_name,
                'county_code' => $order->shippingAddress->county_code,
                'zip_code' => $order->shippingAddress->zip_code,
                'country_id' => $order->shippingAddress->country_id,
                'country_name' => $order->shippingAddress->country?->name ?? null,
            ] : null,
            'billing_address' => $order->billingAddress ? [
                'first_name' => $order->billingAddress->first_name,
                'last_name' => $order->billingAddress->last_name,
                'company_name' => $order->billingAddress->company_name,
                'fiscal_code' => $order->billingAddress->fiscal_code,
                'reg_number' => $order->billingAddress->reg_number,
                'phone' => $order->billingAddress->phone,
                'email' => $order->billingAddress->email,
                'address_line_1' => $order->billingAddress->address_line_1,
                'address_line_2' => $order->billingAddress->address_line_2,
                'city' => $order->billingAddress->city,
                'county_name' => $order->billingAddress->county_name,
                'county_code' => $order->billingAddress->county_code,
                'zip_code' => $order->billingAddress->zip_code,
                'country_id' => $order->billingAddress->country_id,
                'country_name' => $order->billingAddress->country?->name ?? null,
            ] : null,
            'payment' => [
                'method' => $order->paymentMethod?->name ?? 'N/A',
                'method_code' => $order->paymentMethod?->code ?? null,
                'is_paid' => $order->is_paid ?? false,
                'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
            ],
            'shipping' => [
                'method_name' => $shippingMethod?->name ?? 'N/A',
                'method_type' => $shippingMethod?->type?->value ?? null,
                'tracking_number' => $shipping?->tracking_number,
                'title' => $shipping?->title,
                'shipping_cost_excl_vat' => number_format($shipping?->shipping_cost_excl_vat ?? 0, 2, '.', ''),
                'shipping_cost_incl_vat' => number_format($shipping?->shipping_cost_incl_vat ?? 0, 2, '.', ''),
                'shipping_cost_ron_excl_vat' => number_format($shipping?->shipping_cost_ron_excl_vat ?? 0, 2, '.', ''),
                'shipping_cost_ron_incl_vat' => number_format($shipping?->shipping_cost_ron_incl_vat ?? 0, 2, '.', ''),
                'is_pickup' => $this->isPickupPoint($shipping, $shippingMethod),
                'courier_data' => $shipping?->courier_data ?? null,
            ],
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
                    'name' => $orderProduct->name,
                    'sku' => $orderProduct->sku,
                    'ean' => $orderProduct->ean,
                    'quantity' => $orderProduct->quantity,
                    'image_url' => $imageUrl,
                    'unit_price_currency' => number_format($orderProduct->unit_price_currency ?? 0, 2, '.', ''),
                    'unit_price_ron' => number_format($orderProduct->unit_price_ron ?? 0, 2, '.', ''),
                    'total_currency_excl_vat' => number_format($orderProduct->total_currency_excl_vat ?? 0, 2, '.', ''),
                    'total_currency_incl_vat' => number_format($orderProduct->total_currency_incl_vat ?? 0, 2, '.', ''),
                    'total_ron_excl_vat' => number_format($orderProduct->total_ron_excl_vat ?? 0, 2, '.', ''),
                    'total_ron_incl_vat' => number_format($orderProduct->total_ron_incl_vat ?? 0, 2, '.', ''),
                    'vat_percent' => $orderProduct->vat_percent,
                ];
            }),
            'totals' => [
                'subtotal_excl_vat' => number_format($order->total_excl_vat ?? 0, 2, '.', ''),
                'subtotal_incl_vat' => number_format($order->total_incl_vat ?? 0, 2, '.', ''),
                'total_ron_excl_vat' => number_format($order->total_ron_excl_vat ?? 0, 2, '.', ''),
                'total_ron_incl_vat' => number_format($order->total_ron_incl_vat ?? 0, 2, '.', ''),
                'vat_rate' => $order->vat_rate_applied ?? 0,
                'currency' => $order->currency ?? 'RON',
                'exchange_rate' => $order->exchange_rate ?? 1,
            ],
            'history' => $order->history->map(function ($history) {
                return [
                    'id' => $history->id,
                    'action' => $history->action,
                    'description' => $history->description,
                    'old_value' => $history->old_value,
                    'new_value' => $history->new_value,
                    'created_at' => $history->created_at->format('Y-m-d H:i:s'),
                    'created_at_formatted' => $history->created_at->format('d.m.Y H:i'),
                    'user' => $history->user ? [
                        'id' => $history->user->id,
                        'name' => trim(($history->user->first_name ?? '') . ' ' . ($history->user->last_name ?? '')),
                        'email' => $history->user->email,
                    ] : null,
                ];
            })->sortByDesc('created_at')->values(),
        ];

        return Inertia::render('admin/orders/show', [
            'order' => $formattedOrder,
        ]);
    }

    /**
     * Get products summary for an order.
     */
    private function getProductsSummary($products): string
    {
        if ($products->isEmpty()) {
            return '0 produse';
        }

        $count = $products->count();
        $totalQuantity = $products->sum('quantity');

        if ($count === 1) {
            return $products->first()->name;
        }

        if ($count <= 3) {
            return $products->take(3)->pluck('name')->join(', ');
        }

        return $products->first()->name . ' + ' . ($count - 1) . ' altele';
    }

    /**
     * Check if shipping is a pickup point/locker.
     */
    private function isPickupPoint($shipping, $shippingMethod): bool
    {
        if (!$shipping) {
            return false;
        }

        // Check if shipping method type is pickup
        if ($shippingMethod && $shippingMethod->type) {
            $typeValue = $shippingMethod->type instanceof \BackedEnum
                ? $shippingMethod->type->value
                : $shippingMethod->type;

            if ($typeValue === 'pickup') {
                return true;
            }
        }

        // Check if has pickup_point_id
        if (!empty($shipping->pickup_point_id)) {
            return true;
        }

        // Check courier_data for pickup point indicators
        if ($shipping->courier_data) {
            $courierData = is_array($shipping->courier_data)
                ? $shipping->courier_data
                : json_decode($shipping->courier_data, true);

            if (is_array($courierData)) {
                // Check for common pickup point indicators
                if (
                    isset($courierData['point_id']) ||
                    isset($courierData['pickup_point_id']) ||
                    isset($courierData['locker_id']) ||
                    (isset($courierData['type']) && in_array(strtolower($courierData['type']), ['locker', 'pickup', 'pickup_point']))
                ) {
                    return true;
                }
            }
        }

        // Check method name for pickup indicators
        if ($shippingMethod && $shippingMethod->name) {
            $methodName = strtolower($shippingMethod->name);
            if (
                str_contains($methodName, 'easybox') ||
                str_contains($methodName, 'locker') ||
                str_contains($methodName, 'pickup') ||
                str_contains($methodName, 'punct')
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Mark an order as paid.
     */
    public function markAsPaid(string $orderNumber): \Illuminate\Http\JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        if ($order->isPaid()) {
            return response()->json([
                'message' => 'Order is already marked as paid.',
                'order' => [
                    'is_paid' => $order->is_paid,
                    'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                ],
            ], 400);
        }

        $result = $order->markAsPaid(Auth::id());

        if ($result) {
            return response()->json([
                'message' => 'Order marked as paid successfully.',
                'order' => [
                    'is_paid' => $order->is_paid,
                    'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                    'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Failed to mark order as paid.',
        ], 500);
    }

    /**
     * Mark an order as unpaid.
     */
    public function markAsUnpaid(string $orderNumber): \Illuminate\Http\JsonResponse
    {
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        if (!$order->isPaid()) {
            return response()->json([
                'message' => 'Order is already marked as unpaid.',
                'order' => [
                    'is_paid' => $order->is_paid,
                    'paid_at' => null,
                ],
            ], 400);
        }

        $result = $order->markAsUnpaid(Auth::id());

        if ($result) {
            return response()->json([
                'message' => 'Order marked as unpaid successfully.',
                'order' => [
                    'is_paid' => $order->is_paid,
                    'paid_at' => null,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Failed to mark order as unpaid.',
        ], 500);
    }

    /**
     * Display the order edit page.
     */
    public function edit(string $orderNumber): Response
    {
        $order = Order::with([
            'customer.users',
            'customer.customerGroup',
            'paymentMethod',
            'shipping.shippingMethod',
            'shippingAddress.country',
            'billingAddress.country',
            'products.product.images',
            'history.user',
        ])->where('order_number', $orderNumber)->firstOrFail();

        // Format order same as show method but include additional data for editing
        $shipping = $order->shipping;
        $shippingMethod = $shipping?->shippingMethod;

        // Build customer name
        $customerName = null;
        if ($order->customer) {
            if ($order->customer->customer_type === 'company' && $order->customer->company_name) {
                $customerName = $order->customer->company_name;
            } else {
                $user = $order->customer->users->first();
                if ($user) {
                    $customerName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
                }
            }
        }

        // Get all products for product search
        $products = Product::where('status', true)
            ->with(['images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])
            ->orderBy('name')
            ->get()
            ->map(function ($product) {
                $imageUrl = null;
                if ($product->main_image_url) {
                    $imageUrl = $product->main_image_url;
                } elseif ($product->images && $product->images->count() > 0) {
                    $imageUrl = $product->images->first()->image_url;
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'ean' => $product->ean,
                    'price_ron' => (float) $product->price_ron,
                    'stock_quantity' => $product->stock_quantity,
                    'image_url' => $imageUrl,
                ];
            });

        // Format order for frontend (same structure as show)
        $formattedOrder = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_series' => $order->invoice_series,
            'invoice_number' => $order->invoice_number,
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'created_at_formatted' => $order->created_at->format('d.m.Y H:i'),
            'status' => [
                'value' => $order->status->value,
                'name' => $order->status->label(),
                'color' => $order->status->colorCode(),
            ],
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'email' => $order->customer->users->first()?->email ?? null,
                'name' => $customerName ?: 'N/A',
                'customer_group_id' => $order->customer->customer_group_id ?? null,
                'customer_group_code' => $order->customer->customerGroup?->code ?? null,
                'is_b2c' => $order->customer->customerGroup && $order->customer->customerGroup->code === 'B2C',
            ] : null,
            'shipping_address' => $order->shippingAddress ? [
                'id' => $order->shippingAddress->id,
                'first_name' => $order->shippingAddress->first_name,
                'last_name' => $order->shippingAddress->last_name,
                'company_name' => $order->shippingAddress->company_name,
                'phone' => $order->shippingAddress->phone,
                'email' => $order->shippingAddress->email,
                'address_line_1' => $order->shippingAddress->address_line_1,
                'address_line_2' => $order->shippingAddress->address_line_2,
                'city' => $order->shippingAddress->city,
                'county_name' => $order->shippingAddress->county_name,
                'county_code' => $order->shippingAddress->county_code,
                'zip_code' => $order->shippingAddress->zip_code,
                'country_id' => $order->shippingAddress->country_id,
                'country_name' => $order->shippingAddress->country?->name ?? null,
            ] : null,
            'billing_address' => $order->billingAddress ? [
                'id' => $order->billingAddress->id,
                'first_name' => $order->billingAddress->first_name,
                'last_name' => $order->billingAddress->last_name,
                'company_name' => $order->billingAddress->company_name,
                'fiscal_code' => $order->billingAddress->fiscal_code,
                'reg_number' => $order->billingAddress->reg_number,
                'phone' => $order->billingAddress->phone,
                'email' => $order->billingAddress->email,
                'address_line_1' => $order->billingAddress->address_line_1,
                'address_line_2' => $order->billingAddress->address_line_2,
                'city' => $order->billingAddress->city,
                'county_name' => $order->billingAddress->county_name,
                'county_code' => $order->billingAddress->county_code,
                'zip_code' => $order->billingAddress->zip_code,
                'country_id' => $order->billingAddress->country_id,
                'country_name' => $order->billingAddress->country?->name ?? null,
            ] : null,
            'payment' => [
                'method' => $order->paymentMethod?->name ?? 'N/A',
                'method_code' => $order->paymentMethod?->code ?? null,
                'is_paid' => $order->is_paid ?? false,
                'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
            ],
            'shipping' => [
                'method_name' => $shippingMethod?->name ?? 'N/A',
                'method_type' => $shippingMethod?->type?->value ?? null,
                'tracking_number' => $shipping?->tracking_number,
                'title' => $shipping?->title,
                'shipping_cost_excl_vat' => number_format($shipping?->shipping_cost_excl_vat ?? 0, 2, '.', ''),
                'shipping_cost_incl_vat' => number_format($shipping?->shipping_cost_incl_vat ?? 0, 2, '.', ''),
                'shipping_cost_ron_excl_vat' => number_format($shipping?->shipping_cost_ron_excl_vat ?? 0, 2, '.', ''),
                'shipping_cost_ron_incl_vat' => number_format($shipping?->shipping_cost_ron_incl_vat ?? 0, 2, '.', ''),
                'is_pickup' => $this->isPickupPoint($shipping, $shippingMethod),
                'courier_data' => $shipping?->courier_data ?? null,
            ],
            'products' => $order->products->map(function ($orderProduct) {
                $product = $orderProduct->product;
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
                    'ean' => $orderProduct->ean,
                    'quantity' => $orderProduct->quantity,
                    'image_url' => $imageUrl,
                    'unit_price_currency' => number_format($orderProduct->unit_price_currency ?? 0, 2, '.', ''),
                    'unit_price_ron' => number_format($orderProduct->unit_price_ron ?? 0, 2, '.', ''),
                    'total_currency_excl_vat' => number_format($orderProduct->total_currency_excl_vat ?? 0, 2, '.', ''),
                    'total_currency_incl_vat' => number_format($orderProduct->total_currency_incl_vat ?? 0, 2, '.', ''),
                    'total_ron_excl_vat' => number_format($orderProduct->total_ron_excl_vat ?? 0, 2, '.', ''),
                    'total_ron_incl_vat' => number_format($orderProduct->total_ron_incl_vat ?? 0, 2, '.', ''),
                    'vat_percent' => $orderProduct->vat_percent,
                ];
            }),
            'totals' => [
                'subtotal_excl_vat' => number_format($order->total_excl_vat ?? 0, 2, '.', ''),
                'subtotal_incl_vat' => number_format($order->total_incl_vat ?? 0, 2, '.', ''),
                'total_ron_excl_vat' => number_format($order->total_ron_excl_vat ?? 0, 2, '.', ''),
                'total_ron_incl_vat' => number_format($order->total_ron_incl_vat ?? 0, 2, '.', ''),
                'vat_rate' => $order->vat_rate_applied ?? 0,
                'currency' => $order->currency ?? 'RON',
                'exchange_rate' => $order->exchange_rate ?? 1,
            ],
            'updated_at' => $order->updated_at->toIso8601String(),
            'updated_at_formatted' => $order->updated_at->format('d.m.Y H:i:s'),
            'history' => $order->history->map(function ($history) {
                return [
                    'id' => $history->id,
                    'action' => $history->action,
                    'description' => $history->description,
                    'old_value' => $history->old_value,
                    'new_value' => $history->new_value,
                    'created_at' => $history->created_at->format('Y-m-d H:i:s'),
                    'created_at_formatted' => $history->created_at->format('d.m.Y H:i'),
                    'user' => $history->user ? [
                        'id' => $history->user->id,
                        'name' => trim(($history->user->first_name ?? '') . ' ' . ($history->user->last_name ?? '')),
                        'email' => $history->user->email,
                    ] : null,
                ];
            })->sortByDesc('created_at')->values(),
        ];

        // Get countries for address forms
        $countries = \App\Models\Country::orderBy('name')->get()->map(function ($country) {
            return [
                'id' => $country->id,
                'name' => $country->name,
            ];
        });

        // Get all available order statuses
        $orderStatuses = \App\Enums\OrderStatus::all();

        return Inertia::render('admin/orders/edit', [
            'order' => $formattedOrder,
            'products' => $products,
            'countries' => $countries,
            'orderStatuses' => $orderStatuses,
        ]);
    }

    /**
     * Update an order (add/update/remove products, update addresses, etc.).
     */
    public function update(OrderUpdateRequest $request, string $orderNumber)
    {
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $action = $request->input('action');
        $userId = Auth::id();

        try {
            DB::beginTransaction();

            switch ($action) {
                case 'add_product':
                    $productId = $request->input('product_id');
                    $quantity = $request->input('quantity');
                    $customPriceRon = $request->input('custom_price_ron');

                    $orderProduct = $this->orderService->addProductToOrder(
                        $order,
                        $productId,
                        $quantity,
                        $customPriceRon ? (float) $customPriceRon : null,
                        $userId
                    );

                    DB::commit();

                    return response()->json([
                        'message' => 'Product added successfully',
                        'order_product' => [
                            'id' => $orderProduct->id,
                            'name' => $orderProduct->name,
                            'quantity' => $orderProduct->quantity,
                        ],
                    ]);

                case 'update_quantity':
                    $orderProductId = $request->input('order_product_id');
                    $quantity = $request->input('quantity');

                    $orderProduct = $this->orderService->updateProductQuantity(
                        $order,
                        $orderProductId,
                        $quantity,
                        $userId
                    );

                    DB::commit();

                    return response()->json([
                        'message' => 'Quantity updated successfully',
                        'order_product' => [
                            'id' => $orderProduct->id,
                            'quantity' => $orderProduct->quantity,
                        ],
                    ]);

                case 'remove_product':
                    $orderProductId = $request->input('order_product_id');

                    $this->orderService->removeProductFromOrder(
                        $order,
                        $orderProductId,
                        $userId
                    );

                    DB::commit();

                    return response()->json([
                        'message' => 'Product removed successfully',
                    ]);

                case 'update_address':
                    $addressType = $request->input('address_type');
                    $addressData = $request->only([
                        'first_name',
                        'last_name',
                        'company_name',
                        'fiscal_code',
                        'reg_number',
                        'phone',
                        'email',
                        'address_line_1',
                        'address_line_2',
                        'city',
                        'county_name',
                        'county_code',
                        'zip_code',
                        'country_id',
                    ]);

                    $orderAddress = $this->orderService->updateOrderAddress(
                        $order,
                        $addressType,
                        $addressData,
                        $userId
                    );

                    DB::commit();

                    return response()->json([
                        'message' => ucfirst($addressType) . ' address updated successfully',
                        'address' => [
                            'id' => $orderAddress->id,
                            'type' => $orderAddress->type,
                        ],
                    ]);

                case 'update_status':
                    $status = $request->input('status');
                    $oldStatus = $order->status;

                    $order->status = OrderStatus::from($status);
                    $order->save();

                    $order->logHistory(
                        'status_changed',
                        [
                            'status' => $oldStatus->value,
                            'status_label' => $oldStatus->label(),
                        ],
                        [
                            'status' => $status,
                            'status_label' => $order->status->label(),
                        ],
                        "Status changed from {$oldStatus->label()} to {$order->status->label()}",
                        $userId
                    );

                    DB::commit();

                    return response()->json([
                        'message' => 'Status updated successfully',
                        'status' => [
                            'value' => $order->status->value,
                            'name' => $order->status->label(),
                        ],
                    ]);

                default:
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Invalid action',
                    ], 400);
            }
        } catch (\Exception $e) {
            DB::rollBack();

            // Log the error for debugging
            \Log::error('Order update error', [
                'order_number' => $orderNumber,
                'action' => $action,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 400);
        }
    }

    /**
     * Batch update an order (process all changes in a single transaction).
     * This ensures atomicity: either all changes are applied or none.
     */
    public function batchUpdate(OrderBatchUpdateRequest $request, string $orderNumber)
    {
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $changes = $request->input('changes', []);
        $originalUpdatedAt = $request->input('originalUpdatedAt');
        $userId = Auth::id();

        // Check if order has invoice (blocking edits)
        if ($order->invoice_number) {
            return response()->json([
                'message' => 'Cannot edit order with existing invoice. Please void the invoice first.',
            ], 400);
        }

        if (empty($changes)) {
            return response()->json([
                'message' => 'No changes provided',
            ], 400);
        }

        // Optimistic locking: Check if order was modified by another user
        if ($originalUpdatedAt) {
            $orderUpdatedAt = $order->updated_at->toIso8601String();
            if ($orderUpdatedAt !== $originalUpdatedAt) {
                return response()->json([
                    'message' => 'Order was modified by another user. Please refresh the page and try again.',
                    'conflict' => true,
                    'current_updated_at' => $orderUpdatedAt,
                    'expected_updated_at' => $originalUpdatedAt,
                ], 409); // 409 Conflict
            }
        }

        try {
            DB::beginTransaction();

            $results = [];

            // Process changes in order: remove, update, add, address, status
            // This order ensures dependencies are handled correctly
            $sortedChanges = $this->sortChanges($changes);

            foreach ($sortedChanges as $change) {
                $type = $change['type'];

                switch ($type) {
                    case 'remove_product':
                        $orderProductId = $change['order_product_id'];
                        $this->orderService->removeProductFromOrder(
                            $order,
                            $orderProductId,
                            $userId
                        );
                        $results[] = [
                            'type' => 'remove_product',
                            'order_product_id' => $orderProductId,
                            'status' => 'success',
                        ];
                        break;

                    case 'update_quantity':
                        $orderProductId = $change['order_product_id'];
                        $quantity = $change['quantity'];

                        $orderProduct = $this->orderService->updateProductQuantity(
                            $order,
                            $orderProductId,
                            $quantity,
                            $userId
                        );
                        $results[] = [
                            'type' => 'update_quantity',
                            'order_product_id' => $orderProductId,
                            'quantity' => $orderProduct->quantity,
                            'status' => 'success',
                        ];
                        break;

                    case 'add_product':
                        $productId = $change['product_id'];
                        $quantity = $change['quantity'];
                        $customPriceRon = $change['custom_price_ron'] ?? null;

                        $orderProduct = $this->orderService->addProductToOrder(
                            $order,
                            $productId,
                            $quantity,
                            $customPriceRon ? (float) $customPriceRon : null,
                            $userId
                        );
                        $results[] = [
                            'type' => 'add_product',
                            'order_product_id' => $orderProduct->id,
                            'product_id' => $productId,
                            'quantity' => $orderProduct->quantity,
                            'status' => 'success',
                        ];
                        break;

                    case 'update_address':
                        $addressType = $change['address_type'];
                        $addressData = array_filter([
                            'first_name' => $change['first_name'] ?? null,
                            'last_name' => $change['last_name'] ?? null,
                            'company_name' => $change['company_name'] ?? null,
                            'fiscal_code' => $change['fiscal_code'] ?? null,
                            'reg_number' => $change['reg_number'] ?? null,
                            'phone' => $change['phone'] ?? null,
                            'email' => $change['email'] ?? null,
                            'address_line_1' => $change['address_line_1'] ?? null,
                            'address_line_2' => $change['address_line_2'] ?? null,
                            'city' => $change['city'] ?? null,
                            'county_name' => $change['county_name'] ?? null,
                            'county_code' => $change['county_code'] ?? null,
                            'zip_code' => $change['zip_code'] ?? null,
                            'country_id' => $change['country_id'] ?? null,
                        ], fn($value) => $value !== null);

                        $orderAddress = $this->orderService->updateOrderAddress(
                            $order,
                            $addressType,
                            $addressData,
                            $userId
                        );
                        $results[] = [
                            'type' => 'update_address',
                            'address_type' => $addressType,
                            'address_id' => $orderAddress->id,
                            'status' => 'success',
                        ];
                        break;

                    case 'update_status':
                        $status = $change['status'];
                        $oldStatus = $order->status;

                        $order->status = OrderStatus::from($status);
                        $order->save();

                        $order->logHistory(
                            'status_changed',
                            [
                                'status' => $oldStatus->value,
                                'status_label' => $oldStatus->label(),
                            ],
                            [
                                'status' => $status,
                                'status_label' => $order->status->label(),
                            ],
                            "Status changed from {$oldStatus->label()} to {$order->status->label()}",
                            $userId
                        );
                        $results[] = [
                            'type' => 'update_status',
                            'status' => $order->status->value,
                            'status_label' => $order->status->label(),
                            'result' => 'success',
                        ];
                        break;

                    case 'update_payment_status':
                        $isPaid = (bool) $change['is_paid'];
                        $oldIsPaid = $order->is_paid;

                        if ($isPaid) {
                            $order->markAsPaid($userId);
                        } else {
                            $order->markAsUnpaid($userId);
                        }

                        $results[] = [
                            'type' => 'update_payment_status',
                            'is_paid' => $order->is_paid,
                            'result' => 'success',
                        ];
                        break;

                    default:
                        throw new \InvalidArgumentException("Unknown change type: {$type}");
                }
            }

            // Recalculate totals after all product changes
            $this->orderService->recalculateOrderTotals($order);

            DB::commit();

            // Refresh order to get updated data
            $order->refresh();

            return response()->json([
                'message' => 'All changes applied successfully',
                'results' => $results,
                'order' => [
                    'total_ron_incl_vat' => $order->total_ron_incl_vat,
                    'total_ron_excl_vat' => $order->total_ron_excl_vat,
                    'total_incl_vat' => $order->total_incl_vat,
                    'total_excl_vat' => $order->total_excl_vat,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            // Log the error for debugging
            \Log::error('Order batch update error', [
                'order_number' => $orderNumber,
                'changes_count' => count($changes),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => $e->getMessage(),
                'error' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 400);
        }
    }

    /**
     * Sort changes to ensure correct processing order:
     * 1. Remove products (first, to avoid conflicts)
     * 2. Update quantities
     * 3. Add products
     * 4. Update addresses
     * 5. Update payment status
     * 6. Update status (last, as it's independent)
     */
    private function sortChanges(array $changes): array
    {
        $order = [
            'remove_product' => 1,
            'update_quantity' => 2,
            'add_product' => 3,
            'update_address' => 4,
            'update_payment_status' => 5,
            'update_status' => 6,
        ];

        usort($changes, function ($a, $b) use ($order) {
            $aOrder = $order[$a['type']] ?? 999;
            $bOrder = $order[$b['type']] ?? 999;
            return $aOrder <=> $bOrder;
        });

        return $changes;
    }
}
