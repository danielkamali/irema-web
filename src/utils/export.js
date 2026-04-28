/**
 * Export utilities for data downloading
 */

/**
 * Convert array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Optional array of column names to include
 * @returns {string} - CSV formatted string
 */
export function convertToCSV(data, columns = null) {
  if (!data || data.length === 0) return '';

  // Determine columns from first object
  const keys = columns || Object.keys(data[0]);

  // Create header row
  const header = keys.map(escapeCSVField).join(',');

  // Create data rows
  const rows = data.map(obj =>
    keys.map(key => {
      const value = obj[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        return escapeCSVField(JSON.stringify(value));
      }
      return escapeCSVField(String(value));
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV field value (handle quotes and commas)
 * @param {string} field - Field value to escape
 * @returns {string} - Escaped field
 */
function escapeCSVField(field) {
  if (typeof field !== 'string') return field;
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Name for downloaded file
 */
export function downloadCSV(csvContent, filename = 'export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to CSV and trigger download
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name for downloaded file
 * @param {Array} columns - Optional array of column names to include
 */
export function exportToCSV(data, filename = 'export.csv', columns = null) {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Convert array of objects to JSON format
 * @param {Array} data - Array of objects to convert
 * @returns {string} - JSON formatted string
 */
export function convertToJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Download JSON file
 * @param {string} jsonContent - JSON formatted string
 * @param {string} filename - Name for downloaded file
 */
export function downloadJSON(jsonContent, filename = 'export.json') {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON and trigger download
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name for downloaded file
 */
export function exportToJSON(data, filename = 'export.json') {
  const json = convertToJSON(data);
  downloadJSON(json, filename);
}
