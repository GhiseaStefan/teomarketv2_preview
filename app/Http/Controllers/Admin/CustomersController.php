<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomersController extends Controller
{
    /**
     * Display a listing of customers.
     */
    public function index(Request $request): Response
    {
        $search = $request->get('search', '');

        $query = Customer::with([
            'users',
            'addresses',
            'orders' => function ($query) {
                $query->select('id', 'customer_id', 'total_ron_incl_vat');
            },
            'orders.shipping' => function ($query) {
                $query->select('order_id', 'shipping_cost_ron_incl_vat');
            }
        ]);

        // Apply search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('users', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('addresses', function ($addressQuery) use ($search) {
                        $addressQuery->where('city', 'like', "%{$search}%")
                            ->orWhere('county_name', 'like', "%{$search}%");
                    });
            });
        }

        $customers = $query->orderBy('created_at', 'desc')->paginate(50)->appends($request->only(['search']));

        // Format customers for frontend
        $formattedCustomers = $customers->getCollection()->map(function ($customer) {
            $user = $customer->users->first();
            $preferredAddress = $customer->addresses
                ->where('is_preferred', true)
                ->first() ?? $customer->addresses->first();
            
            $ordersCount = $customer->orders->count();
            $amountSpent = $customer->orders->sum(function ($order) {
                return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
            }) ?? 0;

            // Build customer name
            $customerName = '';
            if ($customer->customer_type === 'company' && $customer->company_name) {
                $customerName = $customer->company_name;
            } elseif ($user) {
                $customerName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
            }

            // Build location
            $location = '';
            if ($preferredAddress) {
                $locationParts = array_filter([
                    $preferredAddress->city,
                    $preferredAddress->county_name,
                ]);
                $location = implode(', ', $locationParts);
            }

            return [
                'id' => $customer->id,
                'customer_name' => $customerName ?: 'N/A',
                'email' => $user?->email ?? 'N/A',
                'phone' => $customer->phone ?? 'N/A',
                'location' => $location ?: 'N/A',
                'orders_count' => $ordersCount,
                'amount_spent' => number_format($amountSpent, 2, '.', '') . ' RON',
                'is_active' => $user?->is_active ?? true,
            ];
        });

        return Inertia::render('admin/customers', [
            'customers' => $formattedCustomers,
            'pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Display the specified customer.
     */
    public function show(int $id): Response
    {
        $customer = Customer::with([
            'users',
            'addresses.country',
            'customerGroup',
            'orders' => function ($query) {
                $query->orderBy('created_at', 'desc')->limit(10);
            },
        ])->findOrFail($id);

        // Build customer name
        $customerName = '';
        if ($customer->customer_type === 'company' && $customer->company_name) {
            $customerName = $customer->company_name;
        } else {
            $user = $customer->users->first();
            if ($user) {
                $customerName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
            }
        }

        // Get all orders for statistics
        $allOrders = $customer->orders()->with('shipping')->get();
        $totalOrders = $allOrders->count();
        $totalSpent = $allOrders->sum(function ($order) {
            return ($order->total_ron_incl_vat ?? 0) + ($order->shipping?->shipping_cost_ron_incl_vat ?? 0);
        }) ?? 0;
        $averageOrderValue = $totalOrders > 0 ? $totalSpent / $totalOrders : 0;
        $lastOrder = $allOrders->sortByDesc('created_at')->first();

        // Format customer for frontend
        $formattedCustomer = [
            'id' => $customer->id,
            'customer_name' => $customerName ?: 'N/A',
            'customer_type' => $customer->customer_type,
            'company_name' => $customer->company_name,
            'reg_number' => $customer->reg_number,
            'fiscal_code' => $customer->fiscal_code,
            'phone' => $customer->phone,
            'bank_name' => $customer->bank_name,
            'iban' => $customer->iban,
            'created_at' => $customer->created_at ? $customer->created_at->format('Y-m-d H:i:s') : null,
            'created_at_formatted' => $customer->created_at ? $customer->created_at->format('d.m.Y H:i') : null,
            'customer_group' => $customer->customerGroup ? [
                'id' => $customer->customerGroup->id,
                'name' => $customer->customerGroup->name,
                'code' => $customer->customerGroup->code,
            ] : null,
            'users' => $customer->users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at?->format('Y-m-d H:i:s'),
                    'is_active' => $user->is_active,
                    'two_factor_confirmed_at' => $user->two_factor_confirmed_at?->format('Y-m-d H:i:s'),
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'created_at_formatted' => $user->created_at->format('d.m.Y H:i'),
                ];
            }),
            'addresses' => $customer->addresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'address_type' => $address->address_type,
                    'is_preferred' => $address->is_preferred,
                    'first_name' => $address->first_name,
                    'last_name' => $address->last_name,
                    'company_name' => $address->company_name,
                    'phone' => $address->phone,
                    'email' => $address->email,
                    'address_line_1' => $address->address_line_1,
                    'address_line_2' => $address->address_line_2,
                    'city' => $address->city,
                    'county_name' => $address->county_name,
                    'county_code' => $address->county_code,
                    'zip_code' => $address->zip_code,
                    'country' => $address->country ? [
                        'id' => $address->country->id,
                        'name' => $address->country->name,
                        'iso_code_2' => $address->country->iso_code_2,
                    ] : null,
                ];
            }),
            'orders' => $customer->orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                    'created_at_formatted' => $order->created_at->format('d.m.Y H:i'),
                    'status' => [
                        'value' => $order->status->value,
                        'name' => $order->status->label(),
                        'color' => $order->status->colorCode(),
                    ],
                    'total_ron_incl_vat' => number_format($order->total_ron_incl_vat ?? 0, 2, '.', ''),
                    'is_paid' => $order->is_paid ?? false,
                    'paid_at' => $order->paid_at ? $order->paid_at->format('Y-m-d H:i:s') : null,
                    'paid_at_formatted' => $order->paid_at ? $order->paid_at->format('d.m.Y H:i') : null,
                ];
            }),
            'stats' => [
                'total_orders' => $totalOrders,
                'total_spent' => number_format($totalSpent, 2, '.', ''),
                'average_order_value' => number_format($averageOrderValue, 2, '.', ''),
                'last_order_date' => $lastOrder ? $lastOrder->created_at->format('Y-m-d H:i:s') : null,
                'last_order_date_formatted' => $lastOrder ? $lastOrder->created_at->format('d.m.Y H:i') : null,
            ],
        ];

        return Inertia::render('admin/customers/show', [
            'customer' => $formattedCustomer,
        ]);
    }

    public function deactivate(Request $request)
    {
        $request->validate([
            'customer_ids' => 'required|array',
            'customer_ids.*' => 'required|integer|exists:customers,id',
        ]);

        $customerIds = $request->input('customer_ids');

        DB::transaction(function () use ($customerIds) {
            $customers = Customer::whereIn('id', $customerIds)->with('users')->get();
            
            foreach ($customers as $customer) {
                foreach ($customer->users as $user) {
                    $user->update(['is_active' => false]);
                }
            }
        });

        return redirect()->back()->with('success', 'Selected accounts have been deactivated.');
    }

    public function activate(Request $request)
    {
        $request->validate([
            'customer_ids' => 'required|array',
            'customer_ids.*' => 'required|integer|exists:customers,id',
        ]);

        $customerIds = $request->input('customer_ids');

        DB::transaction(function () use ($customerIds) {
            $customers = Customer::whereIn('id', $customerIds)->with('users')->get();
            
            foreach ($customers as $customer) {
                foreach ($customer->users as $user) {
                    $user->update(['is_active' => true]);
                }
            }
        });

        return redirect()->back()->with('success', 'Selected accounts have been activated.');
    }
}
