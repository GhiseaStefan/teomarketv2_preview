<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrdersController;
use App\Http\Controllers\Admin\CustomersController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\ProductsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role.admin_or_manager'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/orders', [OrdersController::class, 'index'])->name('orders');
    Route::get('/orders/{orderNumber}', [OrdersController::class, 'show'])->name('orders.show');
    Route::post('/orders/{orderNumber}/mark-as-paid', [OrdersController::class, 'markAsPaid'])->name('orders.mark-as-paid');
    Route::post('/orders/{orderNumber}/mark-as-unpaid', [OrdersController::class, 'markAsUnpaid'])->name('orders.mark-as-unpaid');
    Route::get('/customers', [CustomersController::class, 'index'])->name('customers');
    Route::get('/customers/{id}', [CustomersController::class, 'show'])->name('customers.show');
    Route::post('/customers/deactivate', [CustomersController::class, 'deactivate'])->name('customers.deactivate');
    Route::post('/customers/activate', [CustomersController::class, 'activate'])->name('customers.activate');
    Route::get('/users', [UsersController::class, 'index'])->name('users');
    Route::post('/users/deactivate', [UsersController::class, 'deactivate'])->name('users.deactivate');
    Route::post('/users/activate', [UsersController::class, 'activate'])->name('users.activate');
    Route::get('/products', [ProductsController::class, 'index'])->name('products');
    Route::get('/products/{id}', [ProductsController::class, 'show'])->name('products.show');
    Route::put('/products/{id}', [ProductsController::class, 'update'])->name('products.update');
    Route::post('/products/{id}/images', [ProductsController::class, 'storeImage'])->name('products.images.store');
});
