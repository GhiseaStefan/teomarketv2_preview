<?php

namespace App\Notifications;

use App\Services\LoggingService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\URL;

class ResetPasswordNotification extends ResetPassword
{
    /**
     * Build the mail representation of the notification.
     * Override to log the reset link instead of sending email.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $url = $this->resetUrl($notifiable);

        // Log the reset password link (momentan - for now)
        if (request()) {
            LoggingService::logBusinessEvent(request(), 'auth.password_reset_link', [
                'user_id' => $notifiable->getKey(),
                'email' => $notifiable->getEmailForPasswordReset(),
                'reset_url' => $url,
            ]);
        }

        // Return the mail message (won't be sent if mail is not configured)
        return parent::toMail($notifiable);
    }

    /**
     * Get the reset URL for the given notifiable.
     *
     * @param  mixed  $notifiable
     * @return string
     */
    protected function resetUrl($notifiable)
    {
        return url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));
    }
}

