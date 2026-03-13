import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HiCollection, HiPlus } from 'react-icons/hi';
import { objectCatalogApi } from '../api';
import ObjectCardGrid from '../components/Dashy/ObjectCardGrid';
import ObjectDetailsDrawer from '../components/Dashy/ObjectDetailsDrawer';
import ObjectFormModal from '../components/Dashy/ObjectFormModal';
import SchemaModal from '../components/Dashy/SchemaModal';
import TypeRail from '../components/Dashy/TypeRail';
import Toast from '../components/Toast/Toast';
import { useTeam } from '../contexts/TeamContext';
import { useTimedToast } from '../hooks/useTimedToast';
import './DashyPage.css';

function normalizeLink(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return `https://${raw}`;
}

function sanitizeFilePart(value, fallback) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function csvCell(value) {
    const stringified = value == null
        ? ''
        : (typeof value === 'object' ? JSON.stringify(value) : String(value));
    const escaped = stringified.replace(/"/g, '""');
    return `"${escaped}"`;
}

function stringifySearchValue(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function buildObjectSearchText(objectItem) {
    const name = String(objectItem?.name || '');
    const url = String(objectItem?.url || '');
    const values = stringifySearchValue(objectItem?.values || {});
    return `${name} ${url} ${values}`.toLowerCase();
}

function inferFieldType(value) {
    if (value == null) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'dict';
    return 'string';
}

function fieldLabelFromKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Field';
    return raw
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
}

export default function DashyPage() {
    const queryClient = useQueryClient();
    const { currentTeam } = useTeam();
    const teamId = String(currentTeam?.id || '').trim();
    const canUseCatalog = !!teamId;

    const { toastMessage, toastType, showToast, hideToast } = useTimedToast(3200);

    const [preferredTypeKey, setPreferredTypeKey] = useState('');
    const [typeSearch, setTypeSearch] = useState('');
    const [objectSearch, setObjectSearch] = useState('');
    const [previewFieldByType, setPreviewFieldByType] = useState({});
    const [schemaModalState, setSchemaModalState] = useState({ open: false, mode: 'create', type: null });
    const [objectModalState, setObjectModalState] = useState({ open: false, mode: 'create', object: null });
    const [detailsObject, setDetailsObject] = useState(null);
    const deferredTypeSearch = useDeferredValue(typeSearch);
    const deferredObjectSearch = useDeferredValue(objectSearch);

    const typesQuery = useQuery({
        queryKey: ['catalog-types', teamId],
        queryFn: async () => {
            const response = await objectCatalogApi.listTypes(teamId);
            return Array.isArray(response?.types) ? response.types : [];
        },
        enabled: canUseCatalog && !!teamId,
        refetchOnWindowFocus: false,
        retry: false,
    });

    const types = useMemo(() => (
        Array.isArray(typesQuery.data) ? typesQuery.data : []
    ), [typesQuery.data]);
    const selectedTypeKey = useMemo(() => {
        const hasPreferredType = types.some((type) => String(type?.typeKey || '') === preferredTypeKey);
        if (hasPreferredType) return preferredTypeKey;
        return String(types[0]?.typeKey || '');
    }, [preferredTypeKey, types]);
    const selectedType = useMemo(
        () => types.find((type) => String(type?.typeKey || '') === selectedTypeKey) || null,
        [selectedTypeKey, types],
    );
    const selectedTypeMongoPath = useMemo(() => {
        if (!selectedType) return '';
        const mongoPath = String(selectedType?.mongoPath || '').trim();
        if (mongoPath) return mongoPath;

        const dbName = String(selectedType?.mongoDbName || 'kupa_rashit').trim() || 'kupa_rashit';
        const collectionName = String(selectedType?.collectionName || '').trim();
        if (collectionName) return `${dbName}.${collectionName}`;

        const fallbackTypeKey = String(selectedType?.typeKey || '').trim();
        return fallbackTypeKey ? `${dbName}.${teamId.toLowerCase()}_${fallbackTypeKey}` : dbName;
    }, [selectedType, teamId]);

    const objectsQuery = useQuery({
        queryKey: ['catalog-objects', teamId, selectedTypeKey],
        queryFn: async () => {
            const response = await objectCatalogApi.listObjects(teamId, selectedTypeKey);
            return Array.isArray(response?.objects) ? response.objects : [];
        },
        enabled: canUseCatalog && !!teamId && !!selectedTypeKey,
        refetchOnWindowFocus: false,
        retry: false,
    });

    const objects = useMemo(() => (
        Array.isArray(objectsQuery.data)
            ? objectsQuery.data
                .filter((objectItem) => !!String(objectItem?.url || '').trim())
                .map((objectItem) => ({
                    ...objectItem,
                    __searchText: buildObjectSearchText(objectItem),
                }))
            : []
    ), [objectsQuery.data]);
    const selectedTypeReadOnly = Boolean(selectedType?.readOnly);
    const derivedFieldsFromObjects = useMemo(() => {
        const typeByFieldKey = new Map();
        const fieldOrder = [];
        for (const objectItem of objects) {
            const values = objectItem?.values;
            if (!values || typeof values !== 'object') continue;

            for (const key of Object.keys(values)) {
                const safeKey = String(key || '').trim();
                if (!safeKey) continue;
                if (!typeByFieldKey.has(safeKey)) {
                    fieldOrder.push(safeKey);
                    typeByFieldKey.set(safeKey, inferFieldType(values[safeKey]));
                    continue;
                }
                if (typeByFieldKey.get(safeKey) !== 'string') {
                    const nextType = inferFieldType(values[safeKey]);
                    if (nextType !== typeByFieldKey.get(safeKey)) {
                        typeByFieldKey.set(safeKey, 'string');
                    }
                }
            }
        }

        return fieldOrder.map((key, index) => ({
            key,
            label: fieldLabelFromKey(key),
            type: typeByFieldKey.get(key) || 'string',
            active: true,
            order: index + 1,
        }));
    }, [objects]);
    const selectedTypeActiveFields = useMemo(() => (
        Array.isArray(selectedType?.fields)
            ? selectedType.fields
                .filter((field) => !!field?.active)
                .filter((field) => !['name', 'url'].includes(String(field?.key || '').trim().toLowerCase()))
                .slice()
                .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
                .map((field) => ({
                    key: String(field?.key || ''),
                    label: String(field?.label || field?.key || ''),
                }))
                .filter((field) => !!field.key)
            : []
    ), [selectedType]);
    const previewFieldOptions = useMemo(() => (
        selectedTypeActiveFields.length > 0
            ? selectedTypeActiveFields
            : derivedFieldsFromObjects.map((field) => ({
                key: String(field?.key || ''),
                label: String(field?.label || field?.key || ''),
            }))
    ), [derivedFieldsFromObjects, selectedTypeActiveFields]);
    const selectedPreviewFieldKeys = useMemo(() => {
        const validKeys = new Set(previewFieldOptions.map((field) => field.key));
        const rawValue = previewFieldByType[selectedTypeKey];
        const rawKeys = Array.isArray(rawValue)
            ? rawValue
            : (typeof rawValue === 'string' && rawValue.trim() ? [rawValue] : []);

        const seen = new Set();
        return rawKeys
            .map((key) => String(key || '').trim())
            .filter((key) => key && validKeys.has(key))
            .filter((key) => {
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [previewFieldByType, previewFieldOptions, selectedTypeKey]);
    const selectedPreviewFields = useMemo(() => {
        const fieldByKey = new Map(previewFieldOptions.map((field) => [field.key, field]));
        return selectedPreviewFieldKeys
            .map((key) => fieldByKey.get(key))
            .filter(Boolean);
    }, [selectedPreviewFieldKeys, previewFieldOptions]);

    const upsertTypeMutation = useMutation({
        mutationFn: async ({ mode, typeKey, payload }) => {
            if (mode === 'edit') {
                return objectCatalogApi.updateType(teamId, typeKey, payload);
            }
            return objectCatalogApi.createType(teamId, payload);
        },
    });

    const deleteTypeMutation = useMutation({
        mutationFn: async ({ typeKey }) => objectCatalogApi.deleteType(teamId, typeKey),
    });

    const upsertObjectMutation = useMutation({
        mutationFn: async ({ mode, objectId, payload }) => {
            if (mode === 'edit') {
                return objectCatalogApi.updateObject(teamId, selectedTypeKey, objectId, payload);
            }
            return objectCatalogApi.createObject(teamId, selectedTypeKey, payload);
        },
    });

    const deleteObjectMutation = useMutation({
        mutationFn: async ({ objectId }) => objectCatalogApi.deleteObject(teamId, selectedTypeKey, objectId),
    });

    const refreshTypes = async () => {
        await queryClient.invalidateQueries({ queryKey: ['catalog-types', teamId] });
    };

    const refreshObjects = async () => {
        await queryClient.invalidateQueries({ queryKey: ['catalog-objects', teamId, selectedTypeKey] });
    };

    const handleSchemaSubmit = async (payload) => {
        try {
            const response = await upsertTypeMutation.mutateAsync({
                mode: schemaModalState.mode,
                typeKey: schemaModalState.type?.typeKey,
                payload,
            });

            const nextTypeKey = String(response?.typeKey || schemaModalState.type?.typeKey || '');
            setSchemaModalState({ open: false, mode: 'create', type: null });
            if (nextTypeKey) {
                setPreferredTypeKey(nextTypeKey);
                setObjectSearch('');
                setDetailsObject(null);
            }
            await refreshTypes();
            if (nextTypeKey) {
                await queryClient.invalidateQueries({ queryKey: ['catalog-objects', teamId, nextTypeKey] });
            }
            showToast(
                schemaModalState.mode === 'edit' ? 'Type schema updated' : 'Type created',
                'success',
            );
        } catch (error) {
            showToast(error?.message || 'Failed to save type schema.', 'error', 5200);
        }
    };

    const handleDeleteType = async (type) => {
        const typeLabel = String(type?.displayName || type?.typeKey || '').trim();
        const typeKey = String(type?.typeKey || '').trim();
        if (!typeKey) return;
        if (type?.readOnly) {
            showToast('Mongo-backed types are read-only in Dashy.', 'error', 4200);
            return;
        }

        const confirmed = window.confirm(`Delete type "${typeLabel}" and all its objects?`);
        if (!confirmed) return;

        try {
            await deleteTypeMutation.mutateAsync({ typeKey });
            if (selectedTypeKey === typeKey) {
                setPreferredTypeKey('');
            }
            setDetailsObject(null);
            await refreshTypes();
            showToast(`Type "${typeLabel}" deleted`, 'success');
        } catch (error) {
            showToast(error?.message || 'Failed to delete type.', 'error', 5200);
        }
    };

    const handleObjectSubmit = async (payload) => {
        try {
            await upsertObjectMutation.mutateAsync({
                mode: objectModalState.mode,
                objectId: objectModalState.object?.id,
                payload,
            });
            setObjectModalState({ open: false, mode: 'create', object: null });
            setDetailsObject(null);
            await refreshObjects();
            await refreshTypes();
            showToast(
                objectModalState.mode === 'edit' ? 'Object updated' : 'Object created',
                'success',
            );
        } catch (error) {
            showToast(error?.message || 'Failed to save object.', 'error', 5200);
        }
    };

    const handleDeleteObject = async (objectItem) => {
        const objectId = String(objectItem?.id || '').trim();
        const objectName = String(objectItem?.name || objectId).trim();
        if (!objectId) return;

        const confirmed = window.confirm(`Delete object "${objectName}"?`);
        if (!confirmed) return;

        try {
            await deleteObjectMutation.mutateAsync({ objectId });
            if (detailsObject?.id === objectId) {
                setDetailsObject(null);
            }
            await refreshObjects();
            await refreshTypes();
            showToast(`Object "${objectName}" deleted`, 'success');
        } catch (error) {
            showToast(error?.message || 'Failed to delete object.', 'error', 5200);
        }
    };

    const openObject = (objectItem) => {
        const targetUrl = normalizeLink(objectItem?.url);
        if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        startTransition(() => {
            setDetailsObject(objectItem);
        });
    };

    const openObjectEditor = (objectItem, options = {}) => {
        if (options.closeDetails) {
            setDetailsObject(null);
        }
        startTransition(() => {
            setObjectModalState({ open: true, mode: 'edit', object: objectItem });
        });
    };

    const handleExportList = () => {
        if (!selectedType || selectedPreviewFields.length <= 0) {
            showToast('Select at least one field first to export.', 'error', 4200);
            return;
        }

        const header = [
            csvCell('Name'),
            ...selectedPreviewFields.map((field) => csvCell(field.label || field.key)),
        ].join(',');
        const rows = (Array.isArray(objects) ? objects : []).map((objectItem) => (
            [
                csvCell(objectItem?.name || ''),
                ...selectedPreviewFields.map((field) => csvCell(objectItem?.values?.[field.key])),
            ].join(',')
        ));
        const csv = [header, ...rows].join('\n');

        const typePart = sanitizeFilePart(selectedType?.displayName || selectedType?.typeKey, 'collection');
        const fieldPart = selectedPreviewFields.length === 1
            ? sanitizeFilePart(selectedPreviewFields[0].key, 'field')
            : 'multi-fields';
        const filename = `${typePart}-${fieldPart}-export.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        showToast('Export file downloaded.', 'success');
    };

    return (
        <div className="page-container object-hub-page">
            <div className="page-content object-hub-page__content">
                {!canUseCatalog ? (
                    <section className="glass-card object-hub-disabled">
                        <HiCollection size={24} />
                        <div>
                            <h3>Dashy Is Not Enabled</h3>
                            <p>No team is selected for this workspace.</p>
                        </div>
                    </section>
                ) : (
                    <div className="object-hub-layout">
                        <TypeRail
                            types={types}
                            selectedTypeKey={selectedTypeKey}
                            loading={typesQuery.isFetching}
                            search={typeSearch}
                            filterSearch={deferredTypeSearch}
                            onSearchChange={setTypeSearch}
                            onSelectType={(type) => {
                                setPreferredTypeKey(String(type?.typeKey || ''));
                                setObjectSearch('');
                                setDetailsObject(null);
                            }}
                            onCreateType={() => setSchemaModalState({ open: true, mode: 'create', type: null })}
                            onEditType={(type) => setSchemaModalState({ open: true, mode: 'edit', type })}
                            onDeleteType={handleDeleteType}
                        />

                        <div className="object-hub-main">
                            {!selectedType ? (
                                <section className="glass-card object-hub-empty-main">
                                    <h3>No type selected</h3>
                                    <p>Create a type from the left panel to start adding objects.</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setSchemaModalState({ open: true, mode: 'create', type: null })}
                                    >
                                        <HiPlus size={16} />
                                        Create Type
                                    </button>
                                </section>
                            ) : (
                                <>
                                    <section className="glass-card object-hub-type-summary">
                                        <div className="object-hub-type-summary__main">
                                            <p className="object-hub-type-summary__eyebrow">Selected Type</p>
                                            <div className="object-hub-type-summary__title-row">
                                                <h2 className="object-hub-type-summary__title">{selectedType.displayName}</h2>
                                                <p className="object-hub-type-summary__mongo-path">{selectedTypeMongoPath}</p>
                                            </div>
                                        </div>
                                        <div className="object-hub-type-summary__actions">
                                            {!selectedTypeReadOnly && (
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setObjectModalState({ open: true, mode: 'create', object: null })}
                                                >
                                                    <HiPlus size={16} />
                                                    Add Object
                                                </button>
                                            )}
                                        </div>
                                    </section>

                                    <ObjectCardGrid
                                        objects={objects}
                                        loading={objectsQuery.isFetching}
                                        search={objectSearch}
                                        filterSearch={deferredObjectSearch}
                                        previewFieldKeys={selectedPreviewFieldKeys}
                                        previewFieldOptions={previewFieldOptions}
                                        colorTheme={selectedType?.colorTheme || null}
                                        themeSeed={selectedType?.collectionName || selectedType?.displayName || selectedTypeKey}
                                        onSearchChange={setObjectSearch}
                                        onPreviewFieldChange={(fieldKeys) => {
                                            setPreviewFieldByType((prev) => ({
                                                ...prev,
                                                [selectedTypeKey]: Array.isArray(fieldKeys)
                                                    ? fieldKeys.map((key) => String(key || '').trim()).filter(Boolean)
                                                    : [],
                                            }));
                                        }}
                                        onExportList={handleExportList}
                                        exportDisabled={selectedPreviewFields.length <= 0 || objects.length <= 0}
                                        onOpenObject={openObject}
                                        onViewObject={(objectItem) => {
                                            startTransition(() => {
                                                setDetailsObject(objectItem);
                                            });
                                        }}
                                        onEditObject={selectedTypeReadOnly ? undefined : (objectItem) => openObjectEditor(objectItem)}
                                        onDeleteObject={selectedTypeReadOnly ? undefined : handleDeleteObject}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {schemaModalState.open && (
                <SchemaModal
                    key={`${schemaModalState.mode}:${schemaModalState.type?.typeKey || 'new'}:${schemaModalState.type?.updatedAt || ''}`}
                    mode={schemaModalState.mode}
                    initialType={schemaModalState.type}
                    saving={upsertTypeMutation.isPending}
                    onClose={() => setSchemaModalState({ open: false, mode: 'create', type: null })}
                    onSubmit={handleSchemaSubmit}
                />
            )}

            {objectModalState.open && selectedType && !selectedTypeReadOnly && (
                <ObjectFormModal
                    key={`${objectModalState.mode}:${selectedType.typeKey}:${objectModalState.object?.id || 'new'}`}
                    mode={objectModalState.mode}
                    typeDef={selectedType}
                    objectData={objectModalState.object}
                    saving={upsertObjectMutation.isPending}
                    onClose={() => setObjectModalState({ open: false, mode: 'create', object: null })}
                    onSubmit={handleObjectSubmit}
                />
            )}

            {!!detailsObject && selectedType && (
                <ObjectDetailsDrawer
                    typeDef={selectedType}
                    objectData={detailsObject}
                    onClose={() => setDetailsObject(null)}
                    onEdit={selectedTypeReadOnly ? undefined : (objectItem) => openObjectEditor(objectItem, { closeDetails: true })}
                    onDelete={selectedTypeReadOnly ? undefined : handleDeleteObject}
                />
            )}

            <Toast message={toastMessage} type={toastType} onClose={hideToast} />
        </div>
    );
}
