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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('restrict');
            $table->string('order_number')->unique();
            $table->string('invoice_series')->nullable()->comment('e.g., "FACT"');
            $table->unsignedInteger('invoice_number')->nullable()->comment('Invoice number, separate from order id');
            $table->char('currency', 3)->comment('e.g., EUR, USD - frozen at order time');
            $table->decimal('exchange_rate', 15, 4)->comment('Exchange rate at order time');
            $table->decimal('vat_rate_applied', 5, 2)->comment('VAT rate snapshot, e.g., 19.00');
            $table->boolean('is_vat_exempt')->default(false)->comment('For B2B Intracomunitar (VIES) where VAT is 0');
            $table->decimal('total_excl_vat', 15, 2);
            $table->decimal('total_incl_vat', 15, 2);
            $table->decimal('total_ron_excl_vat', 15, 2);
            $table->decimal('total_ron_incl_vat', 15, 2);
            $table->foreignId('payment_method_id')->constrained('payment_methods')->onDelete('restrict');
            $table->string('status');
            $table->boolean('is_paid')->default(false)->after('status')->comment('Indicates if the order has been paid');
            $table->timestamp('paid_at')->nullable()->after('is_paid')->comment('Timestamp when the order was marked as paid');
            $table->timestamps();

            $table->unique(['invoice_series', 'invoice_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
