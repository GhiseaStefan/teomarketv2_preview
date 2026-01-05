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
        Schema::create('order_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null')->comment('Who made the action (customer or admin)');
            $table->string('action')->comment('Action type: status_changed, address_updated, etc.');
            $table->json('old_value')->nullable()->comment('Previous value before change');
            $table->json('new_value')->nullable()->comment('New value after change');
            $table->text('description')->nullable()->comment('Human-readable description of the change');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_history');
    }
};

