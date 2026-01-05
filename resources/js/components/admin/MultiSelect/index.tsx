import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import styles from './MultiSelect.module.css';

export interface MultiSelectOption {
    id: number;
    name: string;
}

export interface MultiSelectProps {
    options: MultiSelectOption[];
    value: number[] | number | null;
    onChange: (selectedIds: number[] | number | null) => void;
    placeholder?: string;
    className?: string;
    searchPlaceholder?: string;
    multiple?: boolean;
}

export const MultiSelect = ({
    options,
    value,
    onChange,
    placeholder = 'Select options...',
    className = '',
    searchPlaceholder = 'Search...',
    multiple = true,
}: MultiSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search query
    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get selected option names
    const selectedOptions = multiple
        ? options.filter(option => (value as number[]).includes(option.id))
        : value !== null && value !== undefined
            ? options.filter(option => option.id === (value as number))
            : [];

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus search input when dropdown opens
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchQuery('');
        }
    };

    const handleOptionToggle = (optionId: number) => {
        if (multiple) {
            const currentValue = value as number[];
            const newValue = currentValue.includes(optionId)
                ? currentValue.filter(id => id !== optionId)
                : [...currentValue, optionId];
            onChange(newValue);
        } else {
            // Single select: replace current selection
            const newValue = (value as number) === optionId ? null : optionId;
            onChange(newValue);
            // Close dropdown after selection in single-select mode
            setIsOpen(false);
        }
    };

    const displayText = selectedOptions.length > 0
        ? multiple
            ? selectedOptions.map(option => option.name).join(', ')
            : selectedOptions[0].name
        : placeholder;

    return (
        <div className={`${styles.multiSelect} ${className}`} ref={dropdownRef}>
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className={styles.triggerContent}>
                    <span 
                        className={styles.placeholder}
                        data-placeholder={(!multiple && (value === null || value === undefined)) || (multiple && selectedOptions.length === 0) ? 'true' : 'false'}
                    >
                        {displayText}
                    </span>
                </div>
                <ChevronDown
                    size={18}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.searchContainer}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className={styles.optionsList}>
                        {filteredOptions.length === 0 ? (
                            <div className={styles.noResults}>
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = multiple 
                                    ? (value as number[]).includes(option.id)
                                    : (value as number) === option.id;
                                return (
                                    <div
                                        key={option.id}
                                        className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOptionToggle(option.id);
                                        }}
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            tabIndex={-1}
                                            className={styles.checkbox}
                                        />
                                        <span className={styles.checkboxCustom}>
                                            {isSelected && <Check size={14} />}
                                        </span>
                                        <span className={styles.optionLabel}>{option.name}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
