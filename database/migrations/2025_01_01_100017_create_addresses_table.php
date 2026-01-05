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
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->boolean('is_preferred')->default(false);
            $table->string('address_type')->default('shipping')->comment('shipping, headquarters, or billing');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone');
            $table->string('address_line_1');
            $table->string('address_line_2')->nullable();
            $table->string('city');
            $table->string('county_name')->nullable()->comment('e.g., Cluj');
            $table->string('county_code', 2)->nullable()->comment('e.g., CJ - important for courier integrations');
            $table->foreignId('country_id')->constrained('countries')->onDelete('restrict');
            $table->string('zip_code');
            $table->timestamps();

            $table->index(['customer_id', 'address_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
