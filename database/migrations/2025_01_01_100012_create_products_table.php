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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('ean')->nullable()->comment('Barcode/GTIN');
            $table->string('model')->nullable()->comment('Manufacturer model');
            $table->string('name');
            $table->string('slug')->unique()->nullable()->comment('SEO-friendly URL slug');
            $table->text('description')->nullable();
            $table->text('short_description')->nullable();
            $table->decimal('price_ron', 15, 2)->comment('Base price in RON');
            $table->decimal('purchase_price_ron', 15, 2)->nullable()->comment('Purchase price for profit calculation');
            $table->foreignId('brand_id')->nullable()->constrained('brands')->onDelete('set null');
            $table->integer('stock_quantity')->default(0);
            $table->decimal('weight', 15, 2)->nullable();
            $table->decimal('length', 15, 2)->nullable();
            $table->decimal('width', 15, 2)->nullable();
            $table->decimal('height', 15, 2)->nullable();
            $table->string('main_image_url')->nullable()->comment('Path to main image');
            $table->boolean('status')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
