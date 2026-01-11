<?php

namespace App\Services\Admin;

use App\Enums\ReturnStatus;
use App\Models\ProductReturn;
use Illuminate\Support\Facades\DB;

class ReturnService
{
    /**
     * Update the status of a return.
     * Handles stock increment/decrement based on status changes.
     *
     * @param ProductReturn $return
     * @param ReturnStatus $newStatus
     * @return void
     */
    public function updateStatus(ProductReturn $return, ReturnStatus $newStatus): void
    {
        $oldStatus = $return->status;

        DB::transaction(function () use (&$return, $oldStatus, $newStatus) {
            // Handle stock reversal: if status was completed and is changing to something else
            if ($oldStatus === ReturnStatus::COMPLETED && $newStatus !== ReturnStatus::COMPLETED) {
                if ($return->restocked_at !== null) {
                    // Stock was previously incremented, need to reverse it
                    $this->reverseStockIncrement($return);
                }
            }

            // Handle stock increment: if status is changing to completed
            if ($newStatus === ReturnStatus::COMPLETED && $oldStatus !== ReturnStatus::COMPLETED) {
                if ($return->restock_item && $return->restocked_at === null) {
                    // Only increment if restock_item is true and hasn't been processed yet
                    $this->incrementStock($return);
                }
            }

            // Update status (only if it changed)
            if ($oldStatus !== $newStatus) {
                $return->status = $newStatus;
                $return->save();
            }
        });
    }

    /**
     * Increment stock for a return.
     * Only called when status changes to completed, restock_item is true, and restocked_at is null.
     *
     * @param ProductReturn $return
     * @return void
     */
    protected function incrementStock(ProductReturn $return): void
    {
        $orderProduct = $return->orderProduct;
        if (!$orderProduct) {
            return;
        }

        $product = $orderProduct->product;
        if (!$product) {
            return;
        }

        // Increment stock quantity
        $product->increment('stock_quantity', $return->quantity);

        // Mark as restocked (don't save here - will be saved with status update)
        $return->restocked_at = now();
    }

    /**
     * Reverse stock increment for a return.
     * Called when status changes from completed to something else.
     *
     * @param ProductReturn $return
     * @return void
     */
    protected function reverseStockIncrement(ProductReturn $return): void
    {
        $orderProduct = $return->orderProduct;
        if (!$orderProduct) {
            return;
        }

        $product = $orderProduct->product;
        if (!$product) {
            return;
        }

        // Decrement stock quantity (reverse the previous increment)
        $product->decrement('stock_quantity', $return->quantity);

        // Reset restocked_at to allow future processing if needed (don't save here - will be saved with status update)
        $return->restocked_at = null;
    }

    /**
     * Update the refund amount of a return.
     *
     * @param ProductReturn $return
     * @param float|null $refundAmount
     * @return void
     */
    public function updateRefundAmount(ProductReturn $return, ?float $refundAmount): void
    {
        $return->refund_amount = $refundAmount;
        $return->save();
    }

    /**
     * Update the restock item flag of a return.
     *
     * @param ProductReturn $return
     * @param bool $restockItem
     * @return void
     */
    public function updateRestockItem(ProductReturn $return, bool $restockItem): void
    {
        $return->restock_item = $restockItem;
        $return->save();
    }
}
