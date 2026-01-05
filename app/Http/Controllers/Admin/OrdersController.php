<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OrdersController extends Controller
{
    /**
     * Display a listing of orders.
     */
    public function index(Request $request): Response
    {
        $filter = $request->get('filter', 'all');
        $search = $request->get('search', '');
        $customerId = $request->get('customer_id');

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

        $orders = $query->paginate(50)->appends($request->only(['filter', 'search', 'customer_id']));

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
                    'total' => number_format($order->total_ron_incl_vat ?? 0, 2, '.', '') . ' RON',
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
            ],
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
}
