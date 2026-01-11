<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReturnStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReturnRefundAmountUpdateRequest;
use App\Http\Requests\Admin\ReturnRestockItemUpdateRequest;
use App\Http\Requests\Admin\ReturnStatusUpdateRequest;
use App\Models\ProductReturn;
use App\Services\Admin\ReturnService;
use App\Services\LoggingService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReturnsController extends Controller
{
    protected ReturnService $returnService;

    public function __construct(ReturnService $returnService)
    {
        $this->returnService = $returnService;
    }
    /**
     * Display a listing of returns.
     */
    public function index(Request $request): Response
    {
        $status = $request->get('status', '');
        $orderNumber = $request->get('order_number', '');
        $dateFrom = $request->get('date_from', '');
        $dateTo = $request->get('date_to', '');
        $email = $request->get('email', '');
        $search = $request->get('search', '');

        $query = ProductReturn::orderBy('created_at', 'desc');

        // Filter by status
        if ($status) {
            try {
                $statusEnum = ReturnStatus::from($status);
                $query->where('status', $statusEnum->value);
            } catch (\ValueError $e) {
                // Invalid status value, ignore filter
            }
        }

        // Filter by order number
        if ($orderNumber) {
            $query->where('order_number', 'like', "%{$orderNumber}%");
        }

        // Filter by date range
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Filter by email
        if ($email) {
            $query->where('email', 'like', "%{$email}%");
        }

        // Apply search (across multiple fields)
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('product_name', 'like', "%{$search}%")
                    ->orWhere('product_sku', 'like', "%{$search}%");
            });
        }

        $returns = $query->paginate(50)->appends($request->only([
            'status',
            'order_number',
            'date_from',
            'date_to',
            'email',
            'search',
        ]));

        // Format returns for frontend
        $formattedReturns = $returns->getCollection()->map(function ($return) {
            return [
                'id' => $return->id,
                'return_number' => $return->return_number,
                'order_number' => $return->order_number,
                'product_name' => $return->product_name,
                'product_sku' => $return->product_sku,
                'quantity' => $return->quantity,
                'status' => $return->status instanceof ReturnStatus ? $return->status->value : $return->status,
                'customer_name' => trim(($return->first_name ?? '') . ' ' . ($return->last_name ?? '')),
                'email' => $return->email,
                'created_at' => $return->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $return->created_at->format('d.m.Y H:i'),
            ];
        })->values()->all();

        // Get available statuses
        $statuses = ReturnStatus::values();

        return Inertia::render('admin/returns', [
            'returns' => $formattedReturns,
            'pagination' => [
                'current_page' => $returns->currentPage(),
                'last_page' => $returns->lastPage(),
                'per_page' => $returns->perPage(),
                'total' => $returns->total(),
            ],
            'filters' => [
                'status' => $status,
                'order_number' => $orderNumber,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'email' => $email,
                'search' => $search,
            ],
            'statuses' => $statuses,
        ]);
    }

    /**
     * Display the specified return.
     */
    public function show(int $id): Response
    {
        $return = ProductReturn::findOrFail($id);

        // Format return for frontend
        $formattedReturn = [
            'id' => $return->id,
            'return_number' => $return->return_number,
            'order_id' => $return->order_id,
            'order_product_id' => $return->order_product_id,
            'order_number' => $return->order_number,
            'order_date' => $return->order_date->format('Y-m-d'),
            'order_date_formatted' => $return->order_date->format('d.m.Y'),
            'status' => $return->status,
            'first_name' => $return->first_name,
            'last_name' => $return->last_name,
            'email' => $return->email,
            'phone' => $return->phone,
            'product_name' => $return->product_name,
            'product_sku' => $return->product_sku,
            'quantity' => $return->quantity,
            'return_reason' => $return->return_reason,
            'return_reason_details' => $return->return_reason_details,
            'is_product_opened' => $return->is_product_opened,
            'iban' => $return->iban,
            'refund_amount' => $return->refund_amount ? (float) $return->refund_amount : null,
            'restock_item' => $return->restock_item ?? false,
            'created_at' => $return->created_at->format('Y-m-d H:i:s'),
            'created_at_formatted' => $return->created_at->format('d.m.Y H:i'),
            'updated_at' => $return->updated_at->format('Y-m-d H:i:s'),
            'updated_at_formatted' => $return->updated_at->format('d.m.Y H:i'),
        ];

        // Get available statuses for dropdown
        $statuses = ReturnStatus::values();

        return Inertia::render('admin/returns/show', [
            'return' => $formattedReturn,
            'statuses' => $statuses,
        ]);
    }

    /**
     * Update the status of a return.
     */
    public function updateStatus(ReturnStatusUpdateRequest $request, int $id)
    {
        $return = ProductReturn::with('orderProduct.product')->findOrFail($id);
        $oldStatus = $return->status;
        $newStatus = ReturnStatus::from($request->input('status'));

        $this->returnService->updateStatus($return, $newStatus);

        LoggingService::logBusinessEvent($request, 'return.status.updated', [
            'return_id' => $return->id,
            'return_number' => $return->return_number,
            'order_number' => $return->order_number,
            'old_status' => $oldStatus->value,
            'new_status' => $newStatus->value,
        ]);

        return redirect()->back();
    }

    /**
     * Update the refund amount of a return.
     */
    public function updateRefundAmount(ReturnRefundAmountUpdateRequest $request, int $id)
    {
        $return = ProductReturn::findOrFail($id);
        $oldRefundAmount = $return->refund_amount;
        $refundAmount = $request->input('refund_amount') ? (float) $request->input('refund_amount') : null;

        $this->returnService->updateRefundAmount($return, $refundAmount);

        LoggingService::logBusinessEvent($request, 'return.refund_amount.updated', [
            'return_id' => $return->id,
            'return_number' => $return->return_number,
            'order_number' => $return->order_number,
            'old_refund_amount' => $oldRefundAmount,
            'new_refund_amount' => $refundAmount,
        ]);

        return redirect()->back();
    }

    /**
     * Update the restock item flag of a return.
     */
    public function updateRestockItem(ReturnRestockItemUpdateRequest $request, int $id)
    {
        $return = ProductReturn::findOrFail($id);
        $oldRestockItem = $return->restock_item;
        $restockItem = (bool) $request->input('restock_item');

        $this->returnService->updateRestockItem($return, $restockItem);

        LoggingService::logBusinessEvent($request, 'return.restock_item.updated', [
            'return_id' => $return->id,
            'return_number' => $return->return_number,
            'order_number' => $return->order_number,
            'old_restock_item' => $oldRestockItem,
            'new_restock_item' => $restockItem,
        ]);

        return redirect()->back();
    }
}
