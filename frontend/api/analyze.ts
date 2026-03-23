interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
}

const FASTAPI_BASE_URL = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(((req.body as Record<string, unknown> | undefined) || {}));

  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json(
        payload || { error: "Backend request failed" },
      );
    }

    return res.status(200).json(payload || {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend is unreachable";
    return res.status(500).json({ error: message });
  }
}
