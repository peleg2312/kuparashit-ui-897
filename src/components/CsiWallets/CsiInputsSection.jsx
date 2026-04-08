import { HiRefresh, HiSearch } from 'react-icons/hi';
import CsiSelectField from '@/components/CsiWallets/CsiSelectField';
import { FIELD_CONFIG } from '@/utils/csiWalletsUtils';

function getFieldOptions(fieldKey, options) {
    if (fieldKey === 'openshift') return options.openshifts;
    if (fieldKey === 'storageClass') return options.storageClasses;
    return options.pflexServers;
}

export default function CsiInputsSection({
    selectedCheck,
    values,
    options,
    sourceState,
    openDropdown,
    activeCheckKey,
    onValueChange,
    onRunCheck,
    setOpenDropdown,
    registerDropdownRef,
}) {
    const renderField = (fieldKey) => {
        const field = FIELD_CONFIG[fieldKey];
        if (!field) return null;

        if (field.type === 'number') {
            return (
                <label key={fieldKey} className="csi-wallets__field">
                    <span>{field.label}</span>
                    <input
                        className="input-field"
                        type="number"
                        min={field.min}
                        step={field.step}
                        inputMode="decimal"
                        value={values[fieldKey]}
                        onChange={(event) => onValueChange(fieldKey, event.target.value)}
                        placeholder={field.placeholder}
                    />
                    {field.help ? <small>{field.help}</small> : null}
                </label>
            );
        }

        const fieldOptions = getFieldOptions(fieldKey, options);
        const isLoading = fieldKey === 'storageClass' && sourceState.storageClassLoading;
        const isDisabled = sourceState.loading || isLoading || !fieldOptions.length;

        return (
            <CsiSelectField
                key={fieldKey}
                fieldKey={fieldKey}
                label={field.label}
                value={values[fieldKey]}
                options={fieldOptions}
                placeholder={field.emptyLabel}
                isOpen={openDropdown === fieldKey}
                disabled={isDisabled}
                hint={isLoading ? field.loadingHelp : field.help}
                onChange={(nextValue) => onValueChange(fieldKey, nextValue)}
                onOpenChange={(nextOpen) => setOpenDropdown(nextOpen ? fieldKey : '')}
                registerRef={registerDropdownRef}
            />
        );
    };

    return (
        <section className="csi-wallets__section">
            <div className="csi-wallets__section-head">
                <h3>Inputs</h3>
            </div>

            <div className="csi-wallets__composer">

                <div className="csi-wallets__form-grid">
                    {selectedCheck.fieldKeys.map(renderField)}
                </div>

                <div className="csi-wallets__run-row">
                    <button
                        type="button"
                        className="btn btn-primary csi-wallets__check-btn"
                        onClick={() => onRunCheck(selectedCheck)}
                        disabled={selectedCheck.disabled || !!activeCheckKey || sourceState.loading || sourceState.storageClassLoading}
                    >
                        {activeCheckKey === selectedCheck.key
                            ? <><HiRefresh size={16} className="animate-spin" />Running...</>
                            : <><HiSearch size={16} />Run {selectedCheck.label}</>}
                    </button>
                </div>
            </div>
        </section>
    );
}
