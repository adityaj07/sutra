import { describe, expect, test } from "bun:test";
import {
  ApiError,
  apiErrorFromFetchFailure,
  apiErrorFromResponse,
  isApiError,
} from "@/lib/api/errors";

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("apiErrorFromResponse", () => {
  test("parses the backend { message, errors } envelope", async () => {
    const error = await apiErrorFromResponse({
      response: jsonResponse(
        { message: "Validation failed", errors: { email: "Email is required" } },
        400,
      ),
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("http-400");
    expect(error.serverMessage).toBe("Validation failed");
    expect(error.validationErrors).toEqual({ email: "Email is required" });
    expect(error.isAuthError).toBe(false);
    expect(error.isNonRetryable).toBe(true);
  });

  test("401 is flagged as an auth error", async () => {
    const error = await apiErrorFromResponse({
      response: jsonResponse({ message: "Authentication required." }, 401),
    });

    expect(error.isAuthError).toBe(true);
    expect(error.serverMessage).toBe("Authentication required.");
  });

  test("403 is not an auth error", async () => {
    const error = await apiErrorFromResponse({
      response: jsonResponse({ message: "Forbidden" }, 403),
    });

    expect(error.isAuthError).toBe(false);
    expect(error.isNonRetryable).toBe(true);
  });

  test("non-JSON bodies fall back to the status", async () => {
    const error = await apiErrorFromResponse({
      response: new Response("<html>proxy</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    });

    expect(error.status).toBe(502);
    expect(error.message).toBe("Request failed with status 502");
    expect(error.isNonRetryable).toBe(false);
  });

  test("echoes the server request id", async () => {
    const error = await apiErrorFromResponse({
      response: jsonResponse({ message: "Nope" }, 500, {
        "x-request-id": "req-123",
      }),
      requestId: "req-local",
    });

    expect(error.requestId).toBe("req-123");
  });
});

describe("apiErrorFromFetchFailure", () => {
  test("network failure is distinguishable from HTTP errors", () => {
    const error = apiErrorFromFetchFailure({
      error: new TypeError("fetch failed"),
      timedOut: false,
    });

    expect(error.code).toBe("network-error");
    expect(error.status).toBeNull();
    expect(error.isNetworkError).toBe(true);
    expect(error.isAuthError).toBe(false);
    expect(error.isNonRetryable).toBe(false);
  });

  test("timeout is classified separately", () => {
    const error = apiErrorFromFetchFailure({
      error: new DOMException("aborted", "AbortError"),
      timedOut: true,
    });

    expect(error.code).toBe("timeout");
    expect(error.isTimeout).toBe(true);
  });

  test("caller cancellation is not a generic error", () => {
    const error = apiErrorFromFetchFailure({
      error: new DOMException("aborted", "AbortError"),
      timedOut: false,
    });

    expect(error.code).toBe("cancelled");
    expect(error.isCancelled).toBe(true);
  });
});

describe("isApiError", () => {
  test("narrows unknown throws", () => {
    expect(isApiError(new ApiError({ message: "x", code: "timeout" }))).toBe(
      true,
    );
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError("x")).toBe(false);
  });
});
