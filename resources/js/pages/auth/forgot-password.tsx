import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './forgot-password.module.css';

interface ForgotPasswordPageProps {
    status?: string;
    errors?: {
        email?: string;
        [key: string]: string | undefined;
    };
}

export default function ForgotPassword({ status }: ForgotPasswordPageProps) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: ForgotPasswordPageProps['errors'] }>();
    const errors = page.props.errors || {};
    
    const [email, setEmail] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setProcessing(true);
        
        router.post('/forgot-password', {
            email,
        }, {
            onFinish: () => {
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <div className={styles.forgotPasswordContainer}>
            <div className={styles.forgotPasswordCard}>
                <div className={styles.forgotPasswordHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Forgot Password')}</h1>
                    <p className={styles.subtitle}>{t('Enter your email address and we will send you a password reset link')}</p>
                </div>

                {status && (
                    <div className={styles.statusMessage}>
                        {status}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.forgotPasswordForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>
                            {t('Email')}
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            autoComplete="email"
                            className={errors.email ? styles.inputError : ''}
                        />
                        {errors.email && (
                            <span className={styles.errorMessage}>{errors.email}</span>
                        )}
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Sending...') : t('Send Password Reset Link')}
                    </Button>
                </form>

                <div className={styles.backLink}>
                    <a href="/login" className={styles.backLinkAnchor}>
                        {t('Back to login')}
                    </a>
                </div>
            </div>
        </div>
    );
}

