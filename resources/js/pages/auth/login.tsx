import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './login.module.css';

interface LoginPageProps {
    canResetPassword?: boolean;
    canRegister?: boolean;
    status?: string;
    errors?: {
        email?: string;
        password?: string;
        [key: string]: string | undefined;
    };
}

export default function Login({ canResetPassword = false, canRegister = false, status }: LoginPageProps) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: LoginPageProps['errors'] }>();
    const errors = page.props.errors || {};
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setProcessing(true);
        
        router.post('/login', {
            email,
            password,
            remember,
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
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.loginHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Login')}</h1>
                    <p className={styles.subtitle}>{t('Login to your account')}</p>
                </div>

                {status && (
                    <div className={styles.statusMessage}>
                        {status}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.loginForm}>
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
                            autoComplete="current-password"
                            className={errors.password ? styles.inputError : ''}
                        />
                        {errors.password && (
                            <span className={styles.errorMessage}>{errors.password}</span>
                        )}
                    </div>

                    <div className={styles.formOptions}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span>{t('Remember me')}</span>
                        </label>

                        {canResetPassword && (
                            <a href="/forgot-password" className={styles.forgotPasswordLink}>
                                {t('Forgot password?')}
                            </a>
                        )}
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Logging in...') : t('Login')}
                    </Button>
                </form>

                {canRegister && (
                    <div className={styles.registerLink}>
                        <span>{t('Don\'t have an account?')}</span>
                        <a href="/register" className={styles.registerLinkAnchor}>
                            {t('Register')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

