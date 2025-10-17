import React from 'react';
import { createRoot } from 'react-dom/client';
import { TranscriptionDetail } from './TranscriptionDetail';
import { TranscriptionList } from './TranscriptionList';

// Determine which component to render based on tool output structure
function getComponentToRender() {
  // Check if window.openai is available and has toolOutput
  if (typeof window !== 'undefined' && window.openai && window.openai.toolOutput) {
    const toolOutput = window.openai.toolOutput;
    
    // If toolOutput has a 'data' array, it's a list view
    if (toolOutput && typeof toolOutput === 'object' && 'data' in toolOutput && Array.isArray(toolOutput.data)) {
      return <TranscriptionList />;
    }
    
    // If toolOutput has an 'id' but no 'data' array, it's a detail view
    if (toolOutput && typeof toolOutput === 'object' && 'id' in toolOutput && !('data' in toolOutput)) {
      return <TranscriptionDetail />;
    }
  }
  
  // Default to list view
  return <TranscriptionList />;
}

// Mount the component when the DOM is ready
function initComponent() {
  const rootElement = document.getElementById('gettranscribe-root');
  
  if (!rootElement) {
    console.error('Root element #gettranscribe-root not found');
    return;
  }

  // Create React root and render appropriate component
  const root = createRoot(rootElement);
  const ComponentToRender = getComponentToRender();
  
  root.render(
    <React.StrictMode>
      {ComponentToRender}
    </React.StrictMode>
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponent);
} else {
  initComponent();
}

