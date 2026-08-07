import { API_BASE_URL } from "@/lib/apiConfig";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeout?: number;
  credentials?: RequestCredentials;
  _isRetry?: boolean;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown,
    public url: string,
  ) {
    super(`HTTP ${status} ${statusText} - ${url}`);
    this.name = "HttpError";
  }
}

/**
 * Memory storage for JWT Access Token
 */
let memoryAccessToken: string | null = null;
let unauthCallback: (() => void) | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function setUnauthCallback(cb: () => void): void {
  unauthCallback = cb;
}

/**
 * Chế độ hoạt động của client, suy ra từ API_BASE_URL:
 * - "server":   backend thật (Docker inject domain khi build production)
 * - "jsdelivr": CDN tĩnh (mặc định khi KHÔNG build production)
 */
type ApiMode = "server" | "jsdelivr";

function detectApiMode(): ApiMode {
  try {
    const host = new URL(
      API_BASE_URL,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    ).hostname;

    if (/(^|\.)jsdelivr\.net$/i.test(host)) {
      return "jsdelivr";
    }
  } catch {
    // API_BASE_URL là relative path (vd "/api") -> không parse được domain tuyệt đối
  }
  return "server";
}

const API_MODE: ApiMode = detectApiMode();

function formatJsdelivrRoute(route: string): string {
  if (API_MODE !== "jsdelivr") return route;

  const match = route.match(/^([^?#]*)(.*)$/);
  if (!match) return route;

  let pathname = match[1];
  const searchAndHash = match[2];

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return route;

  const lastSegment = segments[segments.length - 1];
  const hasExtension = /\.[a-z0-9]+$/i.test(lastSegment);
  if (hasExtension) return route;

  const mainSegment = segments[0] === "api" ? segments[1] : segments[0];

  let ext = ".json";
  if (mainSegment === "map") {
    ext = ".glb";
  } else if (mainSegment === "tiles") {
    ext = ".jpg";
  }

  pathname = `${pathname}${ext}`;
  return `${pathname}${searchAndHash}`;
}

function buildUrl(route: string, params?: RequestOptions["params"]): string {
  const formattedRoute = formatJsdelivrRoute(route);
  const path = formattedRoute.startsWith("/") ? formattedRoute : `/${formattedRoute}`;
  const url = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}${path}`,
    typeof window !== "undefined" ? window.location.origin : undefined,
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

function shouldAttachDefaultHeaders(method: HttpMethod): boolean {
  if (API_MODE === "jsdelivr") return false;
  if (method === "PUT") return false;
  return true;
}

function resolveCredentials(explicit?: RequestCredentials): RequestCredentials {
  if (explicit) return explicit;
  return API_MODE === "jsdelivr" ? "omit" : "include";
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (res.status === 204) {
    return undefined as T;
  }

  const data = isJson ? await res.json() : ((await res.text()) as unknown);

  if (!res.ok) {
    throw new HttpError(res.status, res.statusText, data, res.url);
  }

  return data as T;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (reason?: any) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

async function request<T>(
  method: HttpMethod,
  route: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    headers,
    body,
    params,
    signal,
    timeout = 15000,
    credentials,
    _isRetry,
  } = options;

  const url = buildUrl(route, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  const isFormData = body instanceof FormData;

  const finalHeaders: Record<string, string> = shouldAttachDefaultHeaders(
    method,
  )
    ? {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Accept: "application/json",
        ...headers,
      }
    : { ...headers };

  if (memoryAccessToken && !finalHeaders["Authorization"]) {
    finalHeaders["Authorization"] = `Bearer ${memoryAccessToken}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      credentials: resolveCredentials(credentials),
      signal: controller.signal,
    });

    return await parseResponse<T>(res);
  } catch (err) {
    if (err instanceof HttpError) {
      const cleanRoute = route.startsWith('/') ? route : `/${route}`;
      const isAuthEndpoint = cleanRoute.includes('/auth/login') || cleanRoute.includes('/auth/refresh') || cleanRoute === '/auth';

      if (err.status === 401 && !_isRetry && !isAuthEndpoint) {
        if (isRefreshing) {
          return new Promise<string | null>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return request<T>(method, route, { ...options, _isRetry: true });
            })
            .catch((qErr) => {
              throw qErr;
            });
        }

        isRefreshing = true;

        try {
          const refreshRes = await request<{ success: boolean; accessToken: string }>('POST', '/auth/refresh', {
            _isRetry: true,
          });

          if (refreshRes && refreshRes.accessToken) {
            setAccessToken(refreshRes.accessToken);
            processQueue(null, refreshRes.accessToken);
            isRefreshing = false;
            return await request<T>(method, route, { ...options, _isRetry: true });
          } else {
            throw new Error("Failed to refresh token");
          }
        } catch (refreshErr: any) {
          setAccessToken(null);
          processQueue(refreshErr, null);
          isRefreshing = false;
          if (unauthCallback) unauthCallback();
          throw err;
        }
      }

      throw err;
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HttpError(0, "Request Timeout / Aborted", null, url);
    }
    throw new HttpError(0, "Network Error", err, url);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const httpClient = {
  get: <T>(route: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", route, options),

  post: <T>(route: string, options?: RequestOptions) =>
    request<T>("POST", route, options),

  put: <T>(route: string, options?: RequestOptions) =>
    request<T>("PUT", route, options),

  patch: <T>(route: string, options?: RequestOptions) =>
    request<T>("PATCH", route, options),

  delete: <T>(route: string, options?: RequestOptions) =>
    request<T>("DELETE", route, options),

  head: <T>(route: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("HEAD", route, options),

  request,
};
