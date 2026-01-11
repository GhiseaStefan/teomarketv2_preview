<?php

namespace App\Http\Controllers\Settings;

use App\Enums\ReturnStatus;
use App\Http\Controllers\Controller;
use App\Models\ProductReturn;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReturnController extends Controller
{
    /**
     * Display the customer's return history page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->load('customer');
        $customer = $user->customer;

        if (!$customer) {
            return Inertia::render('settings/returns', [
                'returns' => [],
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 10,
                    'total' => 0,
                ],
                'filters' => [
                    'status' => 'all',
                    'time_range' => '3months',
                    'search' => '',
                    'per_page' => 10,
                ],
            ]);
        }

        $perPage = (int) $request->get('per_page', 10);
        if ($perPage <= 0) {
            $perPage = 10;
        }
        // Allow "all" option
        if ($perPage === 999999) {
            $perPage = 999999; // Will be handled specially
        }

        // Get filters
        $status = $request->get('status', 'all'); // 'all', 'pending', 'received', 'inspecting', 'rejected', 'completed'
        $timeRange = $request->get('time_range', '3months'); // '3months', '6months', 'year', 'all'
        $search = $request->get('search', '');

        // Get customer's order IDs
        $customerOrderIds = $customer->orders()->pluck('id');

        // Query returns for customer's orders
        $returnsQuery = ProductReturn::whereIn('order_id', $customerOrderIds)
            ->with(['order']);

        // Filter by status
        if ($status !== 'all') {
            try {
                $statusEnum = ReturnStatus::from($status);
                $returnsQuery->where('status', $statusEnum->value);
            } catch (\ValueError $e) {
                // Invalid status value, ignore filter
            }
        }

        // Filter by time range
        if ($timeRange !== 'all') {
            $now = now();
            if ($timeRange === '3months') {
                $returnsQuery->where('created_at', '>=', $now->copy()->subMonths(3));
            } elseif ($timeRange === '6months') {
                $returnsQuery->where('created_at', '>=', $now->copy()->subMonths(6));
            } elseif ($timeRange === 'year') {
                $returnsQuery->whereYear('created_at', now()->year);
            }
        }

        // Search by order number, product name, or product SKU
        if (!empty($search)) {
            $returnsQuery->where(function ($q) use ($search) {
                $q->where('order_number', 'like', '%' . $search . '%')
                    ->orWhere('product_name', 'like', '%' . $search . '%')
                    ->orWhere('product_sku', 'like', '%' . $search . '%');
            });
        }

        $returnsQuery->orderBy('created_at', 'desc');

        // If per_page is 999999, get all returns without pagination
        if ($perPage === 999999) {
            $returns = $returnsQuery->get();
            $pagination = [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $returns->count(),
                'total' => $returns->count(),
            ];
        } else {
            $paginatedReturns = $returnsQuery->paginate($perPage);
            $returns = $paginatedReturns->getCollection();
            $pagination = [
                'current_page' => $paginatedReturns->currentPage(),
                'last_page' => $paginatedReturns->lastPage(),
                'per_page' => $paginatedReturns->perPage(),
                'total' => $paginatedReturns->total(),
            ];
        }

        // Format returns for frontend
        $formattedReturns = $returns->map(function ($return) {
            return [
                'id' => $return->id,
                'return_number' => $return->return_number,
                'order_id' => $return->order_id,
                'order_number' => $return->order_number,
                'order_date' => $return->order_date->format('Y-m-d'),
                'order_date_formatted' => $return->order_date->format('d.m.Y'),
                'product_name' => $return->product_name,
                'product_sku' => $return->product_sku,
                'quantity' => $return->quantity,
                'status' => $return->status instanceof ReturnStatus ? $return->status->value : $return->status,
                'return_reason' => $return->return_reason,
                'return_reason_details' => $return->return_reason_details,
                'is_product_opened' => $return->is_product_opened,
                'created_at' => $return->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $return->created_at->format('d.m.Y H:i'),
                'updated_at' => $return->updated_at->format('Y-m-d H:i:s'),
                'updated_at_formatted' => $return->updated_at->format('d.m.Y H:i'),
            ];
        });

        return Inertia::render('settings/returns', [
            'returns' => $formattedReturns,
            'pagination' => $pagination,
            'filters' => [
                'status' => $status,
                'time_range' => $timeRange,
                'search' => $search,
                'per_page' => $perPage === 999999 ? 'all' : $perPage,
            ],
        ]);
    }
}
