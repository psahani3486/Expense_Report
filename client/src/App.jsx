import { useState } from 'react';
import SpreadsheetEditor from './components/SpreadsheetEditor';
import './index.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="landing-page">
      <div className="landing-content">
        <button
          id="open-expense-report"
          className="landing-btn"
          onClick={() => setIsModalOpen(true)}
        >
          Expense Report
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <SpreadsheetEditor onBack={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
