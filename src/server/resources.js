import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getResourcesList() {
  return {
    resources: [
      {
        uri: "ui://widget/transcription-list.html",
        name: "Transcription List UI",
        description: "Interactive list of transcriptions",
        mimeType: "text/html+skybridge",
        _meta: {
          "openai/outputTemplate": "ui://widget/transcription-list.html",
          "openai/widgetAccessible": true
        }
      },
      {
        uri: "ui://widget/transcription-detail.html",
        name: "Transcription Detail UI",
        description: "Detailed view of a single transcription",
        mimeType: "text/html+skybridge",
        _meta: {
          "openai/outputTemplate": "ui://widget/transcription-detail.html",
          "openai/widgetAccessible": true
        }
      }
    ]
  };
}

export function getResourceTemplates() {
  return {
    resourceTemplates: [
      {
        uriTemplate: "ui://widget/transcription-list.html",
        name: "Transcription List UI",
        description: "Interactive list of transcriptions",
        mimeType: "text/html+skybridge",
        _meta: {
          "openai/outputTemplate": "ui://widget/transcription-list.html",
          "openai/widgetAccessible": true
        }
      }
    ]
  };
}

export function readResourceContent(uri) {
  if (uri === "ui://widget/transcription-list.html" || uri === "ui://widget/transcription-detail.html") {
    let htmlTemplate;
    try {
      htmlTemplate = readFileSync(join(__dirname, '../../web/template.html'), 'utf8');
      const componentJS = readFileSync(join(__dirname, '../../web/dist/component.js'), 'utf8');
      htmlTemplate = htmlTemplate.replace('{{COMPONENT_CODE}}', componentJS);
    } catch (error) {
      throw new Error('Component bundle not found. Run: cd web && npm run build');
    }
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/html+skybridge",
          text: htmlTemplate,
          _meta: {
            "openai/outputTemplate": uri,
            "openai/widgetAccessible": true
          }
        }
      ]
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
}

