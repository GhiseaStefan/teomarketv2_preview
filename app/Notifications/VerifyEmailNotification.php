<?php

namespace App\Notifications;

use App\Services\LoggingService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends VerifyEmail
{
    /**
     * Get the verification URL for the given notifiable.
     *
     * @param  mixed  $notifiable
     * @return string
     */
    protected function verificationUrl($notifiable)
    {
        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())]
        );

        // Log the verification link (momentan - for now)
        if (request()) {
            LoggingService::logBusinessEvent(request(), 'auth.email_verification_link', [
                'user_id' => $notifiable->getKey(),
                'email' => $notifiable->getEmailForVerification(),
                'verification_url' => $url,
            ]);
        }

        return $url;
    }
}

