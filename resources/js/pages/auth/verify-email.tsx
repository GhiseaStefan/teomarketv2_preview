import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import styles from './verify-email.module.css';

interface VerifyEmailPageProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailPageProps) {
    const { t } = useTranslations();
    const page = usePage();
    const user = (page.props as any).auth?.user;
    
    const [processing, setProcessing] = useState(false);

    const handleResend = () => {
        setProcessing(true);
        
        router.post('/email/verification-notification', {}, {
            onFinish: () => {
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <div className={styles.verifyEmailContainer}>
            <div className={styles.verifyEmailCard}>
                <div className={styles.verifyEmailHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Verify Your Email')}</h1>
                    <p className={styles.subtitle}>
                        {t('Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you?')}
                    </p>
                    {user?.email && (
                        <p className={styles.emailInfo}>
                            {t('We sent the verification link to')} <strong>{user.email}</strong>
                        </p>
                    )}
                </div>

                {status && (
                    <div className={styles.statusMessage}>
                        {status}
                    </div>
                )}

                <div className={styles.actions}>
                    <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className={styles.resendButton}
                        onClick={handleResend}
                        disabled={processing}
                    >
                        {processing ? t('Sending...') : t('Resend Verification Email')}
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className={styles.logoutButton}
                        onClick={() => router.post('/logout')}
                    >
                        {t('Logout')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

