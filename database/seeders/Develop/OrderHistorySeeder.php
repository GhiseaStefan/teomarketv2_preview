<?php

namespace Database\Seeders\Develop;

use App\Enums\OrderStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Order History Seeder
 * 
 * Dummy/Test Data - Development Only
 * 
 * Seeds order history for development/testing.
 * Creates history entries for order status changes and other actions.
 * 
 * Depends on: OrdersSeeder
 */
class OrderHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding order history...');
        $this->seedOrderHistory();
        $this->command->info('✓ Order history seeded successfully');
    }

    private function seedOrderHistory(): void
    {
        // Get orders
        $orders = DB::table('orders')
            ->orderBy('created_at', 'asc')
            ->get();

        if ($orders->isEmpty()) {
            $this->command->warn('No orders found. Please run OrdersSeeder first.');
            return;
        }

        $historyEntriesCreated = 0;

        foreach ($orders as $order) {
            // Check if order already has history
            $existingHistory = DB::table('order_history')
                ->where('order_id', $order->id)
                ->exists();

            if ($existingHistory) {
                continue;
            }

            $orderCreatedAt = \Carbon\Carbon::parse($order->created_at);
            $currentStatus = OrderStatus::tryFrom($order->status ?? OrderStatus::PENDING->value) ?? OrderStatus::PENDING;
            $currentStatusLabel = $currentStatus->label();

            // Create initial status change (order created)
            $initialStatus = OrderStatus::PENDING;
            
            DB::table('order_history')->insert([
                'order_id' => $order->id,
                'user_id' => null, // System action
                'action' => 'status_changed',
                'old_value' => json_encode(['status' => null]),
                'new_value' => json_encode([
                    'status' => $initialStatus->value,
                    'status_name' => $initialStatus->label(),
                ]),
                'description' => "Comanda a fost creata cu statusul: {$initialStatus->label()}",
                'created_at' => $orderCreatedAt,
                'updated_at' => $orderCreatedAt,
            ]);

            $historyEntriesCreated++;

            // Create status progression (if order is not in initial status)
            if ($currentStatus !== $initialStatus) {
                $statusChangeDate = $orderCreatedAt->copy()->addHours(rand(1, 48));

                DB::table('order_history')->insert([
                    'order_id' => $order->id,
                    'user_id' => null,
                    'action' => 'status_changed',
                    'old_value' => json_encode([
                        'status' => $initialStatus->value,
                        'status_name' => $initialStatus->label(),
                    ]),
                    'new_value' => json_encode([
                        'status' => $currentStatus->value,
                        'status_name' => $currentStatusLabel,
                    ]),
                    'description' => "Statusul comenzii a fost actualizat la: {$currentStatusLabel}",
                    'created_at' => $statusChangeDate,
                    'updated_at' => $statusChangeDate,
                ]);

                $historyEntriesCreated++;
            }

            // Random chance to add payment confirmation
            if (rand(1, 10) <= 7) {
                $paymentDate = $orderCreatedAt->copy()->addMinutes(rand(5, 60));

                DB::table('order_history')->insert([
                    'order_id' => $order->id,
                    'user_id' => null,
                    'action' => 'payment_confirmed',
                    'old_value' => json_encode(['payment_status' => 'pending']),
                    'new_value' => json_encode(['payment_status' => 'confirmed']),
                    'description' => 'Plata a fost confirmata',
                    'created_at' => $paymentDate,
                    'updated_at' => $paymentDate,
                ]);

                $historyEntriesCreated++;
            }

            // Random chance to add shipping update
            if (rand(1, 10) <= 5) {
                $shippingDate = $orderCreatedAt->copy()->addDays(rand(1, 3));

                DB::table('order_history')->insert([
                    'order_id' => $order->id,
                    'user_id' => null,
                    'action' => 'shipping_updated',
                    'old_value' => json_encode(['shipping_status' => 'pending']),
                    'new_value' => json_encode(['shipping_status' => 'shipped']),
                    'description' => 'Comanda a fost expediata',
                    'created_at' => $shippingDate,
                    'updated_at' => $shippingDate,
                ]);

                $historyEntriesCreated++;
            }
        }

        if ($historyEntriesCreated > 0) {
            $this->command->info("Created {$historyEntriesCreated} order history entr(y/ies).");
        } else {
            $this->command->info('All order history already exists or no orders found.');
        }
    }
}

