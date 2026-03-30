import { getAccessToken } from '../../lib/auth/accessTokenStore';
import { ApiError } from './errors';

const API_BASE_URL = '/api';
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object;
  throwOnHttpError?: boolean;
  timeoutMs?: number;
}

interface ErrorPayload {
  error?: string;
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildHeaders(headersInit: HeadersInit | undefined, includeJsonHeader: boolean): Headers {
  const headers = new Headers(headersInit);

  if (includeJsonHeader && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

function normalizeBody(body: RequestOptions['body']): { body: BodyInit | undefined; includeJsonHeader: boolean } {
  if (body === undefined) {
    return { body: undefined, includeJsonHeader: true };
  }

  if (body instanceof FormData) {
    return { body, includeJsonHeader: false };
  }

  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return { body, includeJsonHeader: false };
  }

  return { body: JSON.stringify(body), includeJsonHeader: true };
}

async function readResponsePayload<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text } as T;
  }
}

function getErrorMessage(payload: unknown, fallbackStatus: number): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = (payload as ErrorPayload).error;
    if (message) return message;
  }

  return `HTTP ${fallbackStatus}`;
}

function createApiError(response: Response, payload: unknown): ApiError {
  const code =
    response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'AUTH_FORBIDDEN' : 'HTTP_ERROR';

  return new ApiError(getErrorMessage(payload, response.status), {
    status: response.status,
    code,
  });
}

interface AbortTools {
  cleanup: () => void;
  didTimeout: () => boolean;
  signal: AbortSignal;
}

function createAbortTools(signal: AbortSignal | null | undefined, timeoutMs: number): AbortTools {
  const controller = new AbortController();
  const cleanupFns: Array<() => void> = [];
  let timedOut = false;

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      const handleAbort = () => controller.abort(signal.reason);
      signal.addEventListener('abort', handleAbort, { once: true });
      cleanupFns.push(() => signal.removeEventListener('abort', handleAbort));
    }
  }

  // Centralized request timeouts prevent screens from hanging on stalled API calls.
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  cleanupFns.push(() => clearTimeout(timeoutId));

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      cleanupFns.forEach((cleanup) => cleanup());
    },
  };
}

function normalizeAbortError(error: unknown, didTimeout: boolean, timeoutMs: number): Error {
  if (didTimeout && error instanceof Error && error.name === 'AbortError') {
    return new ApiError(`Request timed out after ${timeoutMs} ms`, {
      status: 408,
      code: 'HTTP_TIMEOUT',
    });
  }

  return error instanceof Error ? error : new Error('Unknown network error');
}

async function executeRequest<T>(path: string, options: RequestOptions = {}): Promise<{ response: Response; data: T }> {
  const { body, includeJsonHeader } = normalizeBody(options.body);
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const abortTools = createAbortTools(options.signal, timeoutMs);
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      body,
      signal: abortTools.signal,
      headers: buildHeaders(options.headers, includeJsonHeader),
    });
  } catch (error) {
    throw normalizeAbortError(error, abortTools.didTimeout(), timeoutMs);
  } finally {
    abortTools.cleanup();
  }

  const data = await readResponsePayload<T>(response);

  if (!response.ok && options.throwOnHttpError !== false) {
    throw createApiError(response, data);
  }

  return { response, data };
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await executeRequest<T>(path, options);
  return result.data;
}

export async function requestBlob(path: string, options: RequestOptions = {}): Promise<{ response: Response; blob: Blob }> {
  const { body, includeJsonHeader } = normalizeBody(options.body);
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const abortTools = createAbortTools(options.signal, timeoutMs);
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      body,
      signal: abortTools.signal,
      headers: buildHeaders(options.headers, includeJsonHeader),
    });
  } catch (error) {
    throw normalizeAbortError(error, abortTools.didTimeout(), timeoutMs);
  } finally {
    abortTools.cleanup();
  }

  if (!response.ok) {
    const payload = await readResponsePayload<unknown>(response);
    throw createApiError(response, payload);
  }

  const blob = await response.blob();
  return { response, blob };
}
