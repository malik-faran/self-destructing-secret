export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      cache: "no-store",
      ...options,
    });
  } catch (error) {
    throw new ApiError(
      "Could not reach the server. Check that the API is running and try again.",
      0,
      error
    );
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? "Please check the form and try again."
          : "Something went wrong. Please try again.";
    throw new ApiError(detail, response.status, data);
  }

  return data;
}

export function createSecret({ secretText, expiresInMinutes, passphrase }) {
  return request("/api/secrets", {
    method: "POST",
    body: JSON.stringify({
      secret_text: secretText,
      expires_in_minutes: expiresInMinutes,
      passphrase: passphrase?.trim() ? passphrase : null,
    }),
  });
}

export function getSecretMeta(secretId) {
  return request(`/api/secrets/${encodeURIComponent(secretId)}/meta`);
}

export function revealSecret(secretId, passphrase) {
  return request(`/api/secrets/${encodeURIComponent(secretId)}/reveal`, {
    method: "POST",
    body: JSON.stringify({ passphrase: passphrase ?? null }),
  });
}

export function getHealth() {
  return request("/api/health");
}
