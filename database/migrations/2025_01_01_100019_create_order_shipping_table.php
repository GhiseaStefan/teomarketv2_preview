<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_shipping', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('shipping_method_id')->constrained('shipping_methods')->onDelete('restrict');
            $table->string('title')->nullable();
            $table->string('pickup_point_id')->nullable()->comment('Pickup point ID, e.g., easybox_1234');
            $table->string('tracking_number')->nullable()->comment('AWB tracking number');
            $table->json('courier_data')->nullable()->after('tracking_number')->comment('Additional courier data for integrations (point_id, point_name, provider, locker_details, etc.)');
            $table->decimal('shipping_cost_excl_vat', 15, 2);
            $table->decimal('shipping_cost_incl_vat', 15, 2);
            $table->decimal('shipping_cost_ron_excl_vat', 15, 2);
            $table->decimal('shipping_cost_ron_incl_vat', 15, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_shipping');
    }
};
