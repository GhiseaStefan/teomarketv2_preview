<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LanguageController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/categories', [\App\Http\Controllers\CategoryController::class, 'index'])->name('categories.index');
Route::get('/categories/{slug}', [\App\Http\Controllers\CategoryController::class, 'show'])->name('categories.show');
Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index'])->name('products.index');
Route::get('/products/autocomplete', [\App\Http\Controllers\ProductController::class, 'autocomplete'])->name('products.autocomplete');
Route::get('/products/{id}/price', [\App\Http\Controllers\ProductController::class, 'getPrice'])->name('products.price');
Route::get('/products/{id}/quick-view', [\App\Http\Controllers\ProductController::class, 'quickView'])->name('products.quick-view');
Route::get('/products/{id}', [\App\Http\Controllers\ProductController::class, 'show'])->name('products.show');
Route::post('/currency/update', [CurrencyController::class, 'update'])->name('currency.update');
Route::post('/language/update', [LanguageController::class, 'update'])->name('language.update');

// Auth routes
Route::post('/auth/check-email', [AuthController::class, 'checkEmail'])->name('auth.check-email');
Route::post('/auth/validate-cui', [AuthController::class, 'validateCui'])->name('auth.validate-cui');
Route::post('/auth/get-company-data', [AuthController::class, 'getCompanyData'])->name('auth.get-company-data');

// Cart routes
Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
Route::post('/cart/add', [CartController::class, 'add'])->name('cart.add');
Route::put('/cart/{cartKey}', [CartController::class, 'update'])->name('cart.update');
Route::delete('/cart/{cartKey}', [CartController::class, 'remove'])->name('cart.remove');
Route::post('/cart/clear', [CartController::class, 'clear'])->name('cart.clear');
Route::get('/cart/summary', [CartController::class, 'summary'])->name('cart.summary');

// Checkout routes
Route::get('/checkout/order-details', [CheckoutController::class, 'orderDetails'])->name('checkout.order-details');
Route::post('/checkout/update-cart-for-shipping-country', [CheckoutController::class, 'updateCartForShippingCountry'])->name('checkout.update-cart-for-shipping-country');
Route::post('/checkout/update-cart-for-billing-country', [CheckoutController::class, 'updateCartForBillingCountry'])->name('checkout.update-cart-for-billing-country');
Route::post('/checkout/save-pickup-data', [CheckoutController::class, 'savePickupData'])->name('checkout.save-pickup-data');
Route::post('/checkout/save-guest-contact', [CheckoutController::class, 'saveGuestContact'])->name('checkout.save-guest-contact');
Route::post('/checkout/save-guest-address', [CheckoutController::class, 'saveGuestAddress'])->name('checkout.save-guest-address');
Route::post('/checkout/submit-order', [CheckoutController::class, 'submitOrder'])->name('checkout.submit-order');
Route::get('/checkout/order-placed', [CheckoutController::class, 'orderPlaced'])->name('checkout.order-placed');

// Wishlist routes
Route::get('/wishlist', [\App\Http\Controllers\WishlistController::class, 'index'])->name('wishlist.index');
Route::post('/wishlist/add', [\App\Http\Controllers\WishlistController::class, 'add'])->name('wishlist.add');
Route::delete('/wishlist/{productId}', [\App\Http\Controllers\WishlistController::class, 'remove'])->name('wishlist.remove');
Route::get('/wishlist/{productId}/check', [\App\Http\Controllers\WishlistController::class, 'check'])->name('wishlist.check');

// Review routes
Route::middleware('auth')->group(function () {
    Route::get('/reviews', [\App\Http\Controllers\ReviewController::class, 'index'])->name('reviews.index');
    Route::post('/reviews', [\App\Http\Controllers\ReviewController::class, 'store'])->name('reviews.store');
    Route::post('/reviews/{reviewId}/useful', [\App\Http\Controllers\ReviewController::class, 'markUseful'])->name('reviews.markUseful');
});
Route::get('/products/{productId}/reviews', [\App\Http\Controllers\ReviewController::class, 'getProductReviews'])->name('reviews.product');

// Return routes
Route::get('/returns/create', [\App\Http\Controllers\ReturnController::class, 'create'])->name('returns.create');
Route::post('/returns/search-order', [\App\Http\Controllers\ReturnController::class, 'searchOrder'])->middleware('throttle:5,1')->name('returns.search-order');
Route::post('/returns', [\App\Http\Controllers\ReturnController::class, 'store'])->name('returns.store');
Route::get('/returns/confirmation', [\App\Http\Controllers\ReturnController::class, 'confirmation'])->name('returns.confirmation');

require __DIR__ . '/settings.php';
