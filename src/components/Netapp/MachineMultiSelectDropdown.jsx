import { useEffect, useMemo, useRef } from 'react';
import { HiChevronDown } from 'react-icons/hi';

export default function MachineMultiSelectDropdown({
    machines,
    selectedMachines,
    isOpen,
    onOpenChange,
    searchQuery,
    onSearchChange,
    onToggleMachine,
    onSelectAll,
    onClearSelection,
}) {
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleOutsideClick = (event) => {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(event.target)) {
                onOpenChange(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onOpenChange]);

    const filteredMachines = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return machines;
        return machines.filter((machine) => (machine.name || '').toLowerCase().includes(query));
    }, [machines, searchQuery]);

    const allMachinesSelected = selectedMachines.length > 0 && selectedMachines.length === machines.length;

    return (
        <div className="netapp-machine-picker">
            <h3>NetApp Machines</h3>
            <div className="netapp-machine-dropdown" ref={dropdownRef}>
                <button
                    type="button"
                    className={`select-field netapp-machine-dropdown__trigger ${isOpen ? 'is-open' : ''}`}
                    onClick={() => onOpenChange(!isOpen)}
                >
                    <span>
                        {selectedMachines.length
                            ? `${selectedMachines.length} machine(s) selected`
                            : 'Choose NetApp machines'}
                    </span>
                    <HiChevronDown size={18} />
                </button>

                {isOpen && (
                    <div className="netapp-machine-dropdown__menu glass-card">
                        <div className="netapp-machine-dropdown__search-row">
                            <input
                                className="input-field netapp-machine-dropdown__search"
                                value={searchQuery}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Find machine by name..."
                            />
                            <button
                                type="button"
                                className="btn btn-secondary netapp-small-btn"
                                onClick={onSelectAll}
                            >
                                {allMachinesSelected ? 'All selected' : 'Select all'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost netapp-small-btn"
                                onClick={onClearSelection}
                            >
                                Clear
                            </button>
                        </div>

                        <div className="netapp-machine-dropdown__options">
                            {filteredMachines.length === 0 ? (
                                <div className="netapp-empty-state">No machine found.</div>
                            ) : (
                                filteredMachines.map((machine) => {
                                    const checked = selectedMachines.includes(machine.name);
                                    return (
                                        <label key={machine.id} className={`netapp-machine-picker__item ${checked ? 'is-selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => onToggleMachine(machine.name)}
                                            />
                                            <span className="netapp-machine-picker__name">{machine.name}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
