import React, { useState, useRef, useCallback } from 'react';
import { uploadFiles } from '../utils/api';

const ACCEPTED_TYPES = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.tar,.gz,.txt,.csv,.json,.xml';
const MAX_FILES = 10;
const MAX_SIZE_MB = 50;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type) {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('tar') || type.includes('gz')) return '🗜️';
  if (type.includes('sheet') || type.includes('csv')) return '📊';
  if (type.includes('presentation')) return '📑';
  return '📁';
}

export default function UploadZone({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // { name, size, progress, status }
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const processFiles = useCallback(async (files) => {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${MAX_SIZE_MB}MB`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      if (errors.length > 0) {
        alert(errors.join('\n'));
      }
      return;
    }

    if (validFiles.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files at once. Uploading first ${MAX_FILES}.`);
      validFiles.splice(MAX_FILES);
    }

    // Initialize progress state
    const initialState = validFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      status: 'uploading',
    }));
    setUploads(initialState);
    setUploading(true);

    const formData = new FormData();
    validFiles.forEach(f => formData.append('files', f));

    try {
      await uploadFiles(formData, (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploads(prev => prev.map(u => ({ ...u, progress: pct, status: pct === 100 ? 'done' : 'uploading' })));
        }
      });

      setUploads(prev => prev.map(u => ({ ...u, progress: 100, status: 'done' })));

      setTimeout(() => {
        setUploads([]);
        setUploading(false);
        onUploadComplete?.();
      }, 1500);

    } catch (err) {
      setUploads(prev => prev.map(u => ({ ...u, status: 'error' })));
      setUploading(false);
      alert('Upload failed: ' + err.message);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        aria-label="Upload files"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <div className="upload-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 16 12 12 8 16"></polyline>
            <line x1="12" y1="12" x2="12" y2="21"></line>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
          </svg>
        </div>

        {dragging ? (
          <>
            <div className="upload-title">Release to upload</div>
            <div className="upload-sub">Files will be processed automatically</div>
          </>
        ) : (
          <>
            <div className="upload-title">Drop files here or click to browse</div>
            <div className="upload-sub">
              Supports images, documents, videos, audio, archives · Max {MAX_SIZE_MB}MB per file
            </div>
            <button className="upload-btn" tabIndex={-1} disabled={uploading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {uploading ? 'Uploading...' : 'Select Files'}
            </button>
          </>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="upload-progress-list">
          {uploads.map((u, i) => (
            <div key={i} className="progress-item">
              <span style={{ fontSize: '20px' }}>{getFileIcon(u.type)}</span>
              <span className="progress-name">{u.name}</span>
              <span className="progress-pct mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {formatBytes(u.size)}
              </span>
              <div className="progress-bar-wrap">
                <div
                  className={`progress-bar ${u.status === 'done' ? 'done' : u.status === 'error' ? 'error' : ''}`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              <span className="progress-pct">{u.progress}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
