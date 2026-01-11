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
        Schema::create('returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('restrict');
            $table->foreignId('order_product_id')->constrained('order_products')->onDelete('restrict');
            
            // Customer information
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone');
            $table->string('order_number');
            $table->date('order_date');
            
            // Product information
            $table->string('product_name');
            $table->string('product_sku');
            $table->integer('quantity');
            
            // Return details
            $table->string('return_reason')->comment('other, wrong_product, defect, order_error, sealed_return');
            $table->text('return_reason_details')->nullable();
            $table->string('is_product_opened')->nullable()->comment('yes, no');
            $table->string('iban')->nullable();
            
            // Return number and tracking
            $table->string('return_number')->unique()->comment('Format: RET-XXX-XXX');
            
            // Financial
            $table->decimal('refund_amount', 15, 2)->nullable()->comment('Estimated refund amount, editable by admin');
            
            // Stock management
            $table->boolean('restock_item')->default(false)->comment('Flag to control stock reintroduction');
            $table->timestamp('restocked_at')->nullable()->comment('Timestamp when stock was incremented for this return');
            
            // Status tracking
            $table->string('status')->default('pending')->comment('pending, received, inspecting, rejected, completed');
            
            $table->timestamps();
            
            $table->index('order_id');
            $table->index('status');
            $table->index('return_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('returns');
    }
};
