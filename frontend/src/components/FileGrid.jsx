import React from 'react';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFileIcon(category, mimeType) {
  if (category === 'image' || (mimeType && mimeType.startsWith('image/'))) return '🖼️';
  if (category === 'video' || (mimeType && mimeType.startsWith('video/'))) return '🎬';
  if (category === 'audio' || (mimeType && mimeType.startsWith('audio/'))) return '🎵';
  if (category === 'document' || (mimeType && mimeType.includes('pdf'))) return '📄';
  if (category === 'archive') return '🗜️';
  return '📁';
}

const STATUS_LABELS = {
  ready: 'Ready',
  processing: 'Processing',
  uploading: 'Uploading',
  error: 'Error',
};

const CATEGORY_COLORS = {
  image:    '#6c63ff',
  video:    '#f5a623',
  audio:    '#22d3a0',
  document: '#38bdf8',
  archive:  '#ff5566',
  other:    '#8a8a9a',
};

export default function FileGrid({ files, loading, onDelete, onDownload }) {
  if (loading) {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton" style={{ height: 120 }} />
            <div style={{ padding: '14px' }}>
              <div className="skeleton" style={{ height: 13, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 11, borderRadius: 4, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-grid">
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No files found</h3>
          <p>Upload some files or adjust your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-grid">
      {files.map(file => (
        <div key={file.fileId || file._id} className="file-card">
          <div className="file-preview">
            {file.category === 'image' && file.url ? (
              <img src={file.url} alt={file.originalName} loading="lazy" />
            ) : (
              <span className="file-preview-icon">{getFileIcon(file.category, file.mimeType)}</span>
            )}
            <span className={`file-status-badge status-${file.status}`}>
              {STATUS_LABELS[file.status] || file.status}
            </span>
          </div>

          <div className="file-info">
            <div className="file-name" title={file.originalName}>{file.originalName}</div>
            <div className="file-meta">
              <span
                style={{
                  color: CATEGORY_COLORS[file.category] || 'var(--text-muted)',
                  textTransform: 'capitalize',
                  fontSize: '10px',
                }}
              >
                {file.category || 'other'}
              </span>
              <span>{formatBytes(file.size)}</span>
              <span>{formatDate(file.createdAt)}</span>
            </div>
            {file.tags && file.tags.length > 0 && (
              <div className="file-tags">
                {file.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="file-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="file-actions">
            <button
              className="file-action-btn download"
              onClick={() => onDownload(file.fileId)}
              title="Download file"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
            <button
              className="file-action-btn delete"
              onClick={() => {
                if (window.confirm(`Delete "${file.originalName}"?`)) {
                  onDelete(file.fileId);
                }
              }}
              title="Delete file"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
