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
        Schema::create('order_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->string('name')->comment('Product name snapshot');
            $table->string('sku')->comment('SKU snapshot');
            $table->string('ean')->nullable()->comment('EAN snapshot');
            $table->integer('quantity');
            $table->decimal('vat_percent', 5, 2)->comment('VAT applied to product, e.g., 19.00');
            $table->decimal('exchange_rate', 15, 4)->comment('Exchange rate applied to line, usually same as order');
            $table->decimal('unit_price_currency', 15, 2)->comment('Sale price to customer in order currency');
            $table->decimal('unit_price_ron', 15, 2)->comment('Sale price to customer equivalent in RON');
            $table->decimal('unit_purchase_price_ron', 15, 2)->comment('Product purchase cost at time of sale');
            $table->decimal('total_currency_excl_vat', 15, 2);
            $table->decimal('total_currency_incl_vat', 15, 2);
            $table->decimal('total_ron_excl_vat', 15, 2);
            $table->decimal('total_ron_incl_vat', 15, 2);
            $table->decimal('profit_ron', 15, 2)->comment('Profit calculated: (unit_price_ron - unit_purchase_price_ron) * quantity');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_products');
    }
};
