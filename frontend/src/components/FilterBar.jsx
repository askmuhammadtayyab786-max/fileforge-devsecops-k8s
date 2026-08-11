import React, { useState, useCallback } from 'react';

const CATEGORIES = ['all', 'image', 'video', 'audio', 'document', 'archive', 'other'];
const STATUSES = ['all', 'ready', 'processing', 'uploading', 'error'];

export default function FilterBar({ filters, onChange }) {
  const [searchVal, setSearchVal] = useState(filters.search || '');

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearchVal(val);
    // Debounce via setTimeout
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      onChange(prev => ({ ...prev, search: val }));
    }, 350);
  }, [onChange]);

  const handleCategory = (e) => onChange(prev => ({ ...prev, category: e.target.value }));
  const handleStatus   = (e) => onChange(prev => ({ ...prev, status: e.target.value }));

  const handleClear = () => {
    setSearchVal('');
    onChange({ category: 'all', status: 'all', search: '' });
  };

  const isDirty = filters.category !== 'all' || filters.status !== 'all' || filters.search;

  return (
    <div className="filter-bar">
      <div className="filter-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="Search files..."
          value={searchVal}
          onChange={handleSearch}
          aria-label="Search files"
        />
      </div>

      <select
        className="filter-select"
        value={filters.category}
        onChange={handleCategory}
        aria-label="Filter by category"
      >
        {CATEGORIES.map(c => (
          <option key={c} value={c}>
            {c === 'all' ? 'All Types' : c.charAt(0).toUpperCase() + c.slice(1)}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={filters.status}
        onChange={handleStatus}
        aria-label="Filter by status"
      >
        {STATUSES.map(s => (
          <option key={s} value={s}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>

      {isDirty && (
        <button className="filter-clear" onClick={handleClear} aria-label="Clear filters">
          Clear filters ✕
        </button>
      )}
    </div>
  );
}
