<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attribute extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'type',
        'is_filterable',
    ];

    protected $casts = [
        'is_filterable' => 'boolean',
    ];

    /**
     * Get the attribute values for this attribute.
     */
    public function values(): HasMany
    {
        return $this->hasMany(AttributeValue::class)->orderBy('sort_order');
    }

    /**
     * Get the product attribute values for this attribute.
     */
    public function productAttributeValues(): HasMany
    {
        return $this->hasMany(ProductAttributeValue::class);
    }

    /**
     * Get the families that this attribute belongs to.
     */
    public function families(): BelongsToMany
    {
        return $this->belongsToMany(ProductFamily::class, 'attribute_family')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order', 'asc');
    }
}
