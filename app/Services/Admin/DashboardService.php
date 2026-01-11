<?php

namespace App\Services\Admin;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Get all dashboard statistics.
     *
     * @return array
     */
    public function getDashboardStats(): array
    {
        return [
            'kpis' => $this->getKPIs(),
            'sales_chart' => $this->getSalesChartData(),
            'status_distribution' => $this->getStatusDistribution(),
            'latest_orders' => $this->getLatestOrders(),
            'stock_alerts' => $this->getStockAlerts(),
        ];
    }

    /**
     * Get KPI cards data.
     *
     * @return array
     */
    private function getKPIs(): array
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $startOfMonth = Carbon::now()->startOfMonth();
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        // Sales Today (including shipping)
        $salesToday = Order::whereDate('created_at', $today)
            ->with('shipping')
            ->get()
            ->sum(function ($order) {
                return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
            });

        // Sales Yesterday (including shipping)
        $salesYesterday = Order::whereDate('created_at', $yesterday)
            ->with('shipping')
            ->get()
            ->sum(function ($order) {
                return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
            });

        // Calculate percentage change
        $salesChange = 0;
        if ($salesYesterday > 0) {
            $salesChange = (($salesToday - $salesYesterday) / $salesYesterday) * 100;
        } elseif ($salesToday > 0) {
            $salesChange = 100; // 100% increase from 0
        }

        // New Orders Today (pending or processing)
        $newOrdersToday = Order::whereDate('created_at', $today)
            ->whereIn('status', [OrderStatus::PENDING, OrderStatus::PROCESSING])
            ->count();

        // New Orders Yesterday
        $newOrdersYesterday = Order::whereDate('created_at', $yesterday)
            ->whereIn('status', [OrderStatus::PENDING, OrderStatus::PROCESSING])
            ->count();

        // Calculate percentage change for new orders
        $newOrdersChange = 0;
        if ($newOrdersYesterday > 0) {
            $newOrdersChange = (($newOrdersToday - $newOrdersYesterday) / $newOrdersYesterday) * 100;
        } elseif ($newOrdersToday > 0) {
            $newOrdersChange = 100; // 100% increase from 0
        }

        // This Month Revenue (including shipping)
        $thisMonthRevenue = Order::where('created_at', '>=', $startOfMonth)
            ->with('shipping')
            ->get()
            ->sum(function ($order) {
                return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
            });

        // Last Month Revenue (for comparison, including shipping)
        $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->subMonth()->endOfMonth();
        $lastMonthRevenue = Order::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->with('shipping')
            ->get()
            ->sum(function ($order) {
                return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
            });

        // Calculate percentage change for month revenue
        $monthRevenueChange = 0;
        if ($lastMonthRevenue > 0) {
            $monthRevenueChange = (($thisMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
        } elseif ($thisMonthRevenue > 0) {
            $monthRevenueChange = 100; // 100% increase from 0
        }

        // New Customers (last 30 days) - only count users with customer role
        $newCustomers = User::where('created_at', '>=', $thirtyDaysAgo)
            ->where('role', \App\Enums\UserRole::CUSTOMER)
            ->count();

        // Stock Alerts - count simple products with low stock + variants of configurable products with low stock
        $simpleProductsCount = Product::where('type', \App\Enums\ProductType::SIMPLE->value)
            ->where('stock_quantity', '<', 5)
            ->where('status', true)
            ->count();
        
        // Count variants of configurable products with low stock
        $variantsCount = Product::where('type', \App\Enums\ProductType::VARIANT->value)
            ->where('stock_quantity', '<', 5)
            ->where('status', true)
            ->count();
        
        $stockAlertsCount = $simpleProductsCount + $variantsCount;

        return [
            'sales_today' => [
                'value' => (float) $salesToday,
                'change' => round($salesChange, 1),
                'change_positive' => $salesChange >= 0,
            ],
            'new_orders' => [
                'value' => $newOrdersToday,
                'change' => round($newOrdersChange, 1),
                'change_positive' => $newOrdersChange >= 0,
            ],
            'month_revenue' => [
                'value' => (float) $thisMonthRevenue,
                'change' => round($monthRevenueChange, 1),
                'change_positive' => $monthRevenueChange >= 0,
            ],
            'new_customers' => [
                'value' => $newCustomers,
            ],
            'stock_alerts' => [
                'value' => $stockAlertsCount,
            ],
        ];
    }

    /**
     * Get sales chart data for last 30 days.
     *
     * @return array
     */
    private function getSalesChartData(): array
    {
        $thirtyDaysAgo = Carbon::now()->subDays(29)->startOfDay();
        $today = Carbon::today()->endOfDay();

        // Get daily sales for last 30 days (including shipping)
        $orders = Order::whereBetween('created_at', [$thirtyDaysAgo, $today])
            ->with('shipping')
            ->get();

        // Group by date and sum totals including shipping
        $dailySales = $orders->groupBy(function ($order) {
            return $order->created_at->format('Y-m-d');
        })->map(function ($dayOrders) {
            return (object) [
                'date' => $dayOrders->first()->created_at->format('Y-m-d'),
                'total' => $dayOrders->sum(function ($order) {
                    return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
                })
            ];
        });

        // Fill in missing days with 0
        $chartData = [];
        $currentDate = $thirtyDaysAgo->copy();

        // Romanian month names (short and full)
        $monthNamesShort = [
            1 => 'Ian',
            2 => 'Feb',
            3 => 'Mar',
            4 => 'Apr',
            5 => 'Mai',
            6 => 'Iun',
            7 => 'Iul',
            8 => 'Aug',
            9 => 'Sep',
            10 => 'Oct',
            11 => 'Noi',
            12 => 'Dec'
        ];
        $monthNamesFull = [
            1 => 'Ianuarie',
            2 => 'Februarie',
            3 => 'Martie',
            4 => 'Aprilie',
            5 => 'Mai',
            6 => 'Iunie',
            7 => 'Iulie',
            8 => 'August',
            9 => 'Septembrie',
            10 => 'Octombrie',
            11 => 'Noiembrie',
            12 => 'Decembrie'
        ];

        while ($currentDate <= $today) {
            $dateKey = $currentDate->format('Y-m-d');
            $day = $currentDate->format('d');
            $month = (int) $currentDate->format('n');
            // Format: 01 Ian, 02 Ian (short format for chart X-axis)
            $dayName = $day . ' ' . $monthNamesShort[$month];
            // Full date for tooltip: "7 Ianuarie"
            $dayNum = (int) $currentDate->format('j');
            $fullDateName = $dayNum . ' ' . $monthNamesFull[$month];

            $salesForDay = $dailySales->get($dateKey);
            $total = $salesForDay ? (float) $salesForDay->total : 0;

            $chartData[] = [
                'date' => $dateKey,
                'day' => $dayName,
                'fullDate' => $fullDateName,
                'total' => $total,
            ];

            $currentDate->addDay();
        }

        return $chartData;
    }

    /**
     * Get order status distribution for donut chart.
     *
     * @return array
     */
    private function getStatusDistribution(): array
    {
        // Get count for each status individually
        $distribution = [];

        foreach (OrderStatus::cases() as $status) {
            $count = Order::where('status', $status)->count();

            // Only include statuses that have at least one order
            if ($count > 0) {
                $distribution[] = [
                    'name' => $status->label(),
                    'value' => $count,
                    'color' => $status->colorCode(),
                ];
            }
        }

        return $distribution;
    }

    /**
     * Get latest orders for dashboard table.
     *
     * @param int $limit
     * @return array
     */
    private function getLatestOrders(int $limit = 10): array
    {
        $orders = Order::with(['shippingAddress', 'customer.users', 'shipping'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $orders->map(function ($order) {
            $shippingAddress = $order->shippingAddress;
            $customerName = 'N/A';

            // Build customer name - same logic as OrdersController
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

            // Fallback to shipping address if customer name not found
            if ($customerName === 'N/A' && $shippingAddress) {
                $customerName = trim(($shippingAddress->first_name ?? '') . ' ' . ($shippingAddress->last_name ?? ''));
                if (empty(trim($customerName))) {
                    $customerName = 'N/A';
                }
            }

            // Calculate total including shipping
            $totalValue = (float) ($order->total_ron_incl_vat ?? 0);
            if ($order->shipping && $order->shipping->shipping_cost_ron_incl_vat) {
                $totalValue += (float) $order->shipping->shipping_cost_ron_incl_vat;
            }

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $customerName,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $order->created_at->format('d.m.Y H:i'),
                'total_value' => $totalValue,
                'status' => [
                    'value' => $order->status->value,
                    'name' => $order->status->label(),
                    'color' => $order->status->colorCode(),
                ],
            ];
        })->toArray();
    }

    /**
     * Get stock alerts (products with low stock).
     * For configurable products, returns their variants with low stock instead of the parent product.
     *
     * @param int $limit
     * @return array
     */
    private function getStockAlerts(int $limit = 6): array
    {
        $alerts = [];
        
        // Get simple products with low stock
        $simpleProducts = Product::with(['images' => function ($query) {
            $query->orderBy('sort_order')->limit(1);
        }])
            ->where('type', \App\Enums\ProductType::SIMPLE->value)
            ->where('stock_quantity', '<', 5)
            ->where('status', true)
            ->orderBy('stock_quantity', 'asc')
            ->get();

        foreach ($simpleProducts as $product) {
            // Get product image - prefer main_image_url, fallback to first product image
            $imageUrl = null;
            if ($product->main_image_url) {
                $imageUrl = $product->main_image_url;
            } elseif ($product->images && $product->images->count() > 0) {
                $imageUrl = $product->images->first()->image_url;
            }

            $alerts[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'stock_quantity' => $product->stock_quantity,
                'formatted_stock' => $product->stock_quantity,
                'image_url' => $imageUrl,
            ];
        }

        // Get configurable products and check their variants
        $configurableProducts = Product::with(['images' => function ($query) {
            $query->orderBy('sort_order')->limit(1);
        }])
            ->where('type', \App\Enums\ProductType::CONFIGURABLE->value)
            ->where('status', true)
            ->get();

        foreach ($configurableProducts as $configurableProduct) {
            // Get variants with low stock for this configurable product
            $variants = Product::with(['images' => function ($query) {
                $query->orderBy('sort_order')->limit(1);
            }])
                ->where('parent_id', $configurableProduct->id)
                ->where('type', \App\Enums\ProductType::VARIANT->value)
                ->where('stock_quantity', '<', 5)
                ->where('status', true)
                ->orderBy('stock_quantity', 'asc')
                ->get();

            foreach ($variants as $variant) {
                // Get variant image - prefer main_image_url, fallback to first variant image, then parent product image
                $imageUrl = null;
                if ($variant->main_image_url) {
                    $imageUrl = $variant->main_image_url;
                } elseif ($variant->images && $variant->images->count() > 0) {
                    $imageUrl = $variant->images->first()->image_url;
                } elseif ($configurableProduct->main_image_url) {
                    $imageUrl = $configurableProduct->main_image_url;
                } elseif ($configurableProduct->images && $configurableProduct->images->count() > 0) {
                    $imageUrl = $configurableProduct->images->first()->image_url;
                }

                $alerts[] = [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'sku' => $variant->sku,
                    'stock_quantity' => $variant->stock_quantity,
                    'formatted_stock' => $variant->stock_quantity,
                    'image_url' => $imageUrl,
                ];
            }
        }

        // Sort all alerts by stock quantity (ascending) and limit
        usort($alerts, function ($a, $b) {
            return $a['stock_quantity'] <=> $b['stock_quantity'];
        });

        return array_slice($alerts, 0, $limit);
    }
}
