import { useState, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './two-factor-challenge.module.css';

interface TwoFactorChallengePageProps {
    errors?: {
        code?: string;
        recovery_code?: string;
        [key: string]: string | undefined;
    };
}

export default function TwoFactorChallenge({}: TwoFactorChallengePageProps) {
    const { t } = useTranslations();
    const page = usePage<{ errors?: TwoFactorChallengePageProps['errors'] }>();
    const errors = page.props.errors || {};
    
    const [code, setCode] = useState('');
    const [recovery_code, setRecoveryCode] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setProcessing(true);
        
        router.post('/two-factor-challenge', {
            [useRecoveryCode ? 'recovery_code' : 'code']: useRecoveryCode ? recovery_code : code,
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
        <div className={styles.twoFactorContainer}>
            <div className={styles.twoFactorCard}>
                <div className={styles.twoFactorHeader}>
                    <img src="/logo.png" alt="Logo" className={styles.logo} />
                    <h1 className={styles.title}>{t('Two Factor Authentication')}</h1>
                    <p className={styles.subtitle}>
                        {useRecoveryCode 
                            ? t('Please confirm access to your account by entering one of your emergency recovery codes')
                            : t('Please confirm access to your account by entering the authentication code provided by your authenticator application')
                        }
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.twoFactorForm}>
                    {!useRecoveryCode ? (
                        <div className={styles.formGroup}>
                            <label htmlFor="code" className={styles.label}>
                                {t('Code')}
                            </label>
                            <Input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                autoFocus
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={errors.code ? styles.inputError : ''}
                            />
                            {errors.code && (
                                <span className={styles.errorMessage}>{errors.code}</span>
                            )}
                        </div>
                    ) : (
                        <div className={styles.formGroup}>
                            <label htmlFor="recovery_code" className={styles.label}>
                                {t('Recovery Code')}
                            </label>
                            <Input
                                id="recovery_code"
                                type="text"
                                value={recovery_code}
                                onChange={(e) => setRecoveryCode(e.target.value)}
                                required
                                autoFocus
                                className={errors.recovery_code ? styles.inputError : ''}
                            />
                            {errors.recovery_code && (
                                <span className={styles.errorMessage}>{errors.recovery_code}</span>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Verifying...') : t('Verify')}
                    </Button>
                </form>

                <div className={styles.switchLink}>
                    <button
                        type="button"
                        onClick={() => {
                            setUseRecoveryCode(!useRecoveryCode);
                            setCode('');
                            setRecoveryCode('');
                        }}
                        className={styles.switchButton}
                    >
                        {useRecoveryCode 
                            ? t('Use an authentication code instead')
                            : t('Use a recovery code instead')
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

