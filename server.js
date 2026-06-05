const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Path to the Excel file
const EXCEL_FILE = path.join(__dirname, 'Expense_Report.xlsx');

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

/**
 * GET /api/expense-report
 * Reads the Excel file and returns its data as JSON
 */
app.get('/api/expense-report', (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: 'Expense_Report.xlsx not found' });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Read all data as array of arrays (preserving structure)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Get column widths if available
    const colWidths = sheet['!cols'] || [];

    // Get merge info if available
    const merges = sheet['!merges'] || [];

    res.json({
      sheetName,
      data: rawData,
      colWidths: colWidths.map(c => c ? c.wch || 12 : 12),
      merges,
      totalRows: rawData.length,
      totalCols: range.e.c + 1
    });
  } catch (err) {
    console.error('Error reading Excel file:', err);
    res.status(500).json({ error: 'Failed to read Excel file' });
  }
});

/**
 * POST /api/expense-report
 * Saves the data back to the Excel file
 */
app.post('/api/expense-report', (req, res) => {
  try {
    const { data, sheetName } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Create a backup before saving
    if (fs.existsSync(EXCEL_FILE)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `Expense_Report_${timestamp}.xlsx`);
      fs.copyFileSync(EXCEL_FILE, backupPath);

      // Keep only the last 20 backups
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('Expense_Report_'))
        .sort()
        .reverse();
      backups.slice(20).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
      });
    }

    // Create new workbook from data
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Expenses');

    // Write the file
    XLSX.writeFile(wb, EXCEL_FILE);

    res.json({ success: true, message: 'File saved successfully' });
  } catch (err) {
    console.error('Error saving Excel file:', err);
    res.status(500).json({ error: 'Failed to save Excel file' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  🟢 Backend server running at http://localhost:${PORT}`);
  console.log(`  📄 Excel file: ${EXCEL_FILE}\n`);
});
