import type { Env } from "../index.js";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

export async function apiRequest<T>(
  env: Env,
  apiKey: string,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
  const { method = "GET", body, params } = options;

  const url = new URL(`${baseUrl}/${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
  };

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    const errorObj = error as { message?: string };
    throw new ApiError(
      errorObj.message || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return "Error: Invalid API key. Please check your GetTranscribe API key and try again.";
      case 403:
        return "Error: Permission denied. Your API key does not have access to this resource.";
      case 404:
        return "Error: Resource not found. Please check the ID and try again.";
      case 429:
        return "Error: Rate limit exceeded. Please wait a moment before making more requests.";
      default:
        return `Error: API request failed (${error.status}): ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return "Error: An unexpected error occurred.";
}

export function resolveApiKey(env: Env, argsApiKey?: string): string | null {
  return argsApiKey || env.GETTRANSCRIBE_API_KEY || null;
}
