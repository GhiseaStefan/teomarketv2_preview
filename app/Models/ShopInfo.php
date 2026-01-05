<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopInfo extends Model
{
    use HasFactory;

    protected $table = 'shop_info';

    protected $fillable = [
        'shop_name',
        'company_name',
        'cui',
        'reg_com',
        'address',
        'city',
        'county',
        'country_id',
        'email_contact',
    ];

    /**
     * Get the country that owns this shop info.
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }
}
