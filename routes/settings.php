<?php

use App\Http\Controllers\Settings\AddressController;
use App\Http\Controllers\Settings\OrderController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\ReturnController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;

// States and cities routes (for dropdowns - accessible without auth for registration form)
Route::get('settings/states/{countryId}', [ProfileController::class, 'getStates'])->name('states.get');
Route::get('settings/cities/{stateId}', [ProfileController::class, 'getCities'])->name('cities.get');
Route::get('settings/detected-country', [ProfileController::class, 'getDetectedCountry'])->name('detected-country.get');

Route::middleware('auth')->group(function () {
    // Settings routes will be added here
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('settings/profile/company-info', [ProfileController::class, 'updateCompanyInfo'])->name('profile.update-company-info');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Billing routes
    Route::get('settings/billing', [ProfileController::class, 'editBilling'])->name('billing.edit');
    Route::post('settings/billing/addresses', [ProfileController::class, 'storeBillingAddress'])->name('billing.addresses.store');
    Route::put('settings/billing/addresses/{id}', [ProfileController::class, 'updateBillingAddress'])->name('billing.addresses.update');
    Route::delete('settings/billing/addresses/{id}', [ProfileController::class, 'destroyBillingAddress'])->name('billing.addresses.destroy');

    // Address routes
    Route::get('settings/addresses', [AddressController::class, 'index'])->name('addresses.index');
    Route::post('settings/addresses', [AddressController::class, 'store'])->name('addresses.store');
    Route::put('settings/addresses/{id}', [AddressController::class, 'update'])->name('addresses.update');
    Route::delete('settings/addresses/{id}', [AddressController::class, 'destroy'])->name('addresses.destroy');
    Route::post('settings/addresses/{id}/set-preferred', [AddressController::class, 'setPreferred'])->name('addresses.set-preferred');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/security', [PasswordController::class, 'edit'])->name('security.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])->name('two-factor.show');

    // Order history
    Route::get('settings/history/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('settings/history/orders/search', [OrderController::class, 'search'])->name('orders.search');
    Route::get('settings/history/orders/{id}', [OrderController::class, 'show'])->name('orders.show');

    // Returns history
    Route::get('settings/returns', [ReturnController::class, 'index'])->name('returns.index');
});
