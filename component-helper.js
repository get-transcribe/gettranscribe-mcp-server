import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the built component bundle
let componentJS = null;
try {
  componentJS = readFileSync(join(__dirname, 'web/dist/component.js'), 'utf8');
} catch (error) {
  console.error('⚠️  Component bundle not found. Run: cd web && npm run build');
}

// Read the HTML template
let htmlTemplate = null;
try {
  htmlTemplate = readFileSync(join(__dirname, 'web/template.html'), 'utf8');
} catch (error) {
  console.error('⚠️  HTML template not found');
}

/**
 * Create an HTML response with embedded React component
 * Following OpenAI Apps SDK guidelines
 * @param {object} toolOutput - The data to pass to the component
 * @param {object} options - Optional settings
 * @returns {string} HTML string to return in MCP response
 */
export function createComponentResponse(toolOutput, options = {}) {
  if (!componentJS || !htmlTemplate) {
    // Fallback to text-only response if component not available
    return JSON.stringify(toolOutput, null, 2);
  }

  // Replace the template placeholder with actual component code
  const html = htmlTemplate.replace('{{COMPONENT_CODE}}', componentJS);

  return html;
}

/**
 * Create a text + component hybrid response
 * Shows text in conversation and component in iframe
 * @param {string} text - Text to show in conversation
 * @param {object} toolOutput - Data for the component
 * @returns {object} MCP response with both text and component
 */
export function createHybridResponse(text, toolOutput) {
  return {
    content: [
      {
        type: "text",
        text: text
      },
      {
        type: "resource",
        resource: {
          uri: "component://transcription-list",
          mimeType: "text/html",
          text: createComponentResponse(toolOutput)
        }
      }
    ]
  };
}

/**
 * Format a list of transcriptions for text display
 * Fallback when component not available
 */
export function formatTranscriptionList(data) {
  if (!data || !data.data || data.data.length === 0) {
    return '📋 No transcriptions found.\n\nCreate one by sharing a video URL!';
  }

  const transcriptions = data.data;
  let output = `🎥 **Your Transcriptions** (${data.total} total)\n\n`;

  transcriptions.forEach((t, index) => {
    const icon = {
      instagram: '📸',
      tiktok: '🎵',
      youtube: '🎥',
      meta: '📘'
    }[t.platform] || '🎬';

    output += `**${index + 1}. ID: ${t.id}** (${t.platform}) ${icon}\n`;
    
    if (t.video_title) {
      output += `   📝 ${t.video_title}\n`;
    }
    
    if (t.language) {
      output += `   🌐 Language: ${t.language.toUpperCase()}`;
    }
    
    if (t.duration) {
      output += `   ⏱️ Duration: ${Math.round(t.duration / 60)}m`;
    }
    
    output += `\n   📅 Created: ${new Date(t.created_at).toLocaleDateString()}`;
    
    if (t.video_url) {
      output += `\n   🔗 ${t.video_url}`;
    }
    
    if (t.transcription) {
      const preview = t.transcription.substring(0, 100);
      output += `\n   💬 "${preview}${t.transcription.length > 100 ? '...' : ''}"`;
    }
    
    output += '\n\n';
  });

  if (data.total > data.data.length) {
    output += `\n_Showing ${data.data.length} of ${data.total} transcriptions_`;
  }

  return output;
}

export default {
  createComponentResponse,
  createHybridResponse,
  formatTranscriptionList
};

