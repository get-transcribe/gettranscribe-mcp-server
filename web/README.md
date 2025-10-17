# GetTranscribe Web Components

UI components for GetTranscribe that run inside ChatGPT using the [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/build/custom-ux).

## Overview

These React components render inside an iframe in ChatGPT conversations, communicating with the host via the `window.openai` API to:

- Display transcription data in a beautiful, interactive UI
- Persist user state (favorites, filters) across sessions
- Call MCP tools directly from the UI
- Trigger follow-up messages in the conversation
- Support light/dark themes automatically
- Adapt to inline, PiP, and fullscreen layouts

## Project Structure

```
web/
  src/
    types.ts            # TypeScript types for window.openai API
    hooks.ts            # React hooks for OpenAI integration
    TranscriptionList.tsx  # Main transcription list component
    component.tsx       # Entry point that mounts the app
  dist/
    component.js        # Built bundle (145.9kb minified)
  template.html         # HTML template for iframe
  package.json
  tsconfig.json
```

## Development

### Install Dependencies

```bash
npm install
```

### Build for Production

```bash
npm run build
```

Outputs to `dist/component.js` - this file is embedded in MCP server responses.

### Watch Mode (Development)

```bash
npm run dev
```

Rebuilds automatically when source files change.

### Type Check

```bash
npm run typecheck
```

## Component Features

### TranscriptionList

The main component that displays a list of transcriptions with:

- **Platform badges** (Instagram, TikTok, YouTube, Meta)
- **Favorites system** - Save transcriptions (persisted via `widgetState`)
- **Metadata display** - Language, duration, creation date
- **Action buttons**:
  - Save/unsave favorites
  - Open video URL
  - Summarize with AI (sends follow-up message)
- **Responsive layouts** - Adapts to inline/fullscreen modes
- **Theme support** - Automatic light/dark mode
- **Empty states** - Helpful messages when no data

## How It Works

### 1. Tool Execution

When ChatGPT calls `list_transcriptions`, the MCP server returns HTML with the component embedded:

```javascript
{
  "content": [{
    "type": "text",
    "text": "<!-- HTML with iframe and component -->"
  }]
}
```

### 2. Component Initialization

The component reads initial data from `window.openai`:

```typescript
const toolOutput = useToolOutput<TranscriptionListOutput>();
const transcriptions = toolOutput?.data || [];
```

### 3. State Persistence

User actions (like favoriting) are persisted:

```typescript
const [widgetState, setWidgetState] = useWidgetState({
  favorites: []
});

// ChatGPT restores this state in future sessions
```

### 4. Host Communication

Components can trigger actions:

```typescript
// Call MCP tools
await window.openai.callTool('get_transcription', { id: 123 });

// Send follow-up messages
await window.openai.sendFollowUpMessage({ 
  prompt: 'Summarize transcription 123' 
});

// Open external links
window.openai.openExternal({ href: 'https://...' });

// Request layout changes
await window.openai.requestDisplayMode({ mode: 'fullscreen' });
```

## Custom Hooks

The project includes React hooks for all OpenAI APIs:

- `useToolInput()` - Get tool arguments
- `useToolOutput()` - Get tool response data
- `useWidgetState()` - Persist state + expose to model
- `useTheme()` - Get current theme (light/dark)
- `useDisplayMode()` - Get layout mode (inline/pip/fullscreen)
- `useCallTool()` - Call MCP tools
- `useSendFollowUpMessage()` - Trigger conversation turns
- `useOpenExternal()` - Open URLs
- `useRequestDisplayMode()` - Change layout

## Integration with MCP Server

The server embeds the built component in responses:

```javascript
import fs from 'fs';
import path from 'path';

const componentJS = fs.readFileSync(
  path.join(__dirname, '../web/dist/component.js'),
  'utf8'
);

const html = `
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div id="gettranscribe-root"></div>
    <script type="module">${componentJS}</script>
  </body>
</html>
`;

return {
  content: [{ type: "text", text: html }]
};
```

## Design System

### Colors

- **Primary**: `#6942e2` (purple)
- **Accent**: `#28e7c5` (teal)
- **Dark background**: `#1a1a1a`
- **Light background**: `#ffffff`
- **Text dark mode**: `#ffffff`
- **Text light mode**: `#081428`

### Platform Colors

- Instagram: `#E4405F`
- TikTok: `#000000`
- YouTube: `#FF0000`
- Meta: `#1877F2`

### Typography

- Font family: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- Sizes: 12px (small), 14px (body), 16px (subtitle), 24px (title)

## Future Components

Potential additional components to build:

- **TranscriptionDetail** - Full view of a single transcription with timestamps
- **TranscriptionMap** - Geographic view of transcription locations
- **TranscriptionCarousel** - Media-focused horizontal scroller
- **FolderView** - Hierarchical folder navigation
- **SearchInterface** - Advanced filtering and search

## Resources

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk/build/custom-ux)
- [Apps SDK Examples](https://github.com/openai/apps-sdk-examples)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

---

Built with ❤️ for GetTranscribe

