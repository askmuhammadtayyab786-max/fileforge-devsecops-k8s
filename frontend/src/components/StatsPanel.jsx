import React from 'react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const CATEGORY_COLORS = {
  image:    'var(--accent)',
  video:    '#f5a623',
  audio:    '#22d3a0',
  document: '#38bdf8',
  archive:  '#ff5566',
  other:    '#8a8a9a',
};

export default function StatsPanel({ stats }) {
  if (!stats) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const totalFiles = stats.totalFiles ?? 0;
  const totalSize  = stats.totalSize  ?? 0;
  const byCategory = stats.byCategory ?? {};
  const byStatus   = stats.byStatus   ?? {};

  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...categoryEntries.map(([,v]) => v), 1);

  return (
    <div>
      {/* Top-level stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-label">Total Files</div>
          <div className="stat-value">{totalFiles.toLocaleString()}</div>
          <div className="stat-sub">objects stored</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-label">Total Storage</div>
          <div className="stat-value">{formatBytes(totalSize)}</div>
          <div className="stat-sub">across all files</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Ready</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {(byStatus.ready ?? 0).toLocaleString()}
          </div>
          <div className="stat-sub">processed files</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-label">Processing</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {((byStatus.processing ?? 0) + (byStatus.uploading ?? 0)).toLocaleString()}
          </div>
          <div className="stat-sub">in queue</div>
        </div>

        {byStatus.error > 0 && (
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-label">Errors</div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>
              {byStatus.error.toLocaleString()}
            </div>
            <div className="stat-sub">failed files</div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-label">Avg File Size</div>
          <div className="stat-value" style={{ fontSize: '22px' }}>
            {totalFiles > 0 ? formatBytes(Math.round(totalSize / totalFiles)) : '—'}
          </div>
          <div className="stat-sub">per file</div>
        </div>
      </div>

      {/* By Category */}
      {categoryEntries.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Files by Category</div>
          {categoryEntries.map(([cat, count]) => (
            <div key={cat} className="category-row">
              <span className="category-label">{cat}</span>
              <div className="category-bar-wrap">
                <div
                  className="category-bar"
                  style={{
                    width: `${(count / maxCat) * 100}%`,
                    background: CATEGORY_COLORS[cat] || 'var(--border-accent)',
                  }}
                />
              </div>
              <span className="category-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* By Status */}
      {Object.keys(byStatus).length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Files by Status</div>
          {Object.entries(byStatus).map(([status, count]) => {
            const colors = {
              ready: 'var(--success)',
              processing: 'var(--warning)',
              uploading: 'var(--info)',
              error: 'var(--error)',
            };
            return (
              <div key={status} className="category-row">
                <span className="category-label">{status}</span>
                <div className="category-bar-wrap">
                  <div
                    className="category-bar"
                    style={{
                      width: `${(count / totalFiles) * 100}%`,
                      background: colors[status] || 'var(--border-accent)',
                    }}
                  />
                </div>
                <span className="category-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
          Data auto-refreshes on upload or delete
        </span>
      </div>
    </div>
  );
}
