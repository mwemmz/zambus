const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  status: number;
  issues?: ValidationIssue[];

  constructor(message: string, status: number, issues?: ValidationIssue[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface Envelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: ValidationIssue[];
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  } else if (options.token !== null) {
    const storedToken = localStorage.getItem('zambus_token');
    if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const raw = await response.text();
  let payload: Envelope<T> | T | null = null;

  try {
    payload = raw ? (JSON.parse(raw) as Envelope<T> | T) : null;
  } catch {
    payload = raw as unknown as T;
  }

  const envelope = payload as Envelope<T> | null;
  const failed = !response.ok || envelope?.success === false;

  if (failed) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('zambus:unauthorized'));
    }
    const message =
      (envelope && typeof envelope === 'object' && 'message' in envelope && envelope.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(String(message), response.status, envelope?.errors);
  }

  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data as T;
  }

  return payload as T;
}

export async function downloadFile(path: string, filename: string, token: string | null): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.issues && error.issues.length > 0) {
      return `${error.message}: ${error.issues.map((issue) => issue.message).join(', ')}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
