import { useState } from 'react';
import { refhaelApi } from '../api';
import { HiUpload, HiDownload, HiDocumentText, HiX, HiCheckCircle } from 'react-icons/hi';
import './RefhaelTools.css';

export default function RefhaelToolsPage() {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleDrop = (setter) => (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
        if (file) setter(file);
    };

    const handleSubmit = async () => {
        if (!file1 || !file2) return;
        setProcessing(true);
        setError(null);
        try {
            const res = await refhaelApi.processFiles(file1, file2);
            setResult(res);
        } catch {
            setError('Failed to process files. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDownload = () => {
        // Mock download — in production this would be a real download link
        const blob = new Blob(['Mock Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result?.fileName || 'result.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setFile1(null);
        setFile2(null);
        setResult(null);
        setError(null);
    };

    const FileUploadZone = ({ file, setFile, label }) => (
        <div
            className={`upload-zone ${file ? 'upload-zone--filled' : ''}`}
            onClick={() => document.getElementById(`file-${label}`).click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop(setFile)}
        >
            <input
                id={`file-${label}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])}
            />
            {file ? (
                <div className="upload-zone__filled">
                    <HiDocumentText size={32} className="upload-zone__icon--success" />
                    <span className="upload-zone__filename">{file.name}</span>
                    <span className="upload-zone__size">{(file.size / 1024).toFixed(1)} KB</span>
                    <button className="btn-icon upload-zone__remove" onClick={e => { e.stopPropagation(); setFile(null); }}>
                        <HiX size={14} />
                    </button>
                </div>
            ) : (
                <div className="upload-zone__empty">
                    <HiUpload size={40} className="upload-zone__icon" />
                    <span className="upload-zone__label">{label}</span>
                    <span className="upload-zone__hint">Drag & drop or click to browse</span>
                    <span className="upload-zone__formats">.xlsx, .xls, .csv</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Refhael Tools</h1>
                    <p className="page-subtitle">Upload two Excel files to generate a processed result</p>
                </div>
            </div>

            <div className="page-content">
                {!result ? (
                    <div className="refhael-card glass-card">
                        <div className="refhael-uploads">
                            <FileUploadZone file={file1} setFile={setFile1} label="Source File 1" />
                            <FileUploadZone file={file2} setFile={setFile2} label="Source File 2" />
                        </div>

                        {error && (
                            <div className="refhael-error">
                                {error}
                            </div>
                        )}

                        <div className="refhael-actions">
                            <button className="btn btn-secondary" onClick={handleReset} disabled={processing}>
                                Clear All
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!file1 || !file2 || processing}
                            >
                                {processing ? (
                                    <>
                                        <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <HiUpload size={16} />
                                        Process Files
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="refhael-result glass-card animate-scale">
                        <HiCheckCircle size={48} className="refhael-result__icon" />
                        <h2>Processing Complete!</h2>
                        <p className="refhael-result__desc">Your result file is ready for download</p>
                        <div className="refhael-result__file">
                            <HiDocumentText size={24} />
                            <span>{result.fileName}</span>
                        </div>
                        <div className="refhael-result__actions">
                            <button className="btn btn-primary" onClick={handleDownload}>
                                <HiDownload size={16} />
                                Download Result
                            </button>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                Process Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
