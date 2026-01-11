import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Search, MoreVertical, UserX, UserCheck, Menu, X } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import { formatPrice } from '../../utils/formatPrice';
import styles from './customers.module.css';

interface Customer {
    id: number;
    customer_name: string;
    email: string;
    phone: string;
    location: string;
    orders_count: number;
    amount_spent: string;
    is_active: boolean;
}

interface CustomersPageProps {
    customers: Customer[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
    };
}

export default function AdminCustomers({ customers, pagination, filters: initialFilters }: CustomersPageProps) {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showSearchAndFilters, setShowSearchAndFilters] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/customers', { 
            search: searchQuery,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        router.get('/admin/customers', {
            search: '',
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCustomers(new Set(customers.map(c => c.id)));
        } else {
            setSelectedCustomers(new Set());
        }
    };

    const handleSelectCustomer = (customerId: number) => {
        const newSelected = new Set(selectedCustomers);
        if (newSelected.has(customerId)) {
            newSelected.delete(customerId);
        } else {
            newSelected.add(customerId);
        }
        setSelectedCustomers(newSelected);
    };

    const handleDeactivateSelected = () => {
        if (selectedCustomers.size === 0) return;

        if (confirm(t('Are you sure you want to deactivate selected accounts?', 'Esti sigur ca vrei sa dezactivezi conturile selectate?'))) {
            router.post('/admin/customers/deactivate', {
                customer_ids: Array.from(selectedCustomers),
            }, {
                onSuccess: () => {
                    setSelectedCustomers(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const handleActivateSelected = () => {
        if (selectedCustomers.size === 0) return;

        if (confirm(t('Are you sure you want to activate selected accounts?', 'Esti sigur ca vrei sa activezi conturile selectate?'))) {
            router.post('/admin/customers/activate', {
                customer_ids: Array.from(selectedCustomers),
            }, {
                onSuccess: () => {
                    setSelectedCustomers(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const hasInactiveSelected = customers
        .filter(c => selectedCustomers.has(c.id))
        .some(c => !c.is_active);

    const hasActiveSelected = customers
        .filter(c => selectedCustomers.has(c.id))
        .some(c => c.is_active);

    return (
        <AdminLayout activeSidebarItem="customers">
            <div className={styles.customersPage}>
                {/* Top Filters Row with Actions and Toggle Button */}
                <div className={styles.topFiltersRow}>
                    <div className={styles.topActionsContainer}>
                        <div className={styles.actionsContainer} ref={dropdownRef}>
                            {selectedCustomers.size > 0 && (
                                <span className={styles.selectedCount}>
                                    {selectedCustomers.size} {t('selected', 'selectate')}
                                </span>
                            )}
                            <button
                                className={styles.actionsButton}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                disabled={selectedCustomers.size === 0}
                            >
                                <MoreVertical size={18} />
                            </button>
                            {dropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    {hasInactiveSelected && (
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={handleActivateSelected}
                                        >
                                            <UserCheck size={16} />
                                            <span>{t('Activate selected', 'Activeaza selectate')}</span>
                                        </button>
                                    )}
                                    {hasActiveSelected && (
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={handleDeactivateSelected}
                                        >
                                            <UserX size={16} />
                                            <span>{t('Deactivate selected', 'Dezactiveaza selectate')}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <button
                            type="button"
                            className={styles.searchFilterToggleButton}
                            onClick={() => setShowSearchAndFilters(!showSearchAndFilters)}
                        >
                            <Search size={18} />
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar - Only shown when toggle is active */}
                {showSearchAndFilters && (
                    <div className={styles.searchBarContainer}>
                        <form onSubmit={handleSearch} className={styles.searchBarForm}>
                            <Search size={16} className={styles.searchBarIcon} />
                            <input
                                type="text"
                                placeholder={t('Search customers', 'Cautare clienti')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchBarInput}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className={styles.searchBarCancel}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.customersTable}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxHeader}>
                                    <input
                                        type="checkbox"
                                        checked={customers.length > 0 && selectedCustomers.size === customers.length}
                                        onChange={handleSelectAll}
                                        className={styles.checkbox}
                                    />
                                </th>
                                <th className={styles.idHeader}>{t('ID', 'ID')}</th>
                                <th>{t('Customer name', 'Nume client')}</th>
                                <th>{t('Email', 'Email')}</th>
                                <th>{t('Phone', 'Telefon')}</th>
                                <th>{t('Location', 'Locatie')}</th>
                                <th className={styles.ordersCountHeader}>{t('Orders', 'Comenzi')}</th>
                                <th className={styles.amountSpentHeader}>{t('Amount spent', 'Suma cheltuita')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        {t('No customers found', 'Nu s-au gasit clienti')}
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className={!customer.is_active ? styles.inactiveRow : ''}>
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomers.has(customer.id)}
                                                onChange={() => handleSelectCustomer(customer.id)}
                                                className={styles.checkbox}
                                            />
                                        </td>
                                        <td className={styles.customerId}>
                                            {customer.id}
                                        </td>
                                        <td className={styles.customerName}>
                                            <a
                                                href={`/admin/customers/${customer.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.customerLink}
                                            >
                                                {customer.customer_name}
                                            </a>
                                        </td>
                                        <td className={styles.email}>
                                            {customer.email}
                                        </td>
                                        <td className={styles.phone}>
                                            {customer.phone}
                                        </td>
                                        <td className={styles.location}>
                                            {customer.location}
                                        </td>
                                        <td className={styles.ordersCount}>
                                            {customer.orders_count}
                                        </td>
                                        <td className={styles.amountSpent}>
                                            {formatPrice(parseFloat(customer.amount_spent.replace(' RON', '')))} RON
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className={styles.pagination}>
                        <button
                            disabled={pagination.current_page === 1}
                            onClick={() => router.get('/admin/customers', {
                                search: searchQuery,
                                page: pagination.current_page - 1,
                            })}
                            className={styles.paginationButton}
                        >
                            {t('Previous', 'Anterior')}
                        </button>
                        <span className={styles.paginationInfo}>
                            {t('Page', 'Pagina')} {pagination.current_page} {t('of', 'din')} {pagination.last_page}
                        </span>
                        <button
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => router.get('/admin/customers', {
                                search: searchQuery,
                                page: pagination.current_page + 1,
                            })}
                            className={styles.paginationButton}
                        >
                            {t('Next', 'Urmator')}
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
