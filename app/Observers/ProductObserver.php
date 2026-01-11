<?php

namespace App\Observers;

use App\Models\Product;

class ProductObserver
{
    /**
     * Handle the Product "created" event.
     */
    public function created(Product $product): void
    {
        // If this is a variant, inherit family from parent
        if ($product->parent_id && !$product->family_id) {
            $parent = Product::find($product->parent_id);
            if ($parent && $parent->family_id) {
                // Use withoutSyncingToSearch to prevent Scout indexing
                // Variants should not be indexed anyway (see shouldBeSearchable in Product model)
                $product->withoutSyncingToSearch(function () use ($product, $parent) {
                    $product->family_id = $parent->family_id;
                    $product->saveQuietly(); // Use saveQuietly to avoid triggering events again
                });
            }
        }
    }

    /**
     * Handle the Product "deleted" event.
     * Cascade soft delete to children (variants) when parent is deleted.
     */
    public function deleted(Product $product): void
    {
        // Only cascade if this is a soft delete (not a force delete)
        if ($product->trashed()) {
            // Soft delete all children
            $product->children()->each(function ($child) {
                $child->delete();
            });
        }
    }

    /**
     * Handle the Product "restored" event.
     * Cascade restore to children when parent is restored.
     */
    public function restored(Product $product): void
    {
        // Restore all children that were deleted at the same time or after the parent
        $product->children()->onlyTrashed()->each(function ($child) {
            $child->restore();
        });
    }

    /**
     * Handle the Product "force deleted" event.
     * Cascade force delete to children when parent is force deleted.
     */
    public function forceDeleted(Product $product): void
    {
        // Force delete all children
        $product->children()->withTrashed()->each(function ($child) {
            $child->forceDelete();
        });
    }
}
