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
        Schema::create('shop_info', function (Blueprint $table) {
            $table->id();
            $table->string('shop_name');
            $table->string('company_name');
            $table->string('cui')->nullable();
            $table->string('reg_com')->nullable();
            $table->text('address');
            $table->string('city');
            $table->string('county');
            $table->foreignId('country_id')->constrained('countries')->onDelete('restrict');
            $table->string('email_contact');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_info');
    }
};
