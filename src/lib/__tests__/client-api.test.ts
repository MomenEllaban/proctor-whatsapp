import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../client-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api", () => {
  it("does not force a JSON content type for FormData uploads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = new FormData();
    body.append("images", new Blob(["fake"]), "list.png");
    const result = await api("/api/extract/photos", { method: "POST", body });

    expect(result.ok).toBe(true);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("content-type")).toBeNull();
  });
});
