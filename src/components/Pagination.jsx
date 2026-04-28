import React from 'react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange = () => {}
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      if (startPage > 2) pages.push('...');

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-2)',
      borderRadius: '0 0 12px 12px'
    }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
        Showing {startItem} to {endItem} of {totalItems} items
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: currentPage === 1 ? 'var(--bg-3)' : 'var(--bg)',
            color: 'var(--text-1)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            opacity: currentPage === 1 ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          ← Previous
        </button>

        {pages.map((page, idx) => (
          <button
            key={idx}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...' || page === currentPage}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: page === currentPage ? '1px solid var(--brand)' : '1px solid var(--border)',
              background: page === currentPage ? 'var(--brand)' : 'var(--bg)',
              color: page === currentPage ? 'white' : 'var(--text-1)',
              cursor: page === '...' || page === currentPage ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: page === currentPage ? 700 : 600,
              minWidth: '36px',
              textAlign: 'center',
              opacity: page === '...' ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: currentPage === totalPages ? 'var(--bg-3)' : 'var(--bg)',
            color: 'var(--text-1)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            opacity: currentPage === totalPages ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
