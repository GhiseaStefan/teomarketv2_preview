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
        Schema::create('attribute_family', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attribute_id')->constrained('attributes')->onDelete('cascade');
            $table->foreignId('product_family_id')->constrained('product_families')->onDelete('cascade');
            $table->unsignedInteger('sort_order')->default(0)->after('product_family_id');
            $table->timestamps();

            // Ensure an attribute-family combination is unique
            $table->unique(['attribute_id', 'product_family_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attribute_family');
    }
};
