// components/DebugPanel.tsx
import React, { useState } from 'react';
import { dataService } from '../lib/dataService';

const DebugPanel: React.FC = () => {
  const [show, setShow] = useState(false);
  const [storageData, setStorageData] = useState('');

  const viewStorage = () => {
    const data = {
      users: localStorage.getItem('teamtracker_users'),
      projects: localStorage.getItem('teamtracker_projects'),
      logs: localStorage.getItem('teamtracker_logs'),
    };
    setStorageData(JSON.stringify(data, null, 2));
  };

  const clearStorage = () => {
    if (window.confirm('Clear all data?')) {
      dataService.clearAllData();
      alert('Data cleared! Refreshing...');
      window.location.reload();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}>
      <button 
        onClick={() => setShow(!show)}
        style={{ 
          padding: '8px 16px', 
          background: '#4f72e8', 
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        {show ? 'Hide Debug' : 'Debug'}
      </button>
      {show && (
        <div style={{ 
          background: '#1a1a2e', 
          color: '#fff', 
          padding: 16, 
          borderRadius: 8,
          marginTop: 8,
          maxWidth: 400,
          maxHeight: 400,
          overflow: 'auto',
          fontSize: 12
        }}>
          <button onClick={viewStorage} style={{ marginRight: 8 }}>View Storage</button>
          <button onClick={clearStorage} style={{ background: '#ff4444', color: 'white' }}>Clear Data</button>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {storageData || 'Click "View Storage" to see data'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;