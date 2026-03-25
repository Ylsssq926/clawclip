export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T = unknown>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export async function apiGetSafe<T = unknown>(url: string): Promise<T | null> {
  try {
    return await apiGet<T>(url);
  } catch {
    return null;
  }
}
