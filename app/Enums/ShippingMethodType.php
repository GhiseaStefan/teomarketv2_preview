<?php

namespace App\Enums;

enum ShippingMethodType: string
{
    case COURIER = 'courier';
    case PICKUP = 'pickup';
}

