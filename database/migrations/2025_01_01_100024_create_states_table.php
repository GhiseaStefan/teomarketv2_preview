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
        Schema::create('states', function (Blueprint $table) {
            $table->id();
            // Legătura cu tabela existentă de țări
            $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');

            $table->string('name');      // Ex: București
            $table->string('code')->nullable(); // Ex: B (pentru București), sau un cod ISO regional

            // Index pentru performanță la căutare
            $table->index('country_id');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('states');
    }
};
