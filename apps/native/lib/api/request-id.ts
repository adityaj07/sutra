/**
 * Correlation IDs for API requests. Prefers `crypto.randomUUID()`; falls
 * back to 128-bit hex so request IDs exist on every runtime. IDs are
 * non-sensitive and echoed from the server `X-Request-Id` header when present.
 */
export function newRequestId(): string {
  try {
    const cryptoApi = globalThis.crypto as
      | Pick<Crypto, "randomUUID" | "getRandomValues">
      | undefined;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
      return cryptoApi.randomUUID();
    }
    if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Fall through to Math.random fallback.
  }
  const random = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  return `${random()}${random()}${random()}${random()}`;
}
