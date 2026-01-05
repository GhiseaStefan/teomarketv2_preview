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
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('is_paid')->default(false)->after('status')->comment('Indicates if the order has been paid');
            $table->timestamp('paid_at')->nullable()->after('is_paid')->comment('Timestamp when the order was marked as paid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['is_paid', 'paid_at']);
        });
    }
};
