<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductFamily extends Model
{
    use HasFactory;

    protected $table = 'product_families';

    protected $fillable = [
        'name',
        'code',
        'status',
    ];

    protected $casts = [
        'status' => 'boolean',
    ];

    /**
     * Get the attributes that belong to this family.
     */
    public function attributes(): BelongsToMany
    {
        return $this->belongsToMany(Attribute::class, 'attribute_family')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order', 'asc');
    }

    /**
     * Get the products that belong to this family.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'family_id');
    }
}
