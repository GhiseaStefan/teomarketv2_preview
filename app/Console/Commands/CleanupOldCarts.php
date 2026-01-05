<?php

namespace App\Console\Commands;

use App\Enums\CartStatus;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Console\Command;

class CleanupOldCarts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'carts:cleanup {--days=30 : Number of days after which to delete converted carts}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete converted carts older than specified days (default: 30 days)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoffDate = now()->subDays($days);

        $this->info("Cleaning up converted carts older than {$days} days (before {$cutoffDate->format('Y-m-d H:i:s')})...");

        // Find carts with status 'converted' that were updated more than $days days ago
        // We use updated_at because that's when the cart was marked as converted
        $cartsToDelete = Cart::where('status', CartStatus::CONVERTED)
            ->where('updated_at', '<', $cutoffDate)
            ->get();

        $count = $cartsToDelete->count();

        if ($count === 0) {
            $this->info('No carts to delete.');
            return Command::SUCCESS;
        }

        // Get cart IDs for bulk deletion of cart items
        $cartIds = $cartsToDelete->pluck('id');

        // Delete cart items first (due to foreign key constraints)
        // Use bulk delete for better performance
        // Note: Foreign key has cascade, but we delete explicitly to be safe
        CartItem::whereIn('cart_id', $cartIds)->delete();

        // Delete the carts
        $deletedCount = Cart::where('status', CartStatus::CONVERTED)
            ->where('updated_at', '<', $cutoffDate)
            ->delete();

        $this->info("Successfully deleted {$deletedCount} converted cart(s) older than {$days} days.");

        return Command::SUCCESS;
    }
}

