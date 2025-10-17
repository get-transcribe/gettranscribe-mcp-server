import { useState, useEffect, useCallback, useSyncExternalStore, SetStateAction } from 'react';
import type { OpenAiGlobals, SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from './types';

/**
 * Subscribe to a single global value from window.openai
 * Based on OpenAI Apps SDK documentation
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener('openai:set_globals' as typeof SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener('openai:set_globals' as typeof SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai[key]
  );
}

/**
 * Read tool input (arguments passed to the tool)
 */
export function useToolInput<T = Record<string, unknown>>() {
  return useOpenAiGlobal('toolInput') as T;
}

/**
 * Read tool output (structured data returned by the tool)
 */
export function useToolOutput<T = Record<string, unknown>>() {
  return useOpenAiGlobal('toolOutput') as T | null;
}

/**
 * Read tool response metadata
 */
export function useToolResponseMetadata<T = Record<string, unknown>>() {
  return useOpenAiGlobal('toolResponseMetadata') as T | null;
}

/**
 * Read current theme (light/dark)
 */
export function useTheme() {
  return useOpenAiGlobal('theme');
}

/**
 * Read current display mode (inline/pip/fullscreen)
 */
export function useDisplayMode() {
  return useOpenAiGlobal('displayMode');
}

/**
 * Read maximum height available for the component
 */
export function useMaxHeight() {
  return useOpenAiGlobal('maxHeight');
}

/**
 * Read user agent information (device type, capabilities)
 */
export function useUserAgent() {
  return useOpenAiGlobal('userAgent');
}

/**
 * Persist component state and expose it to ChatGPT
 * Anything passed to setWidgetState will be shown to the model
 */
export function useWidgetState<T extends Record<string, unknown>>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends Record<string, unknown>>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends Record<string, unknown>>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }

    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;

        if (newState != null) {
          window.openai.setWidgetState(newState);
        }

        return newState;
      });
    },
    []
  );

  return [widgetState, setWidgetState] as const;
}

/**
 * Call a tool on the MCP server
 */
export function useCallTool() {
  return useCallback((name: string, args: Record<string, unknown>) => {
    return window.openai.callTool(name, args);
  }, []);
}

/**
 * Send a follow-up message in the conversation
 */
export function useSendFollowUpMessage() {
  return useCallback((prompt: string) => {
    return window.openai.sendFollowUpMessage({ prompt });
  }, []);
}

/**
 * Request display mode change (inline/pip/fullscreen)
 */
export function useRequestDisplayMode() {
  return useCallback((mode: 'inline' | 'pip' | 'fullscreen') => {
    return window.openai.requestDisplayMode({ mode });
  }, []);
}

/**
 * Open an external URL
 */
export function useOpenExternal() {
  return useCallback((href: string) => {
    window.openai.openExternal({ href });
  }, []);
}

