import React from 'react';

export default function BulkActions({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll = () => {},
  onClearSelection = () => {},
  onDelete = () => {},
  onExport = () => {},
  isLoading = false
}) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      background: 'var(--brand-xlight)',
      border: '1px solid var(--brand-light)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <input
          type="checkbox"
          checked={selectedCount === totalCount && totalCount > 0}
          indeterminate={selectedCount > 0 && selectedCount < totalCount}
          onChange={(e) => {
            if (e.target.checked) {
              onSelectAll();
            } else {
              onClearSelection();
            }
          }}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          title={selectedCount === totalCount ? 'Deselect all' : 'Select all'}
        />
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--brand-dark)'
        }}>
          {selectedCount === totalCount && totalCount > 0 && selectedCount > 1
            ? `All ${selectedCount} items selected`
            : `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {onExport && (
          <button
            onClick={onExport}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              background: 'var(--bg)',
              color: 'var(--brand)',
              border: '1px solid var(--brand-light)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            📥 Export
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            🗑️ Delete
          </button>
        )}

        <button
          onClick={onClearSelection}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: 'var(--text-2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
