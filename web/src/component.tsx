import React from 'react';
import { createRoot } from 'react-dom/client';
import { TranscriptionDetail } from './TranscriptionDetail';
import { TranscriptionList } from './TranscriptionList';
import { TranscriptionCreated } from './TranscriptionCreated';

// Determine which component to render based on tool output structure
function getComponentToRender() {
  // Check if window.openai is available and has toolOutput
  if (typeof window !== 'undefined' && window.openai && window.openai.toolOutput) {
    const toolOutput = window.openai.toolOutput;
    const toolInput = window.openai.toolInput;
    
    // If toolOutput has a 'data' array, it's a list view
    if (toolOutput && typeof toolOutput === 'object' && 'data' in toolOutput && Array.isArray(toolOutput.data)) {
      return <TranscriptionList />;
    }
    
    // If toolOutput has an 'id' but no 'data' array, check if it's from create_transcription
    if (toolOutput && typeof toolOutput === 'object' && 'id' in toolOutput && !('data' in toolOutput)) {
      // Check if this is a newly created transcription (from create_transcription tool)
      // We can detect this by checking if segments exist or if toolInput name is create_transcription
      if (toolInput && 'name' in toolInput && toolInput.name === 'create_transcription') {
        return <TranscriptionCreated />;
      }
      // Otherwise it's just viewing a transcription detail
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

