<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * Display the order history page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->load('customer');
        $customer = $user->customer;

        if (!$customer) {
            return Inertia::render('settings/history/orders', [
                'orders' => [],
            ]);
        }

        $perPage = (int) $request->get('per_page', 5);
        if ($perPage <= 0) {
            $perPage = 5;
        }
        // Allow "all" option
        if ($perPage === 999999) {
            $perPage = 999999; // Will be handled specially
        }

        // Get filters
        $status = $request->get('status', 'all'); // 'all', 'active', 'cancelled'
        $timeRange = $request->get('time_range', '3months'); // '3months', '6months', 'year', 'all'
        $search = $request->get('search', '');

        $ordersQuery = $customer->orders()
            ->with([
                'products.product.images',
                'paymentMethod',
                'billingAddress',
                'shippingAddress',
                'shipping',
                'history',
            ]);

        // Filter by status
        if ($status === 'active') {
            // Active orders: not cancelled (check order status and history)
            $ordersQuery->where(function ($q) {
                $q->where('status', '!=', \App\Enums\OrderStatus::CANCELLED->value)
                    ->orWhereNull('status');
            })->whereDoesntHave('history', function ($q) {
                $q->where('action', 'order_cancelled');
            });
        } elseif ($status === 'cancelled') {
            // Cancelled orders: either status is "Cancelled" or has cancellation in history
            $ordersQuery->where(function ($q) {
                $q->where('status', \App\Enums\OrderStatus::CANCELLED->value)
                    ->orWhereHas('history', function ($historyQuery) {
                        $historyQuery->where('action', 'order_cancelled');
                    });
            });
        }
        // 'all' shows everything, no filter needed

        // Filter by time range
        if ($timeRange !== 'all') {
            $now = now();
            if ($timeRange === '3months') {
                $ordersQuery->where('created_at', '>=', $now->copy()->subMonths(3));
            } elseif ($timeRange === '6months') {
                $ordersQuery->where('created_at', '>=', $now->copy()->subMonths(6));
            } elseif ($timeRange === 'year') {
                // Get the year of the first order
                $firstOrder = $customer->orders()->orderBy('created_at', 'asc')->first();
                if ($firstOrder) {
                    $firstOrderYear = $firstOrder->created_at->year;
                    $ordersQuery->whereYear('created_at', $firstOrderYear);
                }
            }
        }

        // Search by product name or order number
        if (!empty($search)) {
            $ordersQuery->where(function ($q) use ($search) {
                $q->where('order_number', 'like', '%' . $search . '%')
                    ->orWhereHas('products', function ($query) use ($search) {
                        $query->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        $ordersQuery->orderBy('created_at', 'desc');

        // If per_page is 999999, get all orders without pagination
        if ($perPage === 999999) {
            $orders = $ordersQuery->get();
            $pagination = [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $orders->count(),
                'total' => $orders->count(),
            ];
        } else {
            $paginatedOrders = $ordersQuery->paginate($perPage);
            $orders = $paginatedOrders->getCollection();
            $pagination = [
                'current_page' => $paginatedOrders->currentPage(),
                'last_page' => $paginatedOrders->lastPage(),
                'per_page' => $paginatedOrders->perPage(),
                'total' => $paginatedOrders->total(),
            ];
        }

        $formattedOrders = $orders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'invoice_series' => $order->invoice_series,
                'invoice_number' => $order->invoice_number,
                'currency' => $order->currency,
                'vat_rate_applied' => $order->vat_rate_applied ? (float) $order->vat_rate_applied : null,
                'total_excl_vat' => (float) $order->total_excl_vat,
                'total_incl_vat' => (float) $order->total_incl_vat,
                'total_ron_excl_vat' => (float) $order->total_ron_excl_vat,
                'total_ron_incl_vat' => (float) $order->total_ron_incl_vat,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                'cancelled_at' => $order->cancelled_at ? $order->cancelled_at->format('Y-m-d H:i:s') : null,
                'order_status' => $order->status ? [
                    'value' => $order->status->value,
                    'name' => $order->status->label(),
                    'color_code' => $order->status->colorCode(),
                ] : null,
                'payment_method' => $order->paymentMethod ? [
                    'id' => $order->paymentMethod->id,
                    'name' => $order->paymentMethod->name,
                ] : null,
                'payment' => [
                    'is_paid' => $order->is_paid ?? false,
                    'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                    'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
                ],
                'billing_address' => $order->billingAddress ? [
                    'first_name' => $order->billingAddress->first_name,
                    'last_name' => $order->billingAddress->last_name,
                    'address_line_1' => $order->billingAddress->address_line_1,
                    'address_line_2' => $order->billingAddress->address_line_2,
                    'city' => $order->billingAddress->city,
                    'county_name' => $order->billingAddress->county_name,
                    'zip_code' => $order->billingAddress->zip_code,
                ] : null,
                'shipping_address' => $order->shippingAddress ? [
                    'first_name' => $order->shippingAddress->first_name,
                    'last_name' => $order->shippingAddress->last_name,
                    'address_line_1' => $order->shippingAddress->address_line_1,
                    'address_line_2' => $order->shippingAddress->address_line_2,
                    'city' => $order->shippingAddress->city,
                    'county_name' => $order->shippingAddress->county_name,
                    'zip_code' => $order->shippingAddress->zip_code,
                ] : null,
                'shipping' => $order->shipping ? [
                    'pickup_point_id' => $order->shipping->pickup_point_id,
                    'shipping_cost_excl_vat' => (float) $order->shipping->shipping_cost_excl_vat,
                    'shipping_cost_incl_vat' => (float) $order->shipping->shipping_cost_incl_vat,
                    'shipping_cost_ron_excl_vat' => (float) $order->shipping->shipping_cost_ron_excl_vat,
                    'shipping_cost_ron_incl_vat' => (float) $order->shipping->shipping_cost_ron_incl_vat,
                ] : null,
                'products' => $order->products->map(function ($orderProduct) {
                    $product = $orderProduct->product;
                    $image = null;

                    // Get product image - prefer main_image_url, fallback to first product image
                    if ($product) {
                        if ($product->main_image_url) {
                            $image = $product->main_image_url;
                        } elseif ($product->images && $product->images->count() > 0) {
                            $image = $product->images->first()->image_url;
                        }
                    }

                    return [
                        'id' => $orderProduct->id,
                        'product_id' => $orderProduct->product_id,
                        'name' => $orderProduct->name,
                        'sku' => $orderProduct->sku,
                        'quantity' => (int) $orderProduct->quantity,
                        'unit_price_currency' => (float) $orderProduct->unit_price_currency,
                        'unit_price_ron' => (float) $orderProduct->unit_price_ron,
                        'total_currency_excl_vat' => (float) $orderProduct->total_currency_excl_vat,
                        'total_currency_incl_vat' => (float) $orderProduct->total_currency_incl_vat,
                        'total_ron_excl_vat' => (float) $orderProduct->total_ron_excl_vat,
                        'total_ron_incl_vat' => (float) $orderProduct->total_ron_incl_vat,
                        'image' => $image,
                    ];
                })->values(),
            ];
        });

        return Inertia::render('settings/history/orders', [
            'orders' => $formattedOrders,
            'pagination' => $pagination,
            'filters' => [
                'status' => $status,
                'time_range' => $timeRange,
                'search' => $search,
                'per_page' => $perPage === 999999 ? 'all' : $perPage,
            ],
        ]);
    }

    /**
     * Search orders by product name or order number (for dropdown).
     */
    public function search(Request $request)
    {
        $user = $request->user()->load('customer');
        $customer = $user->customer;

        if (!$customer) {
            return response()->json(['results' => []]);
        }

        $query = $request->get('q', '');

        if (empty($query) || strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        $ordersQuery = $customer->orders()
            ->with([
                'products.product.images',
                'shipping',
                'orderStatus',
                'history',
            ]);

        // Search by order number or product name
        $ordersQuery->where(function ($q) use ($query) {
            $q->where('order_number', 'like', '%' . $query . '%')
                ->orWhereHas('products', function ($productQuery) use ($query) {
                    $productQuery->where('name', 'like', '%' . $query . '%');
                });
        });

        $ordersQuery->orderBy('created_at', 'desc')->limit(10);

        $orders = $ordersQuery->get();

        $results = [];
        foreach ($orders as $order) {
            foreach ($order->products as $orderProduct) {
                // Only include products that match the search query
                if (stripos($orderProduct->name, $query) !== false || stripos($order->order_number, $query) !== false) {
                    $product = $orderProduct->product;
                    $image = null;

                    // Get product image
                    if ($product) {
                        if ($product->main_image_url) {
                            $image = $product->main_image_url;
                        } elseif ($product->images && $product->images->count() > 0) {
                            $image = $product->images->first()->image_url;
                        }
                    }

                    // Get order status
                    $isDelivered = $order->status === \App\Enums\OrderStatus::DELIVERED;
                    $isCancelled = $order->isCancelled();

                    $results[] = [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'product_id' => $orderProduct->product_id,
                        'product_name' => $orderProduct->name,
                        'price' => (float) $orderProduct->total_ron_incl_vat,
                        'image' => $image,
                        'date' => $order->created_at->format('d M Y'),
                        'date_timestamp' => $order->created_at->timestamp,
                        'cancelled' => $isCancelled,
                        'delivered' => $isDelivered,
                        'status' => $order->status ? [
                            'name' => $order->status->label(),
                            'color_code' => $order->status->colorCode(),
                        ] : null,
                    ];
                }
            }

            // Also add order if search matches order number (even if no products match)
            if (stripos($order->order_number, $query) !== false && $order->products->count() > 0) {
                $firstProduct = $order->products->first();
                $product = $firstProduct->product;
                $image = null;

                if ($product) {
                    if ($product->main_image_url) {
                        $image = $product->main_image_url;
                    } elseif ($product->images && $product->images->count() > 0) {
                        $image = $product->images->first()->image_url;
                    }
                }

                // Check if this order number result already exists
                $exists = false;
                foreach ($results as $result) {
                    if ($result['order_id'] === $order->id && $result['product_id'] === $firstProduct->product_id) {
                        $exists = true;
                        break;
                    }
                }

                if (!$exists) {
                    // Get order status
                    $isDelivered = $order->status === \App\Enums\OrderStatus::DELIVERED;
                    $isCancelled = $order->isCancelled();

                    $results[] = [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'product_id' => $firstProduct->product_id,
                        'product_name' => $firstProduct->name,
                        'price' => (float) $order->total_ron_incl_vat,
                        'image' => $image,
                        'date' => $order->created_at->format('d M Y'),
                        'date_timestamp' => $order->created_at->timestamp,
                        'cancelled' => $isCancelled,
                        'delivered' => $isDelivered,
                        'status' => $order->status ? [
                            'name' => $order->status->label(),
                            'color_code' => $order->status->colorCode(),
                        ] : null,
                    ];
                }
            }
        }

        // Remove duplicates and limit to 10 results
        $uniqueResults = [];
        $seen = [];
        foreach ($results as $result) {
            $key = $result['order_id'] . '_' . $result['product_id'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueResults[] = $result;
                if (count($uniqueResults) >= 10) {
                    break;
                }
            }
        }

        return response()->json(['results' => $uniqueResults]);
    }

    /**
     * Display a single order details page.
     */
    public function show(Request $request, int $id): Response
    {
        $user = $request->user()->load('customer');
        $customer = $user->customer;

        if (!$customer) {
            abort(404);
        }

        $order = $customer->orders()
            ->with([
                'products.product.images',
                'paymentMethod',
                'billingAddress',
                'shippingAddress',
                'shipping.shippingMethod',
                'history',
            ])
            ->findOrFail($id);

        // Get shop info for seller name
        $shopInfo = \App\Models\ShopInfo::first();

        $formattedOrder = [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'invoice_series' => $order->invoice_series,
            'invoice_number' => $order->invoice_number,
            'currency' => $order->currency,
            'exchange_rate' => $order->exchange_rate ? (float) $order->exchange_rate : null,
            'vat_rate_applied' => $order->vat_rate_applied ? (float) $order->vat_rate_applied : null,
            'is_vat_exempt' => $order->is_vat_exempt,
            'total_excl_vat' => (float) $order->total_excl_vat,
            'total_incl_vat' => (float) $order->total_incl_vat,
            'total_ron_excl_vat' => (float) $order->total_ron_excl_vat,
            'total_ron_incl_vat' => (float) $order->total_ron_incl_vat,
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'cancelled_at' => $order->cancelled_at ? $order->cancelled_at->format('Y-m-d H:i:s') : null,
            'order_status' => $order->orderStatus ? [
                'id' => $order->orderStatus->id,
                'name' => $order->orderStatus->name,
                'color_code' => $order->orderStatus->color_code,
            ] : null,
            'payment_method' => $order->paymentMethod ? [
                'id' => $order->paymentMethod->id,
                'name' => $order->paymentMethod->name,
            ] : null,
            'billing_address' => $order->billingAddress ? [
                'first_name' => $order->billingAddress->first_name,
                'last_name' => $order->billingAddress->last_name,
                'phone' => $order->billingAddress->phone,
                'address_line_1' => $order->billingAddress->address_line_1,
                'address_line_2' => $order->billingAddress->address_line_2,
                'city' => $order->billingAddress->city,
                'county_name' => $order->billingAddress->county_name,
                'zip_code' => $order->billingAddress->zip_code,
            ] : null,
            'shipping_address' => $order->shippingAddress ? [
                'first_name' => $order->shippingAddress->first_name,
                'last_name' => $order->shippingAddress->last_name,
                'phone' => $order->shippingAddress->phone,
                'address_line_1' => $order->shippingAddress->address_line_1,
                'address_line_2' => $order->shippingAddress->address_line_2,
                'city' => $order->shippingAddress->city,
                'county_name' => $order->shippingAddress->county_name,
                'zip_code' => $order->shippingAddress->zip_code,
            ] : null,
            'shipping' => $order->shipping ? [
                'id' => $order->shipping->id,
                'title' => $order->shipping->title,
                'pickup_point_id' => $order->shipping->pickup_point_id,
                'tracking_number' => $order->shipping->tracking_number,
                'shipping_cost_excl_vat' => (float) $order->shipping->shipping_cost_excl_vat,
                'shipping_cost_incl_vat' => (float) $order->shipping->shipping_cost_incl_vat,
                'shipping_cost_ron_excl_vat' => (float) $order->shipping->shipping_cost_ron_excl_vat,
                'shipping_cost_ron_incl_vat' => (float) $order->shipping->shipping_cost_ron_incl_vat,
                'shipping_method' => $order->shipping->shippingMethod ? [
                    'id' => $order->shipping->shippingMethod->id,
                    'name' => $order->shipping->shippingMethod->name,
                    'code' => $order->shipping->shippingMethod->code,
                ] : null,
            ] : null,
            'products' => $order->products->map(function ($orderProduct) {
                $product = $orderProduct->product;
                $image = null;

                // Get product image - prefer main_image_url, fallback to first product image
                if ($product) {
                    if ($product->main_image_url) {
                        $image = $product->main_image_url;
                    } elseif ($product->images && $product->images->count() > 0) {
                        $image = $product->images->first()->image_url;
                    }
                }

                return [
                    'id' => $orderProduct->id,
                    'product_id' => $orderProduct->product_id,
                    'name' => $orderProduct->name,
                    'sku' => $orderProduct->sku,
                    'quantity' => (int) $orderProduct->quantity,
                    'unit_price_currency' => (float) $orderProduct->unit_price_currency,
                    'unit_price_ron' => (float) $orderProduct->unit_price_ron,
                    'total_currency_excl_vat' => (float) $orderProduct->total_currency_excl_vat,
                    'total_currency_incl_vat' => (float) $orderProduct->total_currency_incl_vat,
                    'total_ron_excl_vat' => (float) $orderProduct->total_ron_excl_vat,
                    'total_ron_incl_vat' => (float) $orderProduct->total_ron_incl_vat,
                    'image' => $image,
                ];
            })->values(),
        ];

        return Inertia::render('settings/history/order', [
            'order' => $formattedOrder,
            'shop_info' => $shopInfo ? [
                'company_name' => $shopInfo->company_name,
                'shop_name' => $shopInfo->shop_name,
            ] : null,
        ]);
    }
}
