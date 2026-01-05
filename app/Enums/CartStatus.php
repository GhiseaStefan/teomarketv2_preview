<?php

namespace App\Enums;

enum CartStatus: string
{
    case ACTIVE = 'active';
    case CONVERTED = 'converted';
    case ABANDONED = 'abandoned';
}

