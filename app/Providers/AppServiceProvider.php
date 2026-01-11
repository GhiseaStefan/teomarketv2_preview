<?php

namespace App\Providers;

use App\Listeners\MergeCartOnLogin;
use App\Models\Product;
use App\Observers\ProductObserver;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Support\Providers\EventServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(Login::class, MergeCartOnLogin::class);

        // Redirect to home after email verification
        // For admin/manager, redirect to admin panel
        Event::listen(Verified::class, function (Verified $event) {
            if (request()->expectsJson()) {
                return;
            }
            
            $user = $event->user;
            // Check if user is admin or manager by checking role directly
            if ($user && ($user->role === \App\Enums\UserRole::ADMIN || $user->role === \App\Enums\UserRole::MANAGER)) {
                redirect()->setIntendedUrl(route('admin.dashboard'));
            } else {
                redirect()->setIntendedUrl(route('home'));
            }
        });

        if ($this->app->environment('production') || !empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
            URL::forceScheme('https');
        }

        // Register model observers
        Product::observe(ProductObserver::class);
    }
}
