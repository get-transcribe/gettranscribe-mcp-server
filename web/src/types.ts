// Types for window.openai API based on OpenAI Apps SDK documentation
// https://developers.openai.com/apps-sdk/build/custom-ux

export type UnknownObject = Record<string, unknown>;

export type Theme = "light" | "dark";

export type DisplayMode = "pip" | "inline" | "fullscreen";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

export type CallToolResponse = {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
};

export interface OpenAiGlobals<
  ToolInput extends UnknownObject = UnknownObject,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject
> {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
}

export interface API<WidgetState extends UnknownObject = UnknownObject> {
  /** Calls a tool on your MCP. Returns the full response. */
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;

  /** Triggers a followup turn in the ChatGPT conversation */
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

  /** Opens an external link, redirects web page or mobile app */
  openExternal(payload: { href: string }): void;

  /** For transitioning an app from inline to fullscreen or pip */
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    mode: DisplayMode;
  }>;

  /** Set widget state for persistence and model context */
  setWidgetState: (state: WidgetState) => Promise<void>;
}

export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

export class SetGlobalsEvent<T extends Partial<OpenAiGlobals> = Partial<OpenAiGlobals>> extends CustomEvent<{
  globals: T;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: API & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

// GetTranscribe specific types
export interface Transcription {
  id: number;
  video_url: string;
  video_title?: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'meta';
  transcription?: string;
  language?: string;
  duration?: number;
  created_at: string;
  thumbnail_url?: string;
  folder_id?: number;
  word_count?: number;
}

export interface TranscriptionFolder {
  id: number;
  name: string;
  parent_id?: number;
  created_at: string;
  transcription_count?: number;
}

export interface TranscriptionListOutput {
  data: Transcription[];
  total: number;
  limit: number;
  skip: number;
}

export interface TranscriptionWidgetState extends Record<string, unknown> {
  selectedId?: number | null;
  expandedIds?: number[];
  filters?: {
    platform?: string;
    folder_id?: number;
  };
}

