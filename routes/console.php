<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule currency exchange rates update daily at 10:00 AM
Schedule::command('currency:update-rates')
    ->dailyAt('10:00')
    ->timezone('Europe/Bucharest')
    ->withoutOverlapping()
    ->runInBackground();

// Schedule cleanup of old converted carts daily at 02:00 AM
Schedule::command('carts:cleanup')
    ->dailyAt('02:00')
    ->timezone('Europe/Bucharest')
    ->withoutOverlapping()
    ->runInBackground();
