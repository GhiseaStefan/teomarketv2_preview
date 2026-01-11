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
        Schema::create('attributes', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('Ex: "Mărime", "Culoare"');
            $table->string('code')->unique()->comment('Ex: "size", "color" - pentru cod');
            $table->string('type')->comment('Ex: select, text, color_swatch');
            $table->boolean('is_filterable')->default(false)->comment('Dacă apare în filtrele din stânga în categorie');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attributes');
    }
};
