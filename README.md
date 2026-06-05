# Expense Report Editor (Excel)

A web app to view and edit an Excel expense report with auto-save.

- **Frontend**: React + Vite
- **Backend**: Express + XLSX
- **Excel file**: `Expense_Report.xlsx` (in the project root)

## Features

- Load the first worksheet from `Expense_Report.xlsx`
- Edit the sheet in the browser (via the React spreadsheet UI)
- Auto-save edits back to the Excel file
- Automatic backups before each save (keeps the last 20)

## How it works

The frontend calls the backend endpoints under `/api`:

- `GET /api/expense-report`
  - Reads `Expense_Report.xlsx`
  - Returns:
    - `sheetName`
    - `data` (array-of-arrays)
    - `colWidths` (when available)
    - `merges` (when available)
- `POST /api/expense-report`
  - Accepts `{ data, sheetName }`
  - Creates a backup of the existing Excel file
  - Writes updated data back to `Expense_Report.xlsx`

## Local development

### 1) Install dependencies

```bash
npm install
```

### 2) Run both frontend + backend

```bash
npm run dev
```

This starts:

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Build / Preview

```bash
npm run build
npm run preview
```

## Notes

- The app expects `Expense_Report.xlsx` to exist in the project root.
- Backup files are stored in `./backups/`.
