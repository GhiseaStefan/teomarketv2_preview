import { router } from '@inertiajs/react';
import { ArrowLeft, Package, User, Mail, Phone, Calendar, FileText, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useEdit } from '../../../contexts/EditContext';
import { Input } from '../../../components/ui/Input';
import styles from './show.module.css';

interface ReturnShowPageProps {
    return: {
        id: number;
        return_number: string;
        order_id: number;
        order_product_id: number;
        order_number: string;
        order_date: string;
        order_date_formatted: string;
        status: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        product_name: string;
        product_sku: string;
        quantity: number;
        return_reason: string;
        return_reason_details: string | null;
        is_product_opened: string;
        iban: string;
        refund_amount: number | null;
        restock_item: boolean;
        created_at: string;
        created_at_formatted: string;
        updated_at: string;
        updated_at_formatted: string;
    };
    statuses: string[];
}

function ReturnShowContent({ return: returnItem, statuses }: ReturnShowPageProps) {
    const { t } = useTranslations();
    const { setHasUnsavedChanges, setSaveHandler, setDiscardHandler } = useEdit();
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localStatus, setLocalStatus] = useState<string>(returnItem.status);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const initialStatus = useRef<string>(returnItem.status);
    
    const [localRefundAmount, setLocalRefundAmount] = useState<string>(returnItem.refund_amount?.toString() || '');
    const initialRefundAmount = useRef<number | null>(returnItem.refund_amount);
    
    const [localRestockItem, setLocalRestockItem] = useState<boolean>(returnItem.restock_item ?? false);
    const initialRestockItem = useRef<boolean>(returnItem.restock_item ?? false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
        };

        if (showStatusDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showStatusDropdown]);

    const getStatusBadgeStyle = (statusValue: string) => {
        const colors: Record<string, { bg: string; color: string; border: string }> = {
            pending: { bg: '#fef3c720', color: '#f59e0b', border: '#f59e0b' },
            received: { bg: '#f3e8ff20', color: '#8b5cf6', border: '#8b5cf6' },
            inspecting: { bg: '#fce7f320', color: '#ec4899', border: '#ec4899' },
            rejected: { bg: '#ef444420', color: '#ef4444', border: '#ef4444' },
            completed: { bg: '#6b728020', color: '#6b7280', border: '#6b7280' },
        };
        
        const colorScheme = colors[statusValue] || colors.pending;
        return {
            backgroundColor: colorScheme.bg,
            color: colorScheme.color,
            borderColor: colorScheme.border,
        };
    };

    const handleStatusChange = (newStatus: string) => {
        if (newStatus === localStatus) {
            setShowStatusDropdown(false);
            return;
        }

        setLocalStatus(newStatus);
        setShowStatusDropdown(false);
        // hasUnsavedChanges will be updated by useEffect
    };

    const hasChanges = useCallback(() => {
        const statusChanged = localStatus !== initialStatus.current;
        const numValue = localRefundAmount.trim() === '' ? null : parseFloat(localRefundAmount);
        const refundAmountChanged = (numValue === null && initialRefundAmount.current !== null) ||
            (numValue !== null && initialRefundAmount.current === null) ||
            (numValue !== null && initialRefundAmount.current !== null && Math.abs(numValue - initialRefundAmount.current) >= 0.01);
        const restockItemChanged = localRestockItem !== initialRestockItem.current;
        return statusChanged || refundAmountChanged || restockItemChanged;
    }, [localStatus, localRefundAmount, localRestockItem]);

    const handleSave = useCallback(async () => {
        if (isSaving) return;
        if (!hasChanges()) {
            setHasUnsavedChanges(false);
            return;
        }

        setIsSaving(true);
        try {
            const promises = [];
            
            // Save status if changed
            if (localStatus !== initialStatus.current) {
                promises.push(
                    router.put(`/admin/returns/${returnItem.id}/status`, { status: localStatus }, {
                        preserveState: true,
                        preserveScroll: true,
                    })
                );
            }
            
                // Save refund amount if changed
                const numValue = localRefundAmount.trim() === '' ? null : parseFloat(localRefundAmount);
                const numValueValid = numValue === null || (!isNaN(numValue) && numValue >= 0);
                if (numValueValid) {
                    const refundAmountChanged = (numValue === null && initialRefundAmount.current !== null) ||
                        (numValue !== null && initialRefundAmount.current === null) ||
                        (numValue !== null && initialRefundAmount.current !== null && Math.abs(numValue - initialRefundAmount.current) >= 0.01);
                    
                    if (refundAmountChanged) {
                        promises.push(
                            router.put(`/admin/returns/${returnItem.id}/refund-amount`, { refund_amount: numValue }, {
                                preserveState: true,
                                preserveScroll: true,
                            })
                        );
                    }
                }
                
                // Save restock item if changed
                if (localRestockItem !== initialRestockItem.current) {
                    promises.push(
                        router.put(`/admin/returns/${returnItem.id}/restock-item`, { restock_item: localRestockItem }, {
                            preserveState: true,
                            preserveScroll: true,
                        })
                    );
                }

            if (promises.length > 0) {
                await Promise.all(promises);
                // Update initial values on success
                initialStatus.current = localStatus;
                initialRefundAmount.current = numValue && numValueValid ? numValue : null;
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error('Error saving changes:', error);
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, localStatus, localRefundAmount, returnItem.id, setHasUnsavedChanges, hasChanges]);

    const handleDiscard = useCallback(() => {
        setLocalStatus(initialStatus.current);
        setLocalRefundAmount(initialRefundAmount.current?.toString() || '');
        setLocalRestockItem(initialRestockItem.current);
        setHasUnsavedChanges(false);
    }, [setHasUnsavedChanges]);

    const handleRefundAmountChange = (value: string) => {
        // Allow only numbers, decimal point, and empty string
        // Remove any non-numeric characters except decimal point
        const sanitized = value.replace(/[^0-9.]/g, '');
        
        // Ensure only one decimal point
        const parts = sanitized.split('.');
        let finalValue = sanitized;
        if (parts.length > 2) {
            finalValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        setLocalRefundAmount(finalValue);
        // hasUnsavedChanges will be updated by useEffect
    };

        // Update hasUnsavedChanges when values change
        useEffect(() => {
            setHasUnsavedChanges(hasChanges());
        }, [localStatus, localRefundAmount, localRestockItem, setHasUnsavedChanges, hasChanges]);

    // Set up save and discard handlers
    useEffect(() => {
        setSaveHandler(() => handleSave);
        setDiscardHandler(() => handleDiscard);

        return () => {
            setSaveHandler(null);
            setDiscardHandler(null);
        };
    }, [handleSave, handleDiscard, setSaveHandler, setDiscardHandler]);

    const getReturnReasonText = (reason: string) => {
        const reasons: Record<string, string> = {
            other: t('Other', 'Alta'),
            wrong_product: t('Wrong product', 'Produs gresit'),
            defect: t('Defect', 'Defect'),
            order_error: t('Order error', 'Eroare comanda'),
            sealed_return: t('Sealed return', 'Return sigilat'),
        };
        return reasons[reason] || reason;
    };

    return (
        <div className={styles.returnShowPage}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {/* Breadcrumb */}
                        <nav className={styles.breadcrumb}>
                            <a 
                                href="/admin/returns" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    router.get('/admin/returns'); 
                                }}
                                className={styles.breadcrumbLink}
                            >
                                {t('Returns', 'Returnuri')}
                            </a>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <span className={styles.breadcrumbCurrent}>
                                {returnItem.return_number}
                            </span>
                        </nav>
                        <div className={styles.returnTitle}>
                            <h1 className={styles.returnNumber}>{returnItem.return_number}</h1>
                            <span
                                className={styles.statusBadge}
                                style={getStatusBadgeStyle(localStatus)}
                            >
                                {t(localStatus, localStatus)}
                            </span>
                            <a
                                href={`/admin/orders/${returnItem.order_number}`}
                                className={styles.orderLink}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.get(`/admin/orders/${returnItem.order_number}`);
                                }}
                            >
                                {t('Order', 'Comanda')}: {returnItem.order_number}
                            </a>
                        </div>
                    </div>
                    <div className={styles.headerActions} ref={statusDropdownRef}>
                        <button
                            className={styles.actionsDropdownButton}
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            disabled={isSaving}
                        >
                            <span>{t('Update Status', 'Actualizeaza Status')}</span>
                            <ChevronDown size={16} className={showStatusDropdown ? styles.chevronRotated : ''} />
                        </button>
                        {showStatusDropdown && (
                            <div className={styles.actionsDropdownMenu}>
                                {statuses.map((statusValue) => (
                                    <button
                                        key={statusValue}
                                        className={`${styles.actionDropdownItem} ${localStatus === statusValue ? styles.actionDropdownItemActive : ''}`}
                                        onClick={() => handleStatusChange(statusValue)}
                                        disabled={isSaving}
                                    >
                                        {t(statusValue, statusValue)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {/* Left Column */}
                    <div className={styles.leftColumn}>
                        {/* Return Information */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <FileText size={18} />
                                {t('Return Information', 'Informatii Return')}
                            </h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <strong>{t('Order Number', 'Numar Comanda')}:</strong>
                                    <span>{returnItem.order_number}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Order Date', 'Data Comanda')}:</strong>
                                    <span>{returnItem.order_date_formatted}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Created At', 'Creat la')}:</strong>
                                    <span>{returnItem.created_at_formatted}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Last Updated', 'Ultima actualizare')}:</strong>
                                    <span>{returnItem.updated_at_formatted}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Refund Amount', 'Suma rambursare')}:</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={localRefundAmount}
                                            onChange={(e) => handleRefundAmountChange(e.target.value)}
                                            disabled={isSaving}
                                            style={{ width: '150px' }}
                                            placeholder="0.00"
                                        />
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>RON</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customer Information */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <User size={18} />
                                {t('Customer Information', 'Informatii Client')}
                            </h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <strong>{t('Name', 'Nume')}:</strong>
                                    <span>{returnItem.first_name} {returnItem.last_name}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Email', 'Email')}:</strong>
                                    <div className={styles.contactItem}>
                                        <Mail size={14} className={styles.contactIcon} />
                                        <span>{returnItem.email}</span>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Phone', 'Telefon')}:</strong>
                                    <div className={styles.contactItem}>
                                        <Phone size={14} className={styles.contactIcon} />
                                        <span>{returnItem.phone}</span>
                                    </div>
                                </div>
                                <div className={styles.infoItemFull}>
                                    <strong>{t('IBAN', 'IBAN')}:</strong>
                                    <span className={styles.monoText}>{returnItem.iban}</span>
                                </div>
                            </div>
                        </div>

                        {/* Product Information */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Package size={18} />
                                {t('Product Information', 'Informatii Produs')}
                            </h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItemFull}>
                                    <strong>{t('Product Name', 'Nume Produs')}:</strong>
                                    <span>{returnItem.product_name}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('SKU', 'SKU')}:</strong>
                                    <span className={styles.monoText}>{returnItem.product_sku}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Quantity', 'Cantitate')}:</strong>
                                    <span>{returnItem.quantity}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Product Opened', 'Produs Deschis')}:</strong>
                                    <span>{returnItem.is_product_opened === 'yes' ? t('Yes', 'Da') : t('No', 'Nu')}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Restock Item', 'Reintroduce in stoc')}:</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={localRestockItem}
                                            onChange={(e) => {
                                                setLocalRestockItem(e.target.checked);
                                                // hasUnsavedChanges will be updated by useEffect
                                            }}
                                            disabled={isSaving}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                                            {localRestockItem ? t('Yes', 'Da') : t('No', 'Nu')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightColumn}>
                        {/* Return Reason */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <FileText size={18} />
                                {t('Return Reason', 'Motiv Return')}
                            </h2>
                            <div className={styles.returnReasonSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Reason', 'Motiv')}:</span>
                                    <span className={styles.infoValue}>{getReturnReasonText(returnItem.return_reason)}</span>
                                </div>
                                
                                {returnItem.return_reason_details && (
                                    <>
                                        <div className={styles.sectionDivider}></div>
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoLabel}>{t('Reason Details', 'Detalii Motiv')}:</span>
                                            <span className={styles.infoValue}>{returnItem.return_reason_details}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Calendar size={18} />
                                {t('Additional Information', 'Informatii Aditionale')}
                            </h2>
                            <div className={styles.additionalInfoSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Return Date', 'Data Return')}:</span>
                                    <span className={styles.infoValue}>{returnItem.created_at_formatted}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Last Updated', 'Ultima actualizare')}:</span>
                                    <span className={styles.infoValue}>{returnItem.updated_at_formatted}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}

export default function ReturnShow(props: ReturnShowPageProps) {
    return (
        <AdminLayout activeSidebarItem="returns">
            <ReturnShowContent {...props} />
        </AdminLayout>
    );
}
