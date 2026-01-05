<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VatRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'country_id',
        'rate',
        'description',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
    ];

    /**
     * Get the country that owns this VAT rate.
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }
}
