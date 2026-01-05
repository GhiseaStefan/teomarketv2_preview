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
        Schema::create('category_path', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->foreignId('path_id')->constrained('categories')->onDelete('cascade')->comment('Parent or ancestor category ID');
            $table->unsignedInteger('level')->comment('Depth in tree');
            $table->timestamps();

            $table->unique(['category_id', 'path_id']);
            $table->index(['category_id', 'level']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('category_path');
    }
};
