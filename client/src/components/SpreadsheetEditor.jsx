import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = '/api/expense-report';

// Helper to convert column index to letter (0=A, 1=B, etc.)
function colIndexToLetter(index) {
  let letter = '';
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

export default function SpreadsheetEditor({ onBack }) {
  const [data, setData] = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [selectedCell, setSelectedCell] = useState(null); // { row, col }
  const [contextMenu, setContextMenu] = useState(null); // { x, y, row, col }

  const saveTimeoutRef = useRef(null);
  const dataRef = useRef(data);
  const sheetNameRef = useRef(sheetName);

  // Keep refs in sync
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    sheetNameRef.current = sheetName;
  }, [sheetName]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to load spreadsheet');
      const json = await res.json();
      setData(json.data || []);
      setSheetName(json.sheetName || 'Sheet1');
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Save function
  const saveData = useCallback(async (dataToSave, nameToSave) => {
    try {
      setSaveStatus('saving');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: dataToSave,
          sheetName: nameToSave,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  }, []);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      saveData(dataRef.current, sheetNameRef.current);
    }, 2000);
  }, [saveData]);

  // Handle cell change
  const handleCellChange = useCallback((rowIdx, colIdx, value) => {
    setData(prev => {
      const newData = prev.map(row => [...row]);
      // Ensure the row and column exist
      while (newData.length <= rowIdx) {
        newData.push(new Array(newData[0]?.length || 1).fill(''));
      }
      while (newData[rowIdx].length <= colIdx) {
        newData[rowIdx].push('');
      }
      newData[rowIdx][colIdx] = value;
      return newData;
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Add row
  const addRow = useCallback((afterIdx = null) => {
    setData(prev => {
      const cols = prev[0]?.length || 5;
      const newRow = new Array(cols).fill('');
      const newData = [...prev];
      if (afterIdx !== null) {
        newData.splice(afterIdx + 1, 0, newRow);
      } else {
        newData.push(newRow);
      }
      return newData;
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Add column
  const addColumn = useCallback((afterIdx = null) => {
    setData(prev => {
      return prev.map(row => {
        const newRow = [...row];
        if (afterIdx !== null) {
          newRow.splice(afterIdx + 1, 0, '');
        } else {
          newRow.push('');
        }
        return newRow;
      });
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Delete row
  const deleteRow = useCallback((rowIdx) => {
    setData(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== rowIdx);
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Delete column
  const deleteColumn = useCallback((colIdx) => {
    setData(prev => {
      if ((prev[0]?.length || 0) <= 1) return prev;
      return prev.map(row => row.filter((_, i) => i !== colIdx));
    });
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e, rowIdx, colIdx) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row: rowIdx, col: colIdx });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e, rowIdx, colIdx) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1;
      if (nextCol >= 0 && nextCol < (data[0]?.length || 0)) {
        setSelectedCell({ row: rowIdx, col: nextCol });
        const nextInput = document.querySelector(`[data-cell="${rowIdx}-${nextCol}"]`);
        nextInput?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = e.shiftKey ? rowIdx - 1 : rowIdx + 1;
      if (nextRow >= 0 && nextRow < data.length) {
        setSelectedCell({ row: nextRow, col: colIdx });
        const nextInput = document.querySelector(`[data-cell="${nextRow}-${colIdx}"]`);
        nextInput?.focus();
      }
    }
  }, [data]);

  // Get max columns
  const maxCols = data.reduce((max, row) => Math.max(max, row?.length || 0), 0);

  // Save status display
  const renderSaveStatus = () => {
    const statusMap = {
      idle: { text: 'Ready', className: 'save-status--idle' },
      saving: { text: 'Saving...', className: 'save-status--saving' },
      saved: { text: 'Saved ✓', className: 'save-status--saved' },
      error: { text: 'Error saving', className: 'save-status--error' },
    };
    const status = statusMap[saveStatus];
    return (
      <div className={`save-status ${status.className}`}>
        <span className="save-status-dot"></span>
        {status.text}
      </div>
    );
  };

  const getCellClassName = (rowIdx, colIdx, val) => {
    const v = String(val || '').trim().toUpperCase();
    let baseClass = 'spreadsheet-cell';
    
    if (rowIdx === 0 && colIdx === 0) {
      baseClass += ' cell-title';
    } else if (rowIdx === 2) {
      baseClass += ' cell-header-top';
    } else if (rowIdx === 3) {
      baseClass += ' cell-header-top-sub';
    } else if (rowIdx === 8) {
      baseClass += ' cell-expense-details-header';
    } else if (rowIdx === 9 || ['DATE', 'EXPENSE DESCRIPTION', 'PAID TO', 'AMOUNT', 'UPLOAD INV. OR RECIPT', 'COMMENTS', 'TOTAL'].includes(v)) {
      baseClass += ' cell-table-header';
    } else if (rowIdx >= 10) {
      baseClass += ' cell-data-row';
      if (colIdx === 3 || colIdx === 6) {
        baseClass += ' cell-currency';
      }
    }
    
    return baseClass;
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="editor-page">
        <div className="editor-header">
          <div className="editor-header-left">
            <button className="back-btn" onClick={onBack}>←</button>
            <div className="editor-title">
              <h1>Expense Report</h1>
              <span>Loading...</span>
            </div>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-page">
        <div className="editor-header">
          <div className="editor-header-left">
            <button className="back-btn" onClick={onBack}>←</button>
            <div className="editor-title">
              <h1>Expense Report</h1>
              <span>Error</span>
            </div>
          </div>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">Failed to load spreadsheet</p>
          <p className="error-detail">{error}</p>
          <button className="retry-btn" onClick={fetchData}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <button className="back-btn" onClick={onBack} title="Back to home">←</button>
          <div className="editor-title">
            <h1>📊 {sheetName}</h1>
            <span>Expense_Report.xlsx • {data.length} rows × {maxCols} columns</span>
          </div>
        </div>
        <div className="editor-header-right">
          {renderSaveStatus()}
        </div>
      </div>

      {/* Toolbar */}
      <div className="editor-toolbar">
        {selectedCell && (
          <span className="cell-ref">
            {colIndexToLetter(selectedCell.col)}{selectedCell.row + 1}
          </span>
        )}
        <div className="toolbar-divider"></div>
        <button className="toolbar-btn" onClick={() => addRow()} title="Add row at bottom">
          ＋ Row
        </button>
        <button className="toolbar-btn" onClick={() => addColumn()} title="Add column at end">
          ＋ Column
        </button>
        <div className="toolbar-divider"></div>
        <button className="toolbar-btn" onClick={() => saveData(data, sheetName)} title="Save now">
          💾 Save Now
        </button>
      </div>

      {/* Spreadsheet */}
      <div className="spreadsheet-container">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              <th className="col-header" style={{ minWidth: 50, width: 50 }}></th>
              {Array.from({ length: maxCols }, (_, i) => (
                <th key={i} className="col-header">
                  {colIndexToLetter(i)}
                </th>
              ))}
              <th style={{ border: 'none', background: 'transparent', padding: 0 }}>
                <button className="add-col-btn" onClick={() => addColumn()} title="Add column">
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`spreadsheet-row ${rowIdx === 9 ? 'spreadsheet-row--header' : ''}`}
              >
                <td className="row-number">{rowIdx + 1}</td>
                {Array.from({ length: maxCols }, (_, colIdx) => {
                  const val = row[colIdx];
                  return (
                    <td
                      key={colIdx}
                      className={getCellClassName(rowIdx, colIdx, val)}
                      onContextMenu={(e) => handleContextMenu(e, rowIdx, colIdx)}
                    >
                      <input
                        className="cell-input"
                        type="text"
                        data-cell={`${rowIdx}-${colIdx}`}
                        value={val !== undefined && val !== null ? String(val) : ''}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        onFocus={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="row-number" style={{ border: 'none' }}></td>
              <td colSpan={maxCols} style={{ border: 'none', padding: 0 }}>
                <button className="add-row-btn" onClick={() => addRow()} title="Add row">
                  ＋ Add Row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              addRow(contextMenu.row);
              setContextMenu(null);
            }}
          >
            ↕ Insert Row Below
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              addColumn(contextMenu.col);
              setContextMenu(null);
            }}
          >
            ↔ Insert Column Right
          </button>
          <div className="context-menu-divider"></div>
          <button
            className="context-menu-item context-menu-item--danger"
            onClick={() => {
              deleteRow(contextMenu.row);
              setContextMenu(null);
            }}
          >
            🗑 Delete Row
          </button>
          <button
            className="context-menu-item context-menu-item--danger"
            onClick={() => {
              deleteColumn(contextMenu.col);
              setContextMenu(null);
            }}
          >
            🗑 Delete Column
          </button>
        </div>
      )}
    </div>
  );
}
