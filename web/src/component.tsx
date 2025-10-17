import React from 'react';
import { createRoot } from 'react-dom/client';
import { TranscriptionList } from './TranscriptionList';

// Mount the component when the DOM is ready
function initComponent() {
  const rootElement = document.getElementById('gettranscribe-root');
  
  if (!rootElement) {
    console.error('Root element #gettranscribe-root not found');
    return;
  }

  // Create React root and render
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <TranscriptionList />
    </React.StrictMode>
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponent);
} else {
  initComponent();
}

