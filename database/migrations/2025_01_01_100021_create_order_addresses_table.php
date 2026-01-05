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
        Schema::create('order_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->string('type')->comment('billing or shipping');
            $table->string('company_name')->nullable()->comment('If delivery is to company');
            $table->string('fiscal_code')->nullable()->comment('If invoice is to company');
            $table->string('reg_number')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('address_line_1');
            $table->string('address_line_2')->nullable();
            $table->string('city');
            $table->string('county_name')->nullable()->comment('e.g., Cluj');
            $table->string('county_code', 2)->nullable()->comment('e.g., CJ - important for courier integrations');
            $table->foreignId('country_id')->constrained('countries')->onDelete('restrict');
            $table->string('zip_code');
            $table->timestamps();

            $table->index(['order_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_addresses');
    }
};
