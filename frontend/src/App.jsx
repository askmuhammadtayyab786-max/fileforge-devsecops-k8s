import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import UploadZone from './components/UploadZone';
import FileGrid from './components/FileGrid';
import StatsPanel from './components/StatsPanel';
import FilterBar from './components/FilterBar';
import { getFiles, getStats, deleteFile, getDownloadUrl } from './utils/api';
import './App.css';

export default function App() {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ category: 'all', status: 'all', search: '' });
  const [activeTab, setActiveTab] = useState('files');

  const fetchFiles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const res = await getFiles(params);
      setFiles(res.data.data.files || []);
setPagination({
  ...res.data.data.pagination,
  pages: res.data.data.pagination?.pages || 1
});
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getStats();
      setStats(res.data.stats);
    } catch (err) {
      console.error('Stats fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [fetchFiles, fetchStats]);

  // Poll for status updates every 3s when files are processing
  useEffect(() => {
    const hasProcessing = files.some(f => f.status === 'processing' || f.status === 'uploading');
    if (!hasProcessing) return;
    const timer = setTimeout(() => fetchFiles(pagination.page), 3000);
    return () => clearTimeout(timer);
  }, [files, pagination.page, fetchFiles]);

  const handleUploadComplete = () => {
    fetchFiles();
    fetchStats();
    toast.success('Upload complete! Files are being processed...');
  };

  const handleDelete = async (fileId) => {
    try {
      await deleteFile(fileId);
      toast.success('File deleted');
      setFiles(prev => prev.filter(f => f.fileId !== fileId));
      fetchStats();
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const handleDownload = (fileId) => {
    window.open(getDownloadUrl(fileId), '_blank');
  };

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
          },
        }}
      />

      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-hex">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M12 2L21.196 7V17L12 22L2.804 17V7L12 2Z" fill="var(--accent)" />
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">FileForge</span>
            <span className="logo-badge">PRO</span>
          </div>

          <nav className="header-nav">
            <button
              className={`nav-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 16 12 12 8 16"></polyline>
                <line x1="12" y1="12" x2="12" y2="21"></line>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
              </svg>
              Upload
            </button>
            <button
              className={`nav-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Library
              {pagination.total > 0 && <span className="nav-count">{pagination.total}</span>}
            </button>
            <button
              className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Analytics
            </button>
          </nav>

          <div className="header-status">
            <span className="status-dot"></span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--success)' }}>SYSTEM ONLINE</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'upload' && (
          <div className="tab-content" key="upload">
            <div className="section-header">
              <div>
                <h2>Upload Files</h2>
                <p>Drag & drop or click to select. Max 50MB per file, 10 files at once.</p>
              </div>
            </div>
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="tab-content" key="files">
            <div className="section-header">
              <div>
                <h2>File Library</h2>
                <p className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pagination.total} objects stored
                </p>
              </div>
            </div>
            <FilterBar filters={filters} onChange={setFilters} />
            <FileGrid
              files={files}
              loading={loading}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
            {pagination.pages > 1 && (
              <div className="pagination">
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`page-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                    onClick={() => fetchFiles(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="tab-content" key="stats">
            <div className="section-header">
              <div>
                <h2>Analytics</h2>
                <p>Storage usage and file statistics</p>
              </div>
            </div>
            <StatsPanel stats={stats} />
          </div>
        )}
      </main>
    </div>
  );
}
