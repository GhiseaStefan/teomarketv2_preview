import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Search, MoreVertical, UserX, UserCheck } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import styles from './users.module.css';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_active: boolean;
    email_verified_at: string | null;
    email_verified_at_formatted: string | null;
    created_at: string;
    created_at_formatted: string;
    customer_id: number | null;
}

interface UsersPageProps {
    users: User[];
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

export default function AdminUsers({ users, pagination, filters: initialFilters }: UsersPageProps) {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
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
        router.get('/admin/users', { search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(new Set(users.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
    };

    const handleSelectUser = (userId: number) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleDeactivateSelected = () => {
        if (selectedUsers.size === 0) return;

        if (confirm(t('Are you sure you want to deactivate selected accounts?', 'Esti sigur ca vrei sa dezactivezi conturile selectate?'))) {
            router.post('/admin/users/deactivate', {
                user_ids: Array.from(selectedUsers),
            }, {
                onSuccess: () => {
                    setSelectedUsers(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const handleActivateSelected = () => {
        if (selectedUsers.size === 0) return;

        if (confirm(t('Are you sure you want to activate selected accounts?', 'Esti sigur ca vrei sa activezi conturile selectate?'))) {
            router.post('/admin/users/activate', {
                user_ids: Array.from(selectedUsers),
            }, {
                onSuccess: () => {
                    setSelectedUsers(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const hasInactiveSelected = users
        .filter(u => selectedUsers.has(u.id))
        .some(u => !u.is_active);

    const hasActiveSelected = users
        .filter(u => selectedUsers.has(u.id))
        .some(u => u.is_active);

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin':
                return styles.roleBadgeAdmin;
            case 'manager':
                return styles.roleBadgeManager;
            default:
                return styles.roleBadgeCustomer;
        }
    };

    return (
        <AdminLayout activeSidebarItem="users">
            <div className={styles.usersPage}>
                <div className={styles.searchSection}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder={t('Search', 'Cauta')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </form>
                    <div className={styles.actionsContainer} ref={dropdownRef}>
                        {selectedUsers.size > 0 && (
                            <span className={styles.selectedCount}>
                                {selectedUsers.size} {t('selected', 'selectate')}
                            </span>
                        )}
                        <button
                            className={styles.actionsButton}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            disabled={selectedUsers.size === 0}
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
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.usersTable}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxHeader}>
                                    <input
                                        type="checkbox"
                                        checked={users.length > 0 && selectedUsers.size === users.length}
                                        onChange={handleSelectAll}
                                        className={styles.checkbox}
                                    />
                                </th>
                                <th className={styles.idHeader}>{t('ID', 'ID')}</th>
                                <th>{t('Name', 'Nume')}</th>
                                <th>{t('Email', 'Email')}</th>
                                <th>{t('Role', 'Rol')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Email verified', 'Email verificat')}</th>
                                <th>{t('Created at', 'Creat la')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        {t('No team members found', 'Nu s-au gasit membri ai echipei')}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className={!user.is_active ? styles.inactiveRow : ''}>
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                                className={styles.checkbox}
                                            />
                                        </td>
                                        <td className={styles.userId}>
                                            {user.id}
                                        </td>
                                        <td className={styles.userName}>
                                            {user.name || 'N/A'}
                                        </td>
                                        <td className={styles.email}>
                                            {user.email}
                                        </td>
                                        <td className={styles.role}>
                                            <span className={`${styles.roleBadge} ${getRoleBadgeClass(user.role)}`}>
                                                {user.role_label}
                                            </span>
                                        </td>
                                        <td className={styles.status}>
                                            <span className={`${styles.statusBadge} ${user.is_active ? styles.statusActive : styles.statusInactive}`}>
                                                {user.is_active ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                            </span>
                                        </td>
                                        <td className={styles.emailVerified}>
                                            {user.email_verified_at_formatted || (
                                                <span className={styles.notVerified}>{t('Not verified', 'Neverificat')}</span>
                                            )}
                                        </td>
                                        <td className={styles.createdAt}>
                                            {user.created_at_formatted}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.last_page > 1 && (
                    <div className={styles.pagination}>
                        <button
                            disabled={pagination.current_page === 1}
                            onClick={() => router.get('/admin/users', {
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
                            onClick={() => router.get('/admin/users', {
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
