import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './confirm-password.module.css';

interface ConfirmPasswordPageProps {
    errors?: {
        password?: string;
        [key: string]: string | undefined;
    };
}

export default function ConfirmPassword({}: ConfirmPasswordPageProps) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: ConfirmPasswordPageProps['errors'] }>();
    const errors = page.props.errors || {};
    
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setProcessing(true);
        
        router.post('/user/confirm-password', {
            password,
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
        <div className={styles.confirmPasswordContainer}>
            <div className={styles.confirmPasswordCard}>
                <div className={styles.confirmPasswordHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Confirm Password')}</h1>
                    <p className={styles.subtitle}>{t('This is a secure area of the application. Please confirm your password before continuing')}</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.confirmPasswordForm}>
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
                            autoFocus
                            autoComplete="current-password"
                            className={errors.password ? styles.inputError : ''}
                        />
                        {errors.password && (
                            <span className={styles.errorMessage}>{errors.password}</span>
                        )}
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Confirming...') : t('Confirm')}
                    </Button>
                </form>
            </div>
        </div>
    );
}

