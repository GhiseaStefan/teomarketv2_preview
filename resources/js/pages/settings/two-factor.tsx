import { useState, useEffect, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { SettingsModalProvider } from '../../contexts/SettingsModalContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Shield, Smartphone, Key, Download, Copy, Check, AlertCircle, QrCode } from 'lucide-react';
import type { SharedData } from '../../types';
import styles from './two-factor.module.css';

interface TwoFactorPageProps {
    twoFactorEnabled: boolean;
    requiresConfirmation: boolean;
}

function TwoFactorContent({ twoFactorEnabled: initialTwoFactorEnabled, requiresConfirmation }: TwoFactorPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData>();

    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
    const [processing, setProcessing] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secretKey, setSecretKey] = useState<string | null>(null);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTwoFactorEnabled(initialTwoFactorEnabled);
    }, [initialTwoFactorEnabled]);

    const enableTwoFactor = async () => {
        setProcessing(true);
        setError(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch('/user/two-factor-authentication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to enable two-factor authentication');
            }

            // Get QR code and secret key
            const qrResponse = await fetch('/user/two-factor-qr-code', {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const qrData = await qrResponse.json();
            setQrCode(qrData.svg);

            const secretResponse = await fetch('/user/two-factor-secret-key', {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            const secretData = await secretResponse.json();
            setSecretKey(secretData.secretKey);

            setShowQrCode(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setProcessing(false);
        }
    };

    const confirmTwoFactor = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        router.post('/user/confirmed-two-factor-authentication', {
            code: confirmationCode,
        }, {
            preserveScroll: true,
            onSuccess: async () => {
                // Get recovery codes after successful confirmation
                try {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                    const recoveryResponse = await fetch('/user/two-factor-recovery-codes', {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        },
                        credentials: 'same-origin',
                    });

                    if (recoveryResponse.ok) {
                        const recoveryData = await recoveryResponse.json();
                        // Fortify returns recovery codes as an array directly, not wrapped in recoveryCodes
                        const codes = Array.isArray(recoveryData) ? recoveryData : (recoveryData.recoveryCodes || []);
                        setRecoveryCodes(codes);
                        // Show recovery codes modal immediately after activation
                        setShowRecoveryCodes(true);
                    }
                } catch (err) {
                    console.error('Error fetching recovery codes:', err);
                }

                setTwoFactorEnabled(true);
                setShowConfirmModal(false);
                setConfirmationCode('');
                router.reload({ only: ['twoFactorEnabled'] });
            },
            onError: (errors) => {
                const errorMessage = errors?.code || errors?.message || 'Invalid code';
                setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const disableTwoFactor = () => {
        if (!confirm(t('Are you sure you want to disable two-factor authentication?'))) {
            return;
        }

        setProcessing(true);
        setError(null);

        router.delete('/user/two-factor-authentication', {
            preserveScroll: true,
            onSuccess: () => {
                setTwoFactorEnabled(false);
                setQrCode(null);
                setSecretKey(null);
                setRecoveryCodes([]);
                router.reload({ only: ['twoFactorEnabled'] });
            },
            onError: (errors) => {
                const errorMessage = errors?.message || 'Failed to disable two-factor authentication';
                setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };


    const downloadRecoveryCodes = () => {
        const codesText = recoveryCodes.join('\n');
        const blob = new Blob([t('Two-Factor Authentication Recovery Codes') + '\n\n' + codesText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recovery-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copySecretKey = () => {
        if (secretKey) {
            navigator.clipboard.writeText(secretKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.twoFactorContainer}>
                    <div className={styles.twoFactorCard}>
                        <div className={styles.twoFactorHeader}>
                            <div className={styles.headerIcon}>
                                <Shield size={32} />
                            </div>
                            <div className={styles.headerContent}>
                                <h2 className={styles.twoFactorTitle}>{t('Two-Factor Authentication')}</h2>
                                <p className={styles.twoFactorDescription}>
                                    {t('Add an extra layer of security to your account')}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className={styles.errorAlert}>
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Status Section */}
                        <div className={styles.statusSection}>
                            <div className={styles.statusInfo}>
                                <div className={styles.statusIcon}>
                                    <Smartphone size={24} />
                                </div>
                                <div className={styles.statusContent}>
                                    <h3 className={styles.statusTitle}>
                                        {twoFactorEnabled ? t('Two-Factor Authentication is Enabled') : t('Two-Factor Authentication is Disabled')}
                                    </h3>
                                    <p className={styles.statusDescription}>
                                        {twoFactorEnabled
                                            ? t('Your account is protected with two-factor authentication')
                                            : t('Enable two-factor authentication to add an extra layer of security')
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className={styles.statusActions}>
                                {!twoFactorEnabled ? (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={enableTwoFactor}
                                        disabled={processing}
                                    >
                                        {processing ? t('Enabling...') : t('Enable Two-Factor Authentication')}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        onClick={disableTwoFactor}
                                        disabled={processing}
                                    >
                                        {processing ? t('Disabling...') : t('Disable Two-Factor Authentication')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Setup Instructions (shown when enabling) */}
                        {showQrCode && !twoFactorEnabled && (
                            <div className={styles.setupSection}>
                                <h3 className={styles.setupTitle}>{t('Setup Instructions')}</h3>
                                <ol className={styles.setupSteps}>
                                    <li>{t('Scan the QR code below with your authenticator app')}</li>
                                    <li>{t('Enter the code from your authenticator app to confirm')}</li>
                                    <li>{t('Save your recovery codes in a safe place')}</li>
                                </ol>

                                {qrCode && (
                                    <div className={styles.qrCodeSection}>
                                        <div className={styles.qrCodeWrapper}>
                                            <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                                        </div>
                                    </div>
                                )}

                                {secretKey && (
                                    <div className={styles.secretKeySection}>
                                        <label className={styles.secretKeyLabel}>
                                            {t('Or enter this code manually')}:
                                        </label>
                                        <div className={styles.secretKeyInput}>
                                            <code className={styles.secretKeyText}>{secretKey}</code>
                                            <Button
                                                variant="icon"
                                                size="sm"
                                                onClick={copySecretKey}
                                                title={t('Copy')}
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.confirmButtonWrapper}>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => setShowConfirmModal(true)}
                                    >
                                        {t('Confirm Setup')}
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Confirmation Modal */}
                <Modal
                    isOpen={showConfirmModal}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setConfirmationCode('');
                        setError(null);
                    }}
                    title={t('Confirm Two-Factor Authentication')}
                >
                    <form onSubmit={confirmTwoFactor} className={styles.confirmForm}>
                        <p className={styles.confirmDescription}>
                            {t('Enter the code from your authenticator app to complete the setup')}
                        </p>
                        {error && (
                            <div className={styles.errorAlert}>
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className={styles.confirmInputGroup}>
                            <Input
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder={t('Enter code')}
                                required
                                autoFocus
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className={styles.confirmInput}
                            />
                        </div>
                        <div className={styles.confirmActions}>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setConfirmationCode('');
                                    setError(null);
                                }}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={processing || !confirmationCode}
                            >
                                {processing ? t('Confirming...') : t('Confirm')}
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* Recovery Codes Modal - Shown only once after activation */}
                <Modal
                    isOpen={showRecoveryCodes}
                    onClose={() => {
                        setShowRecoveryCodes(false);
                        // Clear recovery codes after closing - they won't be shown again
                        setRecoveryCodes([]);
                    }}
                    title={t('Recovery Codes')}
                    closeOnOverlayClick={false}
                >
                    <div className={styles.recoveryCodesModal}>
                        <div className={styles.recoveryCodesCriticalWarning}>
                            <AlertCircle size={24} />
                            <div>
                                <p className={styles.recoveryCodesWarningTitle}>
                                    {t('Important: Download these codes now!')}
                                </p>
                                <p className={styles.recoveryCodesWarningText}>
                                    {t('These recovery codes will only be shown once. If you lose access to your authenticator device, you will need these codes to access your account. Each code can only be used once.')}
                                </p>
                            </div>
                        </div>
                        <div className={styles.recoveryCodesList}>
                            {recoveryCodes.map((code, index) => (
                                <div key={index} className={styles.recoveryCodeItem}>
                                    <code>{code}</code>
                                </div>
                            ))}
                        </div>
                        <div className={styles.recoveryCodesActions}>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    downloadRecoveryCodes();
                                }}
                            >
                                <Download size={16} style={{ marginRight: '8px' }} />
                                {t('Download')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowRecoveryCodes(false);
                                    setRecoveryCodes([]);
                                }}
                            >
                                {t('I have saved them')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </SettingsLayout>
        </Layout>
    );
}

export default function TwoFactor({ twoFactorEnabled, requiresConfirmation }: TwoFactorPageProps) {
    return (
        <SettingsModalProvider>
            <TwoFactorContent twoFactorEnabled={twoFactorEnabled} requiresConfirmation={requiresConfirmation} />
        </SettingsModalProvider>
    );
}
