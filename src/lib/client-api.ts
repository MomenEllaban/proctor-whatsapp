export interface ApiResult<D> {
  ok: boolean;
  status: number;
  data: D | null;
  error: string | null;
}

export async function api<D = unknown>(
  url: string,
  opts: RequestInit = {},
): Promise<ApiResult<D>> {
  try {
    const headers = new Headers(opts.headers);
    const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(url, {
      ...opts,
      cache: "no-store",
      headers,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: body.error ?? "خطأ غير متوقع" };
    }
    return { ok: true, status: res.status, data: body as D, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: "تعذر الاتصال بالخادم" };
  }
}

export const post = <D = unknown>(url: string, body: unknown) =>
  api<D>(url, { method: "POST", body: JSON.stringify(body) });

export const patch = <D = unknown>(url: string, body: unknown) =>
  api<D>(url, { method: "PATCH", body: JSON.stringify(body) });

export const del = <D = unknown>(url: string) =>
  api<D>(url, { method: "DELETE" });

export const get = <D = unknown>(url: string) => api<D>(url);

/** Format a timestamp for the Arabic UI (server time). */
export function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  });
  const time = d.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Cairo",
  });
  return `${date}، ${time}`;
}