import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './reset-password.module.css';

interface ResetPasswordPageProps {
    email: string;
    token: string;
    errors?: {
        email?: string;
        password?: string;
        [key: string]: string | undefined;
    };
}

export default function ResetPassword({ email: initialEmail, token }: ResetPasswordPageProps) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: ResetPasswordPageProps['errors'] }>();
    const errors = page.props.errors || {};
    
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [password_confirmation, setPasswordConfirmation] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setProcessing(true);
        
        router.post('/reset-password', {
            token,
            email,
            password,
            password_confirmation,
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
        <div className={styles.resetPasswordContainer}>
            <div className={styles.resetPasswordCard}>
                <div className={styles.resetPasswordHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Reset Password')}</h1>
                    <p className={styles.subtitle}>{t('Enter your new password')}</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.resetPasswordForm}>
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

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>
                            {t('Password')}
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            className={errors.password ? styles.inputError : ''}
                        />
                        {errors.password && (
                            <span className={styles.errorMessage}>{errors.password}</span>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password_confirmation" className={styles.label}>
                            {t('Confirm Password')}
                        </label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            value={password_confirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Resetting...') : t('Reset Password')}
                    </Button>
                </form>
            </div>
        </div>
    );
}

