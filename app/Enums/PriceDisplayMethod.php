<?php

namespace App\Enums;

enum PriceDisplayMethod: string
{
    case TAX_INCLUDED = 'tax_included';
    case TAX_EXCLUDED = 'tax_excluded';
}

