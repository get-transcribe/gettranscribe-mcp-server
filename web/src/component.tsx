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
    
    // If toolOutput has a 'data' array, it's a list view
    if (toolOutput && typeof toolOutput === 'object' && 'data' in toolOutput && Array.isArray(toolOutput.data)) {
      return <TranscriptionList />;
    }
    
    // If toolOutput has an 'id' but no 'data' array, it's either detail or created view
    if (toolOutput && typeof toolOutput === 'object' && 'id' in toolOutput && !('data' in toolOutput)) {
      // Check if this is a newly created transcription by looking for creation indicators
      // create_transcription returns: id, video_url, video_title, platform, transcription, language, duration, created_at, thumbnail_url, folder_id, word_count, segments
      // get_transcription returns similar fields
      // The key difference: if we have duration as a string like "0:38" and created_at is recent, it's likely from create_transcription
      // But the most reliable is: create_transcription includes 'segments' field in response structure
      
      // Try to detect from metadata or other indicators
      // Since both might look similar, we'll use a heuristic: check if this came from the tools/call that returned structured content
      const toolInput = window.openai.toolInput;
      
      if (toolInput && typeof toolInput === 'object') {
        // If toolInput has a method/params structure indicating create_transcription
        if (toolInput.method === 'tools/call' && toolInput.params?.name === 'create_transcription') {
          return <TranscriptionCreated />;
        }
        // Also check direct name field if toolInput has it
        if (toolInput.name === 'create_transcription') {
          return <TranscriptionCreated />;
        }
      }
      
      // Check for metadata that might indicate this is from create_transcription
      // The _meta field might have hints about which tool was called
      const responseMetadata = window.openai.toolResponseMetadata;
      if (responseMetadata && typeof responseMetadata === 'object' && responseMetadata['tool_name'] === 'create_transcription') {
        return <TranscriptionCreated />;
      }
      
      // Fallback: if we can't determine, use TranscriptionDetail (safer default)
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

