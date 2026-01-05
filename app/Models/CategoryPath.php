<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryPath extends Model
{
    use HasFactory;

    protected $table = 'category_path';

    protected $fillable = [
        'category_id',
        'path_id',
        'level',
    ];

    protected $casts = [
        'level' => 'integer',
    ];

    /**
     * Get the category.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Get the path category (parent or ancestor).
     */
    public function pathCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'path_id');
    }
}
