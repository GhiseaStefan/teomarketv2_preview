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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->enum('customer_type', ['individual', 'company'])->default('individual');
            $table->foreignId('customer_group_id')->nullable()->constrained('customer_groups')->onDelete('set null');
            $table->string('company_name')->nullable()->comment('Only for B2B');
            $table->string('reg_number')->nullable()->comment('J-number - Only for B2B');
            $table->string('fiscal_code')->nullable()->comment('CUI/VAT - Only for B2B');
            $table->string('phone')->nullable();
            $table->string('bank_name')->nullable()->comment('Bank name - Only for B2B');
            $table->string('iban')->nullable()->comment('IBAN account - Only for B2B');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
